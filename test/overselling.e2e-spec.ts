import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTestApp } from './helpers/test-app';
import { createUserFixture, createProductFixture } from './helpers/fixtures';
import { PrismaService } from '../src/prisma/prisma.service';
import { StripeService } from '../src/stripe/stripe.service';
import { EnvironmentVariables } from '../src/config/environment';
import type Stripe from 'stripe';
describe('Overselling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let stripeService: StripeService;
  let webhookSecret: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    stripeService = app.get(StripeService);
    webhookSecret = app
      .get(ConfigService<EnvironmentVariables, true>)
      .get('STRIPE_WEBHOOK_SECRET', { infer: true });
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

  it('refunds buyer B when last shirt already sold', async () => {
    // Arrange — two clients , one product with 1 stock, and two orders.
    const clientA = await createUserFixture(prisma, 'client');
    const clientB = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 1,
      price: 2000,
    });
    const token = await signIn(clientA.email, clientA.password);

    // Add 1 unit stock 1 → user A + order A → user B + order B → webhook A → webhook B → 4 checks.
    await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: 1 });
    //user A + order A → user B + order B → webhook A → webhook B → 4 checks.
    const orderAResponse = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          street1: '123 Test St',
          street2: 'Unit 1',
          city: 'Testville',
          postalCode: '00000',
          state: 'TS',
          country: 'USA',
        },
      });
    const orderA = orderAResponse.body;

    const tokenB = await signIn(clientB.email, clientB.password);
    await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ productVariantId: product.productVariantId, quantity: 1 });
    const orderBResponse = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        shippingAddress: {
          street1: '123 Test St',
          street2: 'Unit 1',
          city: 'Testville',
          postalCode: '00000',
          state: 'TS',
          country: 'USA',
        },
      });
    const orderB = orderBResponse.body;
    const paymentResponseA = await request(app.getHttpServer())
      .post(`/orders/${orderA.id}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'card' });
    const intentIdA: string = paymentResponseA.body.intentId;
    // Act — simulate webhook for both orders.
    const fakeEventA = {
      id: `evt_test_${orderA.id}_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: intentIdA,
          metadata: { orderId: String(orderA.id) },
        },
      },
    };
    const payloadA = JSON.stringify(fakeEventA);
    const signatureA = stripeService.webhooks.generateTestHeaderString({
      payload: payloadA,
      secret: webhookSecret,
    });

    const paymentResponseB = await request(app.getHttpServer())
      .post(`/orders/${orderB.id}/payment`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ paymentMethod: 'card' });
    const intentIdB: string = paymentResponseB.body.intentId;
    // Act — simulate webhook for both orders.
    const fakeEventB = {
      id: `evt_test_${orderB.id}_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: intentIdB,
          metadata: { orderId: String(orderB.id) },
        },
      },
    };
    const payloadB = JSON.stringify(fakeEventB);
    const signatureB = stripeService.webhooks.generateTestHeaderString({
      payload: payloadB,
      secret: webhookSecret,
    });
    const refundSpy = jest
      .spyOn(stripeService.refunds, 'create')
      .mockResolvedValue({
        id: 'refund_test_id',
      } as Stripe.Response<Stripe.Refund>);
    // Act
    const webhookResponseA = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signatureA)
      .send(payloadA);
    const webhookResponseB = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signatureB)
      .send(payloadB);

    // Assert — check stock and order statuses.
    expect(webhookResponseA.status).toBe(200);
    expect(paymentResponseA.status).toBe(201);
    expect(webhookResponseB.status).toBe(200);
    expect(paymentResponseB.status).toBe(201);
    const updatedProduct = await prisma.product_variants.findUnique({
      where: { product_variant_id: product.productVariantId },
    });
    expect(updatedProduct?.stock_quantity).toBe(0);

    const latestStatusA = await prisma.order_status_history.findFirst({
      where: { order_id: orderA.id },
      orderBy: { created_at: 'desc' },
    });
    expect(latestStatusA?.status).toBe('paid');
    const latestStatusB = await prisma.order_status_history.findFirst({
      where: { order_id: orderB.id },
      orderBy: { created_at: 'desc' },
    });
    expect(latestStatusB?.status).toBe('cancelled');
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy).toHaveBeenCalledWith(
      { payment_intent: intentIdB },
      expect.objectContaining({
        idempotencyKey: expect.stringContaining(
          `refund-${orderB.id}-${intentIdB}`,
        ),
      }),
    );
  });
});
