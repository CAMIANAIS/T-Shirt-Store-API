import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  const testUser = {
    username: `auth-e2e-${Date.now()}`,
    email: `auth-e2e-${Date.now()}@example.com`,
    password: 'Password123!',
  };

  beforeAll(async () => {
    app = await createTestApp();
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
});
