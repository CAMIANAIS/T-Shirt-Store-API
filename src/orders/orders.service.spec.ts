import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';
import { StripeService } from '../stripe/stripe.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/createOrder.dto';
import { PaymentIntentInputDto } from './dto/paymentIntentInput.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let cartsService: CartsService;
  let stripeService: StripeService;

  const shippingAddress = {
    street1: '123 Main St',
    street2: 'Apt 4B',
    city: 'Springfield',
    postalCode: '12345',
    state: 'IL',
    country: 'USA',
  };
  const dto: CreateOrderDto = { shippingAddress };

  const orderRow = {
    order_id: 1,
    user_id: 7,
    total_amount: BigInt(5000),
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    order_items: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            orders: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            order_status_history: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
            product_variants: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: CartsService,
          useValue: {
            getCart: jest.fn(),
          },
        },
        {
          provide: StripeService,
          useValue: {
            paymentIntents: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cartsService = module.get<CartsService>(CartsService);
    stripeService = module.get<StripeService>(StripeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an order and maps the Prisma row to the camelCase Order shape', async () => {
    // Arrange
    jest.spyOn(cartsService, 'getCart').mockResolvedValue({
      id: 1,
      userId: 7,
      items: [
        {
          id: 1,
          productVariantId: 5,
          quantity: 2,
          priceAtPurchase: 2500,
          subtotal: 5000,
        },
      ],
    });
    jest.spyOn(prismaService.product_variants, 'findUnique').mockResolvedValue({
      product_variant_id: 5,
      stock_quantity: 10,
    } as any);
    const createSpy = jest
      .spyOn(prismaService.orders, 'create')
      .mockResolvedValue({
        order_id: 1,
        user_id: 7,
        total_amount: BigInt(5000),
        payment_method: null,
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
        order_items: [
          {
            order_items_id: 1,
            order_id: 1,
            product_variant_id: 5,
            quantity: 2,
            price_at_purchase: BigInt(2500),
            created_at: new Date('2026-01-01'),
          },
        ],
      } as any);

    // Act
    const result = await service.create(7, dto);

    // Assert — your turn. Was `orders.create` called with the right
    // `data` (user_id, total_amount computed correctly, order_items,
    // order_status_history 'pending', order_addresses mapped from dto)?
    // Does `result` have the camelCase Order shape with numbers, not
    // BigInt?
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        user_id: 7,
        total_amount: 5000,
        order_items: {
          create: [
            {
              product_variant_id: 5,
              quantity: 2,
              price_at_purchase: 2500,
            },
          ],
        },
        order_status_history: {
          create: { status: 'pending' },
        },
        order_addresses: {
          create: {
            street1: '123 Main St',
            street2: 'Apt 4B',
            street3: undefined,
            city: 'Springfield',
            postal_code: '12345',
            state: 'IL',
            country: 'USA',
          },
        },
      },
      include: { order_items: true },
    });
    expect(result).toEqual({
      id: 1,
      userId: 7,
      totalAmount: 5000,
      items: [{ productVariantId: 5, quantity: 2, priceAtPurchase: 2500 }],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    });
  });

  it('throws BadRequestException when the cart is empty', async () => {
    // Arrange
    jest
      .spyOn(cartsService, 'getCart')
      .mockResolvedValue({ id: 1, userId: 7, items: [] });
    const createSpy = jest.spyOn(prismaService.orders, 'create');

    // Act
    const act = service.create(7, dto);

    // Assert — your turn. Does it reject with BadRequestException? Was
    // `orders.create` never called?
    expect(createSpy).not.toHaveBeenCalled();
    await expect(act).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when a cart item references a variant that no longer exists', async () => {
    // Arrange
    jest.spyOn(cartsService, 'getCart').mockResolvedValue({
      id: 1,
      userId: 7,
      items: [
        {
          id: 1,
          productVariantId: 999,
          quantity: 1,
          priceAtPurchase: 2500,
          subtotal: 2500,
        },
      ],
    });
    jest
      .spyOn(prismaService.product_variants, 'findUnique')
      .mockResolvedValue(null);
    const createSpy = jest.spyOn(prismaService.orders, 'create');

    // Act
    const act = service.create(7, dto);

    // Assert — your turn. Does it reject with NotFoundException? Was
    // `orders.create` never called?
    expect(createSpy).not.toHaveBeenCalled();
    await expect(act).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when requested quantity exceeds stock', async () => {
    // Arrange
    jest.spyOn(cartsService, 'getCart').mockResolvedValue({
      id: 1,
      userId: 7,
      items: [
        {
          id: 1,
          productVariantId: 5,
          quantity: 999,
          priceAtPurchase: 2500,
          subtotal: 2497500,
        },
      ],
    });
    jest.spyOn(prismaService.product_variants, 'findUnique').mockResolvedValue({
      product_variant_id: 5,
      stock_quantity: 10,
    } as any);
    const createSpy = jest.spyOn(prismaService.orders, 'create');

    // Act
    const act = service.create(7, dto);

    // Assert — your turn. Does it reject with ConflictException? Was
    // `orders.create` never called?
    expect(createSpy).not.toHaveBeenCalled();
    await expect(act).rejects.toThrow(ConflictException);
  });

  describe('createPayment', () => {
    const paymentDto: PaymentIntentInputDto = { paymentMethod: 'card' };

    it('creates a Stripe PaymentIntent for a pending order the caller owns', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findUnique').mockResolvedValue({
        order_id: 1,
        user_id: 7,
        total_amount: BigInt(5000),
        order_items: [{ product_variant_id: 5, quantity: 2 }],
      } as any);
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'pending' } as any);
      jest
        .spyOn(prismaService.product_variants, 'findUnique')
        .mockResolvedValue({
          product_variant_id: 5,
          stock_quantity: 10,
        } as any);
      const intentSpy = jest
        .spyOn(stripeService.paymentIntents, 'create')
        .mockResolvedValue({
          id: 'pi_123',
          client_secret: 'fake-client-token-for-tests',
          amount: 5000,
          currency: 'usd',
        } as any);

      // Act
      const result = await service.createPayment(7, 1, paymentDto);

      // Assert — your turn. Was `paymentIntents.create` called with
      // amount 5000, currency 'usd', and metadata.orderId '1'? Does
      // `result` match the PaymentIntentResult shape?
      expect(intentSpy).toHaveBeenCalled();
      expect(result).toEqual({
        intentId: 'pi_123',
        clientSecret: 'fake-client-token-for-tests',
        amount: 5000,
        currency: 'usd',
      });
    });

    it('throws NotFoundException when the order does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findUnique').mockResolvedValue(null);
      const intentSpy = jest.spyOn(stripeService.paymentIntents, 'create');

      // Act
      const act = service.createPayment(7, 999, paymentDto);

      // Assert — your turn. Does it reject with NotFoundException? Was
      // `paymentIntents.create` never called?
      await expect(act).rejects.toThrow(NotFoundException);
      expect(intentSpy).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the order belongs to another user', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findUnique').mockResolvedValue({
        order_id: 1,
        user_id: 999,
        total_amount: BigInt(5000),
      } as any);
      const intentSpy = jest.spyOn(stripeService.paymentIntents, 'create');

      // Act
      const act = service.createPayment(7, 1, paymentDto);

      // Assert — your turn. Does it reject with ForbiddenException? Was
      // `paymentIntents.create` never called?
      await expect(act).rejects.toThrow(ForbiddenException);
      expect(intentSpy).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the order is not pending', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findUnique').mockResolvedValue({
        order_id: 1,
        user_id: 7,
        total_amount: BigInt(5000),
      } as any);
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'paid' } as any);
      const intentSpy = jest.spyOn(stripeService.paymentIntents, 'create');

      // Act
      const act = service.createPayment(7, 1, paymentDto);

      // Assert — your turn. Does it reject with ConflictException? Was
      // `paymentIntents.create` never called?
      expect(intentSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when stock dropped below the order quantity since it was created', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findUnique').mockResolvedValue({
        order_id: 1,
        user_id: 7,
        total_amount: BigInt(5000),
        order_items: [{ product_variant_id: 5, quantity: 2 }],
      } as any);
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'pending' } as any);
      jest
        .spyOn(prismaService.product_variants, 'findUnique')
        .mockResolvedValue({
          product_variant_id: 5,
          stock_quantity: 1,
        } as any);
      const intentSpy = jest.spyOn(stripeService.paymentIntents, 'create');

      // Act
      const act = service.createPayment(7, 1, paymentDto);

      // Assert — your turn. Does it reject with ConflictException? Was
      // `paymentIntents.create` never called?
      expect(intentSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(ConflictException);
    });
  });

  describe('getOrders', () => {
    const orderRow = {
      order_id: 1,
      user_id: 7,
      total_amount: BigInt(5000),
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
      order_items: [],
    };

    it('returns all orders without scoping to a user when called without a userId (manager view)', async () => {
      // Arrange
      jest
        .spyOn(prismaService.order_status_history, 'findMany')
        .mockResolvedValue([]);
      const findManySpy = jest
        .spyOn(prismaService.orders, 'findMany')
        .mockResolvedValue([orderRow] as any);

      // Act
      const result = await service.getOrders({});

      // Assert — your turn. Was `orders.findMany`'s `where` free of any
      // `user_id` key at all? Does `result` have one mapped Order?
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ user_id: expect.anything() }),
        }),
      );
      expect(result).toEqual([
        {
          id: 1,
          userId: 7,
          totalAmount: 5000,
          items: [],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);
    });

    it('scopes results to the given user when userId is provided (client view)', async () => {
      // Arrange
      jest
        .spyOn(prismaService.order_status_history, 'findMany')
        .mockResolvedValue([]);
      const findManySpy = jest
        .spyOn(prismaService.orders, 'findMany')
        .mockResolvedValue([orderRow] as any);

      // Act
      const result = await service.getOrders({}, 7);

      // Assert — your turn. Was `orders.findMany`'s `where` called with
      // `user_id: 7`?
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ user_id: 7 }),
        }),
      );
      expect(result).toEqual([
        {
          id: 1,
          userId: 7,
          totalAmount: 5000,
          items: [],
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);
    });

    it("filters by the order's current status, not any status it has ever had", async () => {
      // Arrange — order 1's latest status is 'shipped', order 2's is
      // 'pending'. Filtering by status: 'pending' should only match order 2,
      // even though order 1 was 'pending' too, earlier in its history.
      jest
        .spyOn(prismaService.order_status_history, 'findMany')
        .mockResolvedValue([
          { order_id: 1, status: 'shipped' },
          { order_id: 2, status: 'pending' },
        ] as any);
      const findManySpy = jest
        .spyOn(prismaService.orders, 'findMany')
        .mockResolvedValue([]);

      // Act
      await service.getOrders({ status: 'pending' });

      // Assert — your turn. Was `orders.findMany`'s `where` called with
      // `order_id: { in: [2] }` — not `[1, 2]`, and not `[1]`?
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ order_id: { in: [2] } }),
        }),
      );
    });

    it('passes date range, price range, and pagination through to the query', async () => {
      // Arrange
      jest
        .spyOn(prismaService.order_status_history, 'findMany')
        .mockResolvedValue([]);
      const findManySpy = jest
        .spyOn(prismaService.orders, 'findMany')
        .mockResolvedValue([]);

      // Act
      await service.getOrders({
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        minAmount: 1000,
        maxAmount: 9000,
        limit: 10,
        offset: 20,
      });

      // Assert — your turn. Was `orders.findMany` called with
      // `created_at: { gte: '2026-01-01', lte: '2026-01-31' }`,
      // `total_amount: { gte: 1000, lte: 9000 }`, `take: 10`, `skip: 20`?
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: { gte: '2026-01-01', lte: '2026-01-31' },
            total_amount: { gte: 1000, lte: 9000 },
          }),

          take: 10,
          skip: 20,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the order when the caller is its owner', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue({
        ...orderRow,
        order_items: [],
      } as any);

      // Act
      const result = await service.findOne(1, 7, false);

      expect(result).toEqual(expect.objectContaining({ id: 1, userId: 7 }));
    });

    it('throws NotFoundException when the order does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue(null);

      // Act
      const act = service.findOne(999, 7, false);

      // Assert — your turn. Does it reject with NotFoundException?
      await expect(act).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the order belongs to another user', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue({
        ...orderRow,
        user_id: 999,
        order_items: [],
      } as any);

      // Act
      const act = service.findOne(1, 7, false);

      // Assert — your turn. Does it reject with ForbiddenException?
      await expect(act).rejects.toThrow(ForbiddenException);
    });

    it('allows a manager (isManager: true) to view any order', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue({
        ...orderRow,
        user_id: 999,
        order_items: [],
      } as any);

      // Act
      const result = await service.findOne(1, 7, true);

      // Assert — your turn. Does it resolve (no exception), with the
      // mapped Order?
      expect(result).toEqual(expect.objectContaining({ id: 1 }));
    });
  });

  describe('getStatusHistory', () => {
    it('maps status history rows to the response DTO shape', async () => {
      // Arrange
      jest
        .spyOn(prismaService.order_status_history, 'findMany')
        .mockResolvedValue([
          {
            order_status_history_id: 1,
            order_id: 1,
            status: 'paid',
            created_at: new Date('2026-01-02'),
            changed_by_type: 'system',
            changed_by_user_id: null,
            changed_by_email: null,
          },
        ]);

      // Act
      const result = await service.getStatusHistory(1, 20, 0);

      // Assert — your turn. Does `result` have one entry with
      // `status: 'paid'`, `changedAt` matching the row's `created_at`,
      // and `changedBy` falling back to `'system'` since
      // `changed_by_email` was null?
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          status: 'paid',
          changedAt: new Date('2026-01-02'),
          changedBy: 'system',
        }),
      );
    });
  });

  describe('postStatusHistory', () => {
    it('advances status from paid to processing', async () => {
      // Arrange
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'paid' } as any);
      const createSpy = jest
        .spyOn(prismaService.order_status_history, 'create')
        .mockResolvedValue({
          order_status_history_id: 2,
          order_id: 1,
          status: 'processing',
          created_at: new Date('2026-01-03'),
          changed_by_type: 'user',
          changed_by_user_id: 3,
          changed_by_email: 'manager@example.com',
        });

      // Act
      const result = await service.postStatusHistory(
        1,
        'processing',
        'manager@example.com',
        3,
      );

      // Assert — your turn. Was `create` called with the right `data`
      // (order_id, status, changed_by_type: 'user', email, userId)?
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          order_id: 1,
          status: 'processing',
          changed_by_type: 'user',
          changed_by_email: 'manager@example.com',
          changed_by_user_id: 3,
        },
      });
      expect(result.status).toBe('processing');
    });

    it('throws ConflictException on an illegal transition', async () => {
      // Arrange — order is still 'pending', but the request asks to jump
      // straight to 'shipped'.
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'pending' } as any);
      const createSpy = jest.spyOn(
        prismaService.order_status_history,
        'create',
      );

      // Act
      const act = service.postStatusHistory(
        1,
        'shipped',
        'manager@example.com',
        3,
      );

      // Assert — your turn. Does it reject with ConflictException? Was
      // `create` never called?
      await expect(act).rejects.toThrow(ConflictException);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder', () => {
    it('cancels a pending order the caller owns', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue({
        ...orderRow,
        order_items: [],
      } as any);
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'pending' } as any);
      const createSpy = jest.spyOn(
        prismaService.order_status_history,
        'create',
      );

      // Act
      const result = await service.cancelOrder(1, 7, 'client@example.com');

      // Assert — your turn. Was `create` called with `status: 'cancelled'`?
      // Does `result` have the mapped Order shape?
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: 'cancelled' }),
      });
      expect(result).toEqual(expect.objectContaining({ id: 1, userId: 7 }));
    });

    it('throws ConflictException when the order is already shipped', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue({
        ...orderRow,
        order_items: [],
      } as any);
      jest
        .spyOn(prismaService.order_status_history, 'findFirst')
        .mockResolvedValue({ status: 'shipped' } as any);
      const createSpy = jest.spyOn(
        prismaService.order_status_history,
        'create',
      );

      // Act
      const act = service.cancelOrder(1, 7, 'client@example.com');

      // Assert — your turn. Does it reject with ConflictException? Was
      // `create` never called?
      await expect(act).rejects.toThrow(ConflictException);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the order belongs to another user', async () => {
      // Arrange
      jest.spyOn(prismaService.orders, 'findFirst').mockResolvedValue({
        ...orderRow,
        user_id: 999,
        order_items: [],
      } as any);

      // Act
      const act = service.cancelOrder(1, 7, 'client@example.com');

      // Assert — your turn. Does it reject with ForbiddenException?
      await expect(act).rejects.toThrow(ForbiddenException);
    });
  });
});
