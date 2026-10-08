import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createUserFixture, createProductFixture } from './helpers/fixtures';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Cart Validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function signIn(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email, password });
    return response.body.access_token;
  }

  it('check quantity went to negatives give a status 422', async () => {
    // Arrange — a client, and a product with known starting stock/price
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 2000,
    });
    const token = await signIn(client.email, client.password);

    // Add -3 units to the cart
    const response = await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: -3 });
    expect(response.status).toBe(422);
  });
  it('check quantity is 1.5 and it gives a status 422', async () => {
    // Arrange — a client, and a product with known starting stock/price
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 2000,
    });
    const token = await signIn(client.email, client.password);

    // Add 1.5 units to the cart
    const response = await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: 1.5 });
    expect(response.status).toBe(422);
  });
});
