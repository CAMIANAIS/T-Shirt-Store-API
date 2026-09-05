import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';
import { Prisma } from '../../generated/prisma/client';
import type Stripe from 'stripe';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prismaService: PrismaService;
  let cartsService: CartsService;

  // Minimal fake transaction client — only the calls handleEvent
  // actually makes inside $transaction.
  const mockTx = {
    stripe_events: { create: jest.fn() },
    order_status_history: { create: jest.fn() },
    orders: { update: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    product_variants: { update: jest.fn(), findUnique: jest.fn() },
    payments: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: PrismaService,
          useValue: {
            stripe_events: { create: jest.fn(), update: jest.fn() },
            $transaction: jest.fn((fn: (tx: typeof mockTx) => unknown) =>
              fn(mockTx),
            ),
          },
        },
        {
          provide: CartsService,
          useValue: { clearCart: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    prismaService = module.get<PrismaService>(PrismaService);
    cartsService = module.get<CartsService>(CartsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rolls back and returns on a duplicate event, without clearing the cart or marking it processed', async () => {
    // Arrange — the idempotency check now lives inside $transaction, so a
    // duplicate still opens (and immediately rolls back) a transaction —
    // that part changed on purpose. What must NOT happen either way: the
    // cart isn't cleared, and the event isn't (re-)marked processed.
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.9.1' },
    );
    jest
      .spyOn(mockTx.stripe_events, 'create')
      .mockRejectedValue(duplicateError);
    const transactionSpy = jest.spyOn(prismaService, '$transaction');
    const clearCartSpy = jest.spyOn(cartsService, 'clearCart');
    const updateSpy = jest.spyOn(prismaService.stripe_events, 'update');
    const event = {
      id: 'evt_1',
      type: 'payment_intent.succeeded',
    } as Stripe.Event;

    // Act
    await service.handleEvent(event);

    // Assert — your turn. Was `$transaction` called exactly once (it
    // opens, then rolls back on the duplicate)? Was `clearCart` never
    // called? Was `stripe_events.update` never called?
    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(clearCartSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('marks the order paid, decrements stock, and clears the cart on payment_intent.succeeded', async () => {
    // Arrange
    jest.spyOn(mockTx.stripe_events, 'create').mockResolvedValue({} as any);
    mockTx.orders.findUnique.mockResolvedValue({
      order_id: 1,
      user_id: 7,
      order_items: [{ product_variant_id: 5, quantity: 2 }],
    } as any);
    const clearCartSpy = jest.spyOn(cartsService, 'clearCart');
    const updateEventSpy = jest.spyOn(prismaService.stripe_events, 'update');
    const event = {
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { orderId: '1' } } },
    } as unknown as Stripe.Event;

    // Act
    await service.handleEvent(event);

    // Assert — your turn. Was order_status_history.create called with
    // { order_id: 1, status: 'paid', ... }? Was orders.update called
    // with payment_method: 'payment_intent'? Was product_variants.update
    // called with decrement: 2 for product_variant_id 5? Was clearCart
    // called with 7 (the order's user_id)? Was stripe_events.update
    // called with status: 'processed'?
    // Assert
    expect(clearCartSpy).toHaveBeenCalledWith(7);
    expect(mockTx.order_status_history.create).toHaveBeenCalledWith({
      data: {
        order_id: 1,
        status: 'paid',
        created_at: expect.any(Date),
      },
    });
    expect(mockTx.orders.update).toHaveBeenCalledWith({
      where: { order_id: 1 },
      data: { payment_method: 'payment_intent' },
    });
    expect(mockTx.product_variants.update).toHaveBeenCalledWith({
      where: { product_variant_id: 5 },
      data: { stock_quantity: { decrement: 2 } },
    });
    expect(updateEventSpy).toHaveBeenCalledWith({
      where: { stripe_event_id: 'evt_2' },
      data: { status: 'processed', processed_at: expect.any(Date) },
    });
  });

  it('does nothing extra and still marks the event processed for an event type it does not handle', async () => {
    // Arrange
    jest.spyOn(mockTx.stripe_events, 'create').mockResolvedValue({} as any);
    const clearCartSpy = jest.spyOn(cartsService, 'clearCart');
    const updateEventSpy = jest.spyOn(prismaService.stripe_events, 'update');
    const event = { id: 'evt_3', type: 'charge.succeeded' } as Stripe.Event;

    // Act
    await service.handleEvent(event);

    // Assert — your turn. Was clearCart never called (nothing paid, so
    // no user to clear)? Was stripe_events.update still called with
    // status: 'processed' anyway?
    expect(clearCartSpy).not.toHaveBeenCalled();
    expect(updateEventSpy).toHaveBeenCalledWith({
      where: { stripe_event_id: 'evt_3' },
      data: { status: 'processed', processed_at: expect.any(Date) },
    });
  });

  it('creates a paid order and decrements stock on checkout.session.completed', async () => {
    // Arrange
    jest.spyOn(mockTx.stripe_events, 'create').mockResolvedValue({} as any);
    mockTx.product_variants.findUnique.mockResolvedValue({
      product_variant_id: 5,
      stock_quantity: 3,
    } as any);
    const clearCartSpy = jest.spyOn(cartsService, 'clearCart');
    const updateEventSpy = jest.spyOn(prismaService.stripe_events, 'update');
    const event = {
      id: 'evt_4',
      type: 'checkout.session.completed',
      data: {
        object: {
          amount_total: 2500,
          metadata: { userId: '7', productVariantId: '5' },
        },
      },
    } as unknown as Stripe.Event;

    // Act
    await service.handleEvent(event);

    // Assert — your turn. Was orders.create called with user_id 7,
    // total_amount 2500, payment_method 'payment_link', and an
    // order_items.create with product_variant_id 5? Was
    // product_variants.update called with decrement: 1 for
    // product_variant_id 5? Was clearCart NOT called (this flow never
    // touched a cart)? Was stripe_events.update called with 'processed'?
    expect(mockTx.orders.create).toHaveBeenCalledWith({
      data: {
        user_id: 7,
        total_amount: 2500,
        payment_method: 'payment_link',
        order_items: {
          create: {
            product_variant_id: 5,
            quantity: 1,
            price_at_purchase: 2500,
          },
        },
        order_status_history: {
          create: {
            status: 'paid',
            created_at: expect.any(Date),
          },
        },
      },
    });

    expect(mockTx.product_variants.update).toHaveBeenCalledWith({
      where: { product_variant_id: 5 },
      data: {
        stock_quantity: {
          decrement: 1,
        },
      },
    });

    expect(clearCartSpy).not.toHaveBeenCalled();

    expect(updateEventSpy).toHaveBeenCalledWith({
      where: { stripe_event_id: 'evt_4' },
      data: { status: 'processed', processed_at: expect.any(Date) },
    });
  });

  it('does not silently drop a payment when the transaction fails partway, then Stripe retries', async () => {
    // Arrange — first delivery: $transaction itself fails partway through
    // (e.g. a transient DB error) — matching the known risk documented in
    // architecture.md. Mocking $transaction directly (rather than making
    // one call inside it reject) means the real callback, and therefore
    // mockTx.stripe_events.create, is never actually invoked this first
    // time — which is fine, since what we're proving is what happens on
    // the SECOND delivery, not simulating exactly which line failed.
    const transactionSpy = jest
      .spyOn(prismaService, '$transaction')
      .mockRejectedValueOnce(new Error('simulated transient DB failure'));
    const event = {
      id: 'evt_retry',
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { orderId: '1' } } },
    } as unknown as Stripe.Event;

    // Act — first delivery fails partway through
    await expect(service.handleEvent(event)).rejects.toThrow(
      'simulated transient DB failure',
    );

    // Arrange — Stripe's automatic retry: same event. This time
    // $transaction falls back to its real (mockTx) implementation from
    // beforeEach, so the callback actually runs and reaches
    // mockTx.stripe_events.create for real — mock that one call as the
    // unique-constraint hit, simulating that the "seen" row from attempt 1
    // is still there (even though attempt 1 never really touched mockTx,
    // the row existing is a DB-side fact, not something we need to
    // literally re-derive from the mock's call history).
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.9.1' },
    );
    jest
      .spyOn(mockTx.stripe_events, 'create')
      .mockRejectedValueOnce(duplicateError);

    // Act — the retry
    await service.handleEvent(event);

    // Assert — your turn. This is the known bug: the retry should have
    // actually completed the payment, since it never really succeeded the
    // first time. Did it? Check how many times `transactionSpy` was
    // called in total, across BOTH deliveries — once (bug: the retry
    // never reprocessed, order stays stuck unpaid) or twice (fixed: the
    // retry redid the real work)?
    expect(transactionSpy).toHaveBeenCalledTimes(2);
  });
});
