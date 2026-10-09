import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';

describe('Kebab-case URL rename (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('old /auth/signin is gone, new /auth/sign-in returns 422 on an empty body (unguarded)', async () => {
    const oldPath = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({});
    const newPath = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({});

    expect(oldPath.status).toBe(404);
    expect(newPath.status).toBe(422);
  });

  it('old /auth/signup is gone, new /auth/sign-up returns 422 on an empty body (unguarded)', async () => {
    const oldPath = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({});
    const newPath = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({});

    expect(oldPath.status).toBe(404);
    expect(newPath.status).toBe(422);
  });

  it('old /auth/signout is gone, new /auth/sign-out returns 401 with no token (guarded)', async () => {
    // no Authorization header — the guard should respond with 401,
    // proving the route itself was matched (not a 404)
    const oldPath = await request(app.getHttpServer()).post('/auth/signout');
    const newPath = await request(app.getHttpServer()).post('/auth/sign-out');

    expect(oldPath.status).toBe(404);
    expect(newPath.status).toBe(401);
  });

  it('old /auth/forgotpassword is gone, new /auth/forgot-password returns 422 on an empty body (unguarded)', async () => {
    const oldPath = await request(app.getHttpServer())
      .post('/auth/forgotpassword')
      .send({});
    const newPath = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({});

    expect(oldPath.status).toBe(404);
    expect(newPath.status).toBe(422);
  });

  it('old /auth/resetpassword is gone, new /auth/reset-password returns 422 on an empty body (unguarded)', async () => {
    const oldPath = await request(app.getHttpServer())
      .post('/auth/resetpassword')
      .send({});
    const newPath = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({});

    expect(oldPath.status).toBe(404);
    expect(newPath.status).toBe(422);
  });

  it('old /products/:productId/paymentLink is gone, new /products/:productId/payment-link returns 401 with no token (guarded)', async () => {
    // no Authorization header — same trick as signout, avoids the
    // separate "product not found" 404 this endpoint can also return
    const oldPath = await request(app.getHttpServer()).post(
      '/products/1/paymentLink',
    );
    const newPath = await request(app.getHttpServer()).post(
      '/products/1/payment-link',
    );

    expect(oldPath.status).toBe(404);
    expect(newPath.status).toBe(401);
  });
});
