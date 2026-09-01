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
            },
            order_status_history: {
              findFirst: jest.fn(),
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
});
