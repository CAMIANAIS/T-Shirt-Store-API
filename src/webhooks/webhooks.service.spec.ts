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
    order_status_history: { create: jest.fn() },
    orders: { update: jest.fn(), findUnique: jest.fn() },
    product_variants: { update: jest.fn() },
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

  it('returns early on a duplicate event without touching the transaction or cart', async () => {
    // Arrange
    const duplicateError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.9.1' },
    );
    jest
      .spyOn(prismaService.stripe_events, 'create')
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

    // Assert — your turn. Was `$transaction` never called? Was
    // `clearCart` never called? Was `stripe_events.update` never called?
    expect(transactionSpy).not.toHaveBeenCalled();
    expect(clearCartSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('marks the order paid, decrements stock, and clears the cart on payment_intent.succeeded', async () => {
    // Arrange
    jest
      .spyOn(prismaService.stripe_events, 'create')
      .mockResolvedValue({} as any);
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
    jest
      .spyOn(prismaService.stripe_events, 'create')
      .mockResolvedValue({} as any);
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
});
