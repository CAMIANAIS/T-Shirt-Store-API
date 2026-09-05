import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    username: `auth-e2e-${Date.now()}`,
    email: `auth-e2e-${Date.now()}@example.com`,
    password: 'Password123!',
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a new user', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser);

    // Assert — your turn. What status code should a successful signup
    // return (check main.ts/the controller — signUp has no @HttpCode
    // override, so what's Nest's default for a plain @Post())? Does the
    // response body include an `access_token`? Does it leak
    // `password_hash` anywhere?
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('access_token');
    expect(typeof response.body.access_token).toBe('string');
    //SECURITY
    expect(response.body).not.toHaveProperty('password_hash');
    expect(response.body).not.toHaveProperty('password');
  });

  it('rejects a duplicate signup with the same email', async () => {
    // Act — testUser was already registered in the previous test
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(testUser);

    // Assert — your turn. What status code does `docs/openApi.yml`'s /
    // your CLAUDE.md conventions say a duplicate email should return?
    expect(response.status).toBe(409);
    expect(response.body.message).toContain('Email already registered');
  });

  it('logs in with correct credentials and receives an access token', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: testUser.email, password: testUser.password });

    // Assert — your turn. Status code? Does the body have an
    // `access_token` string?
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('access_token');
  });

  it('rejects sign-in with the wrong password', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: testUser.email, password: 'WrongPassword!' });

    // Assert — your turn. What status code for bad credentials?
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Unauthorized');
  });

  it('allows a protected route with a valid token', async () => {
    // Arrange
    const signInResponse = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email: testUser.email, password: testUser.password });
    const token: string = signInResponse.body.access_token;

    // Act
    const response = await request(app.getHttpServer())
      .get('/me/orders')
      .set('Authorization', `Bearer ${token}`);

    // Assert — your turn. What status code proves the token was
    // accepted?
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toHaveProperty('access_token');
  });

  it('rejects a protected route with no token', async () => {
    // Act
    const response = await request(app.getHttpServer()).get('/me/orders');

    // Assert — your turn. What status code?
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Missing authorization header');
  });

  it('rejects a protected route with a malformed token', async () => {
    // Act
    const response = await request(app.getHttpServer())
      .get('/me/orders')
      .set('Authorization', 'Bearer not-a-real-token');

    // Assert — your turn. What status code?
    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Invalid or expired token');
  });

  it('rejects a client hitting a manager-only route', async () => {
    // Arrange — a fresh user via signup (not signin — signin's own 3/60s
    // throttle is already used up by earlier tests in this file; signup
    // has its own separate bucket and returns an access_token directly).
    // Every new signup is a plain client, never promoted to manager.
    const signUpResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: `casl-e2e-${Date.now()}`,
        email: `casl-e2e-${Date.now()}@example.com`,
        password: 'Password123!',
      });
    const token: string = signUpResponse.body.access_token;

    // Act — POST /products requires ability.can('manage', 'Product'),
    // manager-only per the CASL ability factory
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Should Not Be Created',
        description: 'a client should never be able to create this',
        status: 'active',
        categoryId: 1,
      });

    // Assert — your turn. What status code does PoliciesGuard return when
    // the ability check fails?
    expect(response.status).toBe(403);
  });

  it('a signed-out refresh token is revoked in the database', async () => {
    // Arrange — a fresh user via signup (own throttle bucket, and signup
    // already returns both tokens directly)
    const signUpResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: `signout-e2e-${Date.now()}`,
        email: `signout-e2e-${Date.now()}@example.com`,
        password: 'Password123!',
      });
    const accessToken: string = signUpResponse.body.access_token;
    const refreshToken: string = signUpResponse.body.refresh_token;

    // Act
    const signOutResponse = await request(app.getHttpServer())
      .post('/auth/signout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: refreshToken });

    // signOut looks up the token by its SHA-256 hash, not the plaintext
    // value — there's no endpoint to fetch it back, so we check every
    // refresh-type row got revoked (there's only one, from this signup).
    const decodedPayload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString(),
    ) as { sub: number };
    const tokenRow = await prisma.auth_tokens.findFirst({
      where: { user_id: decodedPayload.sub, type: 'refresh' },
    });

    // Assert — your turn. Did sign-out respond 200? Is `tokenRow.revoked`
    // now true?
    expect(signOutResponse.status).toBe(200);
    expect(tokenRow?.revoked).toBe(true);
  });

  it('resets the password with a real token, but leaves other sessions live (known gap)', async () => {
    // Arrange — a fresh user with a refresh token from signup, standing
    // in for "another device/session still logged in" when the password
    // gets reset.
    const email = `reset-e2e-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        username: `reset-e2e-${Date.now()}`,
        email,
        password: 'OldPassword123!',
      });

    // forgotPassword sends a real email (Ethereal) with the plaintext
    // token — only its SHA-256 hash is ever stored in the DB, so the only
    // way to get the real value is to read it from what actually got
    // sent, not the database.
    const emailService = app.get(EmailService);
    const sendEmailSpy = jest.spyOn(emailService, 'sendEmail');

    await request(app.getHttpServer())
      .post('/auth/forgotpassword')
      .send({ email });

    const emailBody = sendEmailSpy.mock.calls[0][2];
    const resetToken = /token is: (\S+)/.exec(emailBody)?.[1];

    // Act
    const resetResponse = await request(app.getHttpServer())
      .post('/auth/resetpassword')
      .send({ token: resetToken, newPassword: 'NewPassword123!' });

    const updatedUser = await prisma.users.findUniqueOrThrow({
      where: { email },
    });
    const passwordActuallyChanged = await bcrypt.compare(
      'NewPassword123!',
      updatedUser.password_hash,
    );
    const otherRefreshRow = await prisma.auth_tokens.findFirst({
      where: { user_id: updatedUser.user_id, type: 'refresh' },
    });

    // Assert — your turn. Did the reset respond 200? Did the password
    // really change (`passwordActuallyChanged`)? Is the OTHER session's
    // refresh token (`otherRefreshRow.revoked`) still `false`? (This part
    // is the known, documented gap in CLAUDE.md — resetPassword only
    // revokes the one reset token it used, not the user's other active
    // sessions. This assertion should describe what the code does today,
    // not what you wish it did.)
    expect(resetResponse.status).toBe(200);
    expect(passwordActuallyChanged).toBe(true);
    expect(otherRefreshRow?.revoked).toBe(false);
  });

  it('rate-limits repeated forgot-password requests', async () => {
    // Arrange — every other test in this file runs against `app`, which
    // has throttling disabled (see test-app.ts) so an unrelated earlier
    // signin/signup can't silently 429 it. This is the one test that's
    // actually about rate-limiting, so it gets its own separate app
    // instance with throttling left ON, rather than sharing that budget.
    const throttledApp = await createTestApp({ disableThrottling: false });
    const email = `rate-limit-e2e-${Date.now()}@example.com`;

    // Act — fire enough requests in a row to exceed the 3/60s limit
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const response = await request(throttledApp.getHttpServer())
        .post('/auth/forgotpassword')
        .send({ email });
      statuses.push(response.status);
    }

    await throttledApp.close();

    // Assert — your turn. Does `statuses` contain at least one 429 among
    // the 6 attempts?
    expect(statuses).toContain(429);
  });
});
