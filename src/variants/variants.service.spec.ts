import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('VariantsService', () => {
  let service: VariantsService;
  let prismaService: PrismaService;
  let productsService: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        {
          provide: PrismaService,
          useValue: {
            product_variants: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ProductsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    prismaService = module.get<PrismaService>(PrismaService);
    productsService = module.get<ProductsService>(ProductsService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // findByProductId cases
  it('findByProductId returns the mapped variants for a product', async () => {
    // Arrange
    (productsService.findOne as jest.Mock).mockResolvedValue({});
    const mockRow = {
      product_variant_id: 1,
      product_id: 5,
      size: 'M',
      color: 'red',
      stock_quantity: 10,
      sku_code: 'TSH-RED-MD',
      status: 'active',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
    };
    const findManySpy = jest
      .spyOn(prismaService.product_variants, 'findMany')
      .mockResolvedValue([mockRow]);

    // Act
    const result = await service.findByProductId(5);

    // Assert — your turn. Was productsService.findOne called with 5 (to
    // verify the product exists first)? Was findMany called with
    // `where: { product_id: 5 }`? Does result[0] have the camelCase
    // ProductVariant shape (productVariantId, stockQuantity, skuCode...)?
    expect(result).toEqual([
      {
        productVariantId: 1,
        productId: 5,
        size: 'M',
        color: 'red',
        stockQuantity: 10,
        skuCode: 'TSH-RED-MD',
        status: 'active',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      },
    ]);
    expect(productsService.findOne).toHaveBeenCalledWith(5);
    expect(findManySpy).toHaveBeenCalledWith({
      where: { product_id: 5 },
      take: undefined,
      skip: undefined,
    });
  });

  it('findByProductId verifies product exists before querying variants', async () => {
    // Arrange
    const findOneSpy = jest
      .spyOn(productsService, 'findOne')
      .mockResolvedValue({} as any);
    jest
      .spyOn(prismaService.product_variants, 'findMany')
      .mockResolvedValue([]);

    // Act
    await service.findByProductId(5, 10, 20);

    // Assert — your turn. Was findOne called with productId 5 to verify
    // the product exists before calling findMany on variants?
    expect(findOneSpy).toHaveBeenCalledWith(5);
  });

  // create cases
  it('create adds a variant when the SKU is unique', async () => {
    // Arrange
    (productsService.findOne as jest.Mock).mockResolvedValue({});
    jest
      .spyOn(prismaService.product_variants, 'findFirst')
      .mockResolvedValue(null);
    const mockCreated = {
      product_variant_id: 1,
      product_id: 5,
      size: 'M',
      color: 'red',
      stock_quantity: 10,
      sku_code: 'TSH-RED-MD',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
    const createSpy = jest
      .spyOn(prismaService.product_variants, 'create')
      .mockResolvedValue(mockCreated);
    const dto = {
      size: 'M',
      color: 'red',
      stockQuantity: 10,
      skuCode: 'TSH-RED-MD',
    };

    // Act
    const result = await service.create(5, dto);

    // Assert — your turn. Was `create` called with the right `data` shape
    // (product_id: 5, snake_case fields)? Does result have the camelCase shape?
    expect(result).toEqual({
      productVariantId: 1,
      productId: 5,
      size: 'M',
      color: 'red',
      stockQuantity: 10,
      skuCode: 'TSH-RED-MD',
      status: 'active',
      createdAt: mockCreated.created_at,
      updatedAt: mockCreated.updated_at,
    });
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        product_id: 5,
        size: 'M',
        color: 'red',
        stock_quantity: 10,
        sku_code: 'TSH-RED-MD',
        status: 'active',
      },
    });
  });

  it('create throws ConflictException when the SKU already exists', async () => {
    // Arrange
    (productsService.findOne as jest.Mock).mockResolvedValue({});
    jest
      .spyOn(prismaService.product_variants, 'findFirst')
      .mockResolvedValue({ sku_code: 'TSH-RED-MD' });
    const createSpy = jest.spyOn(prismaService.product_variants, 'create');
    const dto = {
      size: 'M',
      color: 'red',
      stockQuantity: 10,
      skuCode: 'TSH-RED-MD',
    };

    // Act
    const act = service.create(5, dto);

    // Assert — your turn. Does it reject with ConflictException? Was
    // `create` never called, since the SKU check threw first?
    await expect(act).rejects.toThrow(
      new ConflictException('SKU already exists'),
    );
    expect(createSpy).not.toHaveBeenCalled();
  });

  // update cases
  it('update throws NotFoundException when the variant does not belong to the product', async () => {
    // Arrange
    (productsService.findOne as jest.Mock).mockResolvedValue({});
    jest
      .spyOn(prismaService.product_variants, 'findFirst')
      .mockResolvedValue(null);
    const updateSpy = jest.spyOn(prismaService.product_variants, 'update');

    // Act
    const act = service.update(5, 999, {});

    // Assert — your turn. Does it reject with NotFoundException? Was
    // `update` never called?
    await expect(act).rejects.toThrow(NotFoundException);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('update throws ConflictException when changing to an SKU another variant already has', async () => {
    // Arrange
    const existingVariant = {
      product_variant_id: 1,
      product_id: 5,
      sku_code: 'TSH-RED-MD',
    };
    (productsService.findOne as jest.Mock).mockResolvedValue({});
    jest
      .spyOn(prismaService.product_variants, 'findFirst')
      .mockResolvedValueOnce(existingVariant)
      .mockResolvedValueOnce({ sku_code: 'TSH-BLU-MD' });
    const updateSpy = jest.spyOn(prismaService.product_variants, 'update');

    // Act
    const act = service.update(5, 1, {
      skuCode: 'TSH-BLU-MD',
    });

    // Assert — your turn. Does it reject with ConflictException? Was
    // `update` never called?
    await expect(act).rejects.toThrow(
      new ConflictException('SKU already exists'),
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('update updates only the provided fields and returns the mapped variant', async () => {
    // Arrange
    const existingVariant = {
      product_variant_id: 1,
      product_id: 5,
      size: 'M',
      color: 'red',
      stock_quantity: 10,
      sku_code: 'TSH-RED-MD',
      status: 'active',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
    };
    (productsService.findOne as jest.Mock).mockResolvedValue({});
    jest
      .spyOn(prismaService.product_variants, 'findFirst')
      .mockResolvedValue(existingVariant);
    const updateSpy = jest
      .spyOn(prismaService.product_variants, 'update')
      .mockResolvedValue({ ...existingVariant, stock_quantity: 20 });

    // Act
    const result = await service.update(5, 1, {
      stockQuantity: 20,
    });

    // Assert — your turn. Was `update` called with only `stock_quantity: 20`
    // in `data` (not size/color/skuCode/status, since they weren't sent)?
    // Does result have the camelCase shape with the new stockQuantity?
    expect(result).toEqual({
      productVariantId: 1,
      productId: 5,
      size: 'M',
      color: 'red',
      stockQuantity: 20,
      skuCode: 'TSH-RED-MD',
      status: 'active',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    });
    expect(updateSpy).toHaveBeenCalled();
  });
});
