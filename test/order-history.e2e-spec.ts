import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import {
  createUserFixture,
  createProductFixture,
  createOrderFixture,
} from './helpers/fixtures';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Order history (e2e)', () => {
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
      .post('/auth/signin')
      .send({ email, password });
    return response.body.access_token;
  }

  it("a client's order history includes only their own orders", async () => {
    // Arrange — two different clients, one order each
    const clientA = await createUserFixture(prisma, 'client');
    const clientB = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma);

    const orderA = await createOrderFixture(
      prisma,
      clientA.userId,
      product.productVariantId,
    );
    const orderB = await createOrderFixture(
      prisma,
      clientB.userId,
      product.productVariantId,
    );

    const tokenA = await signIn(clientA.email, clientA.password);

    // Act
    const response = await request(app.getHttpServer())
      .get('/me/orders')
      .set('Authorization', `Bearer ${tokenA}`);

    // Assert — your turn. Status 200? Does the response body include
    // orderA.orderId? Does it exclude orderB.orderId?
    expect(response.status).toBe(200);
    expect(response.body[0].id).toBe(orderA.orderId);
    expect(response.body.some((o) => o.id === orderB.orderId)).toBe(false);
  });

  it("a direct request for another client's order is refused", async () => {
    // Arrange
    const clientA = await createUserFixture(prisma, 'client');
    const clientB = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma);

    const orderB = await createOrderFixture(
      prisma,
      clientB.userId,
      product.productVariantId,
    );

    const tokenA = await signIn(clientA.email, clientA.password);

    // Act — A tries to fetch B's order directly by id
    const response = await request(app.getHttpServer())
      .get(`/orders/${orderB.orderId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Assert — your turn. What status code should this be (check
    // findOne's ownership check)?
    expect(response.status).toBe(403);
  });

  it('a manager sees orders from every client', async () => {
    // Arrange
    const clientA = await createUserFixture(prisma, 'client');
    const clientB = await createUserFixture(prisma, 'client');
    const manager = await createUserFixture(prisma, 'manager');
    const product = await createProductFixture(prisma);

    const orderA = await createOrderFixture(
      prisma,
      clientA.userId,
      product.productVariantId,
    );
    const orderB = await createOrderFixture(
      prisma,
      clientB.userId,
      product.productVariantId,
    );

    const managerToken = await signIn(manager.email, manager.password);

    // Act
    const response = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${managerToken}`);

    // Assert — your turn. Status 200? Does the response body include
    // both orderA.orderId and orderB.orderId?
    expect(response.status).toBe(200);
    const orderIds = response.body.map((o) => o.id);
    expect(orderIds).toContain(orderA.orderId);
    expect(orderIds).toContain(orderB.orderId);
  });
});
