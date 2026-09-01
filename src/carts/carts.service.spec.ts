import { Test, TestingModule } from '@nestjs/testing';
import { CartsService } from './carts.service';
import { PrismaService } from '../prisma/prisma.service';
import { VariantsService } from '../variants/variants.service';
import { NotFoundException } from '@nestjs/common';

describe('CartsService', () => {
  let service: CartsService;
  let prismaService: PrismaService;
  let variantsService: VariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartsService,
        {
          provide: PrismaService,
          useValue: {
            carts: {
              findUnique: jest.fn(),
            },
            cart_items: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            prices_history: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: VariantsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CartsService>(CartsService);
    prismaService = module.get<PrismaService>(PrismaService);
    variantsService = module.get<VariantsService>(VariantsService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // getCart cases
  it('getCart returns the mapped cart with its items', async () => {
    // Arrange
    const mockRow = {
      cart_id: 1,
      user_id: 5,
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
      cart_items: [
        {
          cart_items_id: 1,
          cart_id: 1,
          product_variant_id: 42,
          quantity: 2,
          price_at_purchase: 1500,
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-01-02'),
        },
      ],
    };
    const findUniqueSpy = jest
      .spyOn(prismaService.carts, 'findUnique')
      .mockResolvedValue(mockRow);

    // Act
    const result = await service.getCart(5);

    // Assert — your turn. Was findUnique called with
    // `where: { user_id: 5 }, include: { cart_items: true }`? Does result
    // have the camelCase Cart shape, with items[0].subtotal correctly
    // computed as quantity * priceAtPurchase (2 * 1500 = 3000)?
    expect(findUniqueSpy).toHaveBeenCalledWith({
      where: {
        user_id: 5,
      },
      include: { cart_items: true },
    });
    expect(result).toEqual({
      id: 1,
      userId: 5,
      items: [
        {
          id: 1,
          productVariantId: 42,
          quantity: 2,
          priceAtPurchase: 1500,
          subtotal: 3000,
        },
      ],
    });
  });

  it('getCart throws NotFoundException when the user has no cart', async () => {
    // Arrange
    jest.spyOn(prismaService.carts, 'findUnique').mockResolvedValue(null);

    // Act
    const act = service.getCart(999);

    // Assert — your turn. Does it reject with NotFoundException?
    await expect(act).rejects.toThrow(NotFoundException);
  });

  // addItem cases
  it('addItem increments quantity when the variant is already in the cart', async () => {
    // Arrange
    jest.spyOn(variantsService, 'findOne').mockResolvedValue({} as any);
    const userCart = { cart_id: 1, user_id: 5 };
    jest
      .spyOn(prismaService.carts, 'findUnique')
      .mockResolvedValue(userCart as any);
    const existingItem = {
      cart_items_id: 10,
      cart_id: 1,
      product_variant_id: 42,
      quantity: 2,
      price_at_purchase: 1500,
    };
    jest
      .spyOn(prismaService.cart_items, 'findUnique')
      .mockResolvedValue(existingItem as any);
    const updateSpy = jest.spyOn(prismaService.cart_items, 'update');
    const createSpy = jest.spyOn(prismaService.cart_items, 'create');
    // getCart's own findUnique call at the end reuses the carts mock above,
    // this time needing cart_items included:
    jest.spyOn(prismaService.carts, 'findUnique').mockResolvedValue({
      cart_id: 1,
      user_id: 5,
      cart_items: [{ ...existingItem, quantity: 5 }],
    } as any);

    // Act
    await service.addItem(5, { productVariantId: 42, quantity: 3 });

    // Assert — your turn. Was cart_items.update called with
    // `where: { cart_items_id: 10 }, data: { quantity: 5 }` (2 + 3)? Was
    // cart_items.create never called, since the item already existed?
    expect(updateSpy).toHaveBeenCalledWith({
      where: { cart_items_id: 10 },
      data: { quantity: 5 },
    });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('addItem creates a new item with the current price when the variant is not yet in the cart', async () => {
    // Arrange
    jest.spyOn(variantsService, 'findOne').mockResolvedValue({} as any);
    const userCart = { cart_id: 1, user_id: 5 };
    jest
      .spyOn(prismaService.carts, 'findUnique')
      .mockResolvedValueOnce(userCart as any);
    jest.spyOn(prismaService.cart_items, 'findUnique').mockResolvedValue(null);
    jest
      .spyOn(prismaService.prices_history, 'findFirst')
      .mockResolvedValue({ price: 1500 } as any);
    const createSpy = jest.spyOn(prismaService.cart_items, 'create');
    // getCart's own findUnique call at the end:
    jest.spyOn(prismaService.carts, 'findUnique').mockResolvedValueOnce({
      cart_id: 1,
      user_id: 5,
      cart_items: [
        {
          cart_items_id: 11,
          product_variant_id: 42,
          quantity: 3,
          price_at_purchase: 1500,
        },
      ],
    } as any);

    // Act
    await service.addItem(5, { productVariantId: 42, quantity: 3 });

    // Assert — your turn. Was prices_history.findFirst called with
    // `where: { product_variant_id: 42 }, orderBy: { effective_from: 'desc' }`?
    // Was cart_items.create called with
    // `data: { cart_id: 1, product_variant_id: 42, quantity: 3, price_at_purchase: 1500 }`?
    expect(prismaService.prices_history.findFirst).toHaveBeenCalledWith({
      where: { product_variant_id: 42 },
      orderBy: { effective_from: 'desc' },
    });
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        cart_id: 1,
        product_variant_id: 42,
        quantity: 3,
        price_at_purchase: 1500,
      },
    });
  });

  // updateItem cases
  it('updateItem updates the quantity and returns the mapped line item', async () => {
    // Arrange
    const userCart = { cart_id: 1, user_id: 5 };
    jest
      .spyOn(prismaService.carts, 'findUnique')
      .mockResolvedValue(userCart as any);
    const existingItem = {
      cart_items_id: 10,
      cart_id: 1,
      product_variant_id: 42,
      quantity: 2,
      price_at_purchase: 1500n,
    };
    jest
      .spyOn(prismaService.cart_items, 'findFirst')
      .mockResolvedValue(existingItem as any);
    const updateSpy = jest
      .spyOn(prismaService.cart_items, 'update')
      .mockResolvedValue({ ...existingItem, quantity: 7 } as any);

    // Act
    const result = await service.updateItem(5, 10, 7);

    // Assert — your turn. Was findFirst called with
    // `where: { cart_items_id: 10, cart_id: 1 }` (scoped to this user's
    // cart, not just any item)? Was update called with
    // `where: { cart_items_id: 10 }, data: { quantity: 7 }`? Does result
    // equal `{ id: 10, productVariantId: 42, quantity: 7,
    // priceAtPurchase: 1500, subtotal: 10500 }` (7 * 1500)?
    expect(updateSpy).toHaveBeenCalledWith({
      where: { cart_items_id: 10 },
      data: { quantity: 7 },
    });
    expect(result).toEqual({
      id: 10,
      productVariantId: 42,
      quantity: 7,
      priceAtPurchase: 1500,
      subtotal: 10500,
    });
  });

  it('updateItem throws NotFoundException when the item does not belong to this user', async () => {
    // Arrange
    jest
      .spyOn(prismaService.carts, 'findUnique')
      .mockResolvedValue({ cart_id: 1, user_id: 5 } as any);
    jest.spyOn(prismaService.cart_items, 'findFirst').mockResolvedValue(null);
    const updateSpy = jest.spyOn(prismaService.cart_items, 'update');

    // Act
    const act = service.updateItem(5, 999, 7);

    // Assert — your turn. Does it reject with NotFoundException? Was
    // update never called, since the item lookup failed first?
    expect(updateSpy).not.toHaveBeenCalled();
    await expect(act).rejects.toThrow(NotFoundException);
  });
});
