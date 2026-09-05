import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTestApp } from './helpers/test-app';
import { createUserFixture, createProductFixture } from './helpers/fixtures';
import { PrismaService } from '../src/prisma/prisma.service';
import { StripeService } from '../src/stripe/stripe.service';
import { EnvironmentVariables } from '../src/config/environment';

describe('Checkout (e2e)', () => {
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
      .post('/auth/signin')
      .send({ email, password });
    return response.body.access_token;
  }

  it('walks a cart through to a paid order with decremented stock', async () => {
    // Arrange — a client, and a product with known starting stock/price
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 2000,
    });
    const token = await signIn(client.email, client.password);

    // Add 2 units to the cart
    await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: 2 });

    // Create the order from the cart
    const orderResponse = await request(app.getHttpServer())
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
    const orderId: number = orderResponse.body.id;

    // Create the Payment Intent — this hits real Stripe test mode,
    // exactly like `createPayment` does outside of tests.
    const paymentResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'card' });
    const intentId: string = paymentResponse.body.intentId;

    // Simulate Stripe delivering `payment_intent.succeeded`. Completing
    // a real charge needs a browser and a test card (that's what the
    // manual Stripe CLI verification was for) — this instead builds and
    // signs the exact event our own webhook handler reads, which is the
    // part this test is actually responsible for proving works.
    const fakeEvent = {
      id: `evt_test_${orderId}_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: intentId,
          metadata: { orderId: String(orderId) },
        },
      },
    };
    const payload = JSON.stringify(fakeEvent);
    const signature = stripeService.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    // Act
    const webhookResponse = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    const updatedVariant = await prisma.product_variants.findUnique({
      where: { product_variant_id: product.productVariantId },
    });
    const latestStatus = await prisma.order_status_history.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });

    if (!updatedVariant || !latestStatus) {
      throw new Error('expected fixture data missing');
    }

    expect(webhookResponse.status).toBe(200);
    expect(updatedVariant.stock_quantity).toBe(3);
    expect(latestStatus.status).toBe('paid');
    expect(latestStatus.created_at).toBeDefined();

    const payment = await prisma.payments.findFirst({
      where: { order_id: orderId },
    });
    if (!payment) {
      throw new Error('expected a payments row to have been created');
    }
    expect(payment.stripe_reference).toBe(intentId);
    expect(Number(payment.amount)).toBe(product.price * 2);
    expect(payment.status).toBe('completed');
  });

  it('a duplicate webhook delivery does not double-decrement stock or double-charge', async () => {
    // Arrange — same checkout flow as above: client, product, cart, order, payment intent
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 2000,
    });
    const token = await signIn(client.email, client.password);

    await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: 2 });

    const orderResponse = await request(app.getHttpServer())
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
    const orderId: number = orderResponse.body.id;

    const paymentResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'card' });
    const intentId: string = paymentResponse.body.intentId;

    const fakeEvent = {
      id: `evt_test_${orderId}_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: intentId,
          metadata: { orderId: String(orderId) },
        },
      },
    };
    const payload = JSON.stringify(fakeEvent);
    const signature = stripeService.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    // Act — Stripe delivers the SAME event twice. This happens for real:
    // Stripe retries on a timeout/5xx even when your handler actually
    // succeeded, so the handler has to treat a repeat delivery as a no-op.
    const firstResponse = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    const secondResponse = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    const variantAfterBoth = await prisma.product_variants.findUnique({
      where: { product_variant_id: product.productVariantId },
    });
    const paymentsForOrder = await prisma.payments.findMany({
      where: { order_id: orderId },
    });

    // Assert — your turn. Both requests should come back successfully (a
    // duplicate isn't an error). The real question: did the SECOND delivery
    // decrement stock again? Should `variantAfterBoth.stock_quantity` be 3
    // (decremented once, correct) or 1 (decremented twice, bug)? And should
    // `paymentsForOrder` have exactly one row, or two?
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    expect(variantAfterBoth?.stock_quantity).toBe(3);

    expect(paymentsForOrder).toHaveLength(1);
    expect(paymentsForOrder[0].status).toBe('completed');
  });
  //payment link workflow
  it('walks a Payment Link through to a paid order with decremented stock', async () => {
    // Arrange — a client, and a product with exactly one variant (payment
    // links require this) and known starting stock/price
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 3000,
    });
    const token = await signIn(client.email, client.password);

    // Create the Payment Link — this hits real Stripe test mode, exactly
    // like createPaymentLink does outside of tests.
    await request(app.getHttpServer())
      .post(`/products/${product.productId}/paymentLink`)
      .set('Authorization', `Bearer ${token}`);

    // Simulate Stripe delivering `checkout.session.completed` once a
    // buyer actually pays through that link. Completing a real Payment
    // Link checkout needs a browser and a test card — this instead builds
    // and signs the exact event our own webhook handler reads, matching
    // the metadata shape createPaymentLink actually sets (userId,
    // productVariantId), which is the part this test is responsible for
    // proving works.
    const fakeEvent = {
      id: `evt_test_link_${product.productId}_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          amount_total: 3000,
          metadata: {
            userId: String(client.userId),
            productVariantId: String(product.productVariantId),
          },
        },
      },
    };
    const payload = JSON.stringify(fakeEvent);
    const signature = stripeService.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    // Act
    const webhookResponse = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload);

    const updatedVariant = await prisma.product_variants.findUnique({
      where: { product_variant_id: product.productVariantId },
    });
    const order = await prisma.orders.findFirst({
      where: { user_id: client.userId, payment_method: 'payment_link' },
      include: { order_items: true, order_status_history: true },
    });

    if (!updatedVariant || !order) {
      throw new Error('expected fixture data missing');
    }

    // Assert — your turn. Did the webhook respond 200? Is
    // `updatedVariant.stock_quantity` now 4 (5 - 1, Payment Links always
    // buy quantity 1)? Does `order` have exactly one order_item, with
    // `product_variant_id` matching `product.productVariantId` and
    // `quantity` 1? Is its latest `order_status_history` entry `'paid'`?
    expect(webhookResponse.status).toBe(200);
    expect(updatedVariant.stock_quantity).toEqual(4);

    expect(order.order_items).toHaveLength(1);
    expect(order.order_items[0]).toMatchObject({
      product_variant_id: product.productVariantId,
      quantity: 1,
    });

    expect(
      order.order_status_history[order.order_status_history.length - 1].status,
    ).toBe('paid');
  });

  it('refuses to create a Payment Intent once stock ran out after the order was placed', async () => {
    // Arrange — order created normally while stock was sufficient
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 2000,
    });
    const token = await signIn(client.email, client.password);

    await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: 2 });

    const orderResponse = await request(app.getHttpServer())
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
    const orderId: number = orderResponse.body.id;

    // Simulate stock running out between order creation and payment --
    // e.g. another concurrent checkout took the remaining units.
    await prisma.product_variants.update({
      where: { product_variant_id: product.productVariantId },
      data: { stock_quantity: 1 },
    });

    // Act — try to create the Payment Intent now that stock is insufficient
    const paymentResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'card' });

    const paymentRow = await prisma.payments.findFirst({
      where: { order_id: orderId },
    });

    // Assert — your turn. What status code does createPayment throw when
    // stock is insufficient (check orders.service.ts's ConflictException
    // for this case)? Did a payments row NOT get created (`paymentRow`
    // should be null)?
    expect(paymentResponse.status).toBe(409);
    expect(paymentRow).toBeNull();
  });

  it('rejects a webhook with an invalid signature and leaves the order untouched', async () => {
    // Arrange — a normal order + Payment Intent, so there's a real order
    // whose status we can check stays unchanged
    const client = await createUserFixture(prisma, 'client');
    const product = await createProductFixture(prisma, {
      stockQuantity: 5,
      price: 2000,
    });
    const token = await signIn(client.email, client.password);

    await request(app.getHttpServer())
      .post('/carts/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productVariantId: product.productVariantId, quantity: 2 });

    const orderResponse = await request(app.getHttpServer())
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
    const orderId: number = orderResponse.body.id;

    const paymentResponse = await request(app.getHttpServer())
      .post(`/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMethod: 'card' });
    const intentId: string = paymentResponse.body.intentId;

    const fakeEvent = {
      id: `evt_test_badsig_${orderId}_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: intentId,
          metadata: { orderId: String(orderId) },
        },
      },
    };
    const payload = JSON.stringify(fakeEvent);

    // Act — a completely bogus signature, not one signed with the real
    // webhook secret
    const webhookResponse = await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 't=1,v1=not-a-real-signature')
      .send(payload);

    const updatedVariant = await prisma.product_variants.findUnique({
      where: { product_variant_id: product.productVariantId },
    });
    const latestStatus = await prisma.order_status_history.findFirst({
      where: { order_id: orderId },
      orderBy: { created_at: 'desc' },
    });

    // Assert — your turn. What status code should an invalid signature
    // get? Is `updatedVariant.stock_quantity` still 5 (untouched — stock
    // only ever decrements on a SUCCESSFUL webhook, and the order itself
    // never reserves/decrements stock at creation time)? Is
    // `latestStatus.status` still `'pending'`, not `'paid'`?
    expect(webhookResponse.status).toBe(400);
    expect(updatedVariant?.stock_quantity).toBe(5);
    expect(latestStatus?.status).toBe('pending');
  });
});
