import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/createOrder.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let cartsService: CartsService;

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
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    cartsService = module.get<CartsService>(CartsService);
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
});
