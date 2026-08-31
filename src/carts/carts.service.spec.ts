import { Test, TestingModule } from '@nestjs/testing';
import { CartsService } from './carts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CartsService', () => {
  let service: CartsService;
  let prismaService: PrismaService;

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
          },
        },
      ],
    }).compile();

    service = module.get<CartsService>(CartsService);
    prismaService = module.get<PrismaService>(PrismaService);
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
          price_at_purchase: 1500n,
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
});
