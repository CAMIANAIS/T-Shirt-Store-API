import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { ProductUpdateInputDto } from './dto/updateProduct.dto';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            products: {
              findMany: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // findAll cases
  it('findAll maps Prisma rows to the camelCase Product shape', async () => {
    // Arrange
    const mockRow = {
      product_id: 1,
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
      deleted_at: null,
      category_id: 5,
    };
    const findManySpy = jest
      .spyOn(prismaService.products, 'findMany')
      .mockResolvedValue([mockRow]);

    // Act
    const result = await service.findAll();

    // Assert — your turn. Does `result[0]` have the camelCase fields
    // (productId, categoryId, createdAt...) with the right values?
    expect(result).toEqual([
      {
        productId: 1,
        name: 'summer-tshirt',
        description: 'long sleeves, 100% cotton',
        status: 'active',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        deletedAt: null,
        categoryId: 5,
      },
    ]);
    expect(findManySpy).toHaveBeenCalled();
  });

  it('findAll passes categoryId/limit/offset through to Prisma correctly', async () => {
    // Arrange
    const findManySpy = jest
      .spyOn(prismaService.products, 'findMany')
      .mockResolvedValue([]);

    // Act
    await service.findAll(5, 10, 20);

    // Assert — your turn. Was findMany called with categoryId mapped to
    // `category_id: 5`, `take: 10`, `skip: 20`, and `deleted_at: null`?
    expect(findManySpy).toHaveBeenCalledWith({
      where: {
        category_id: 5,
        deleted_at: null,
      },
      take: 10,
      skip: 20,
    });
  });

  // create cases
  it('create creates a product without variants when none are provided', async () => {
    // Arrange
    const now = new Date();
    const dto = {
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      categoryId: 5,
    };
    const mockCreated = {
      product_id: 1,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      category_id: dto.categoryId,
    };
    const createSpy = jest
      .spyOn(prismaService.products, 'create')
      .mockResolvedValue(mockCreated);

    // Act
    const result = await service.create(dto as ProductInputDto);

    // Assert — your turn. Was `create` called with the right `data` shape
    // (no `product_variants` key at all, since dto.variants is undefined)?
    expect(result).toEqual({
      productId: 1,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      categoryId: dto.categoryId,
    });
    expect(createSpy).toHaveBeenCalled();
  });

  it('create passes a nested product_variants.create when variants are provided', async () => {
    // Arrange
    const dto = {
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      categoryId: 5,
      variants: [
        { size: 'M', color: 'red', stockQuantity: 10, skuCode: 'TSH-RED-MD' },
      ],
    };
    const mockCreated = {
      product_id: 1,
      name: dto.name,
      description: dto.description,
      status: dto.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      category_id: dto.categoryId,
    };
    const createSpy = jest
      .spyOn(prismaService.products, 'create')
      .mockResolvedValue(mockCreated);

    // Act
    await service.create(dto as ProductInputDto);

    // Assert — your turn. Was `create` called with a
    // `product_variants: { create: [...] }` key, using snake_case field
    // names (stock_quantity, sku_code) mapped from the camelCase dto?
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        category_id: dto.categoryId,
        ...(dto.variants && {
          product_variants: {
            create: [
              {
                size: 'M',
                color: 'red',
                stock_quantity: 10,
                sku_code: 'TSH-RED-MD',
              },
            ],
          },
        }),
      },
    });
  });

  // findOne cases
  it('findOne returns the mapped product when found', async () => {
    // Arrange
    const mockRow = {
      product_id: 1,
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
      deleted_at: null,
      category_id: 5,
    };
    const findFirstSpy = jest
      .spyOn(prismaService.products, 'findFirst')
      .mockResolvedValue(mockRow);

    // Act
    const result = await service.findOne(1);

    // Assert — your turn. Was findFirst called with `product_id: 1` and
    // `deleted_at: null`? Does result have the camelCase Product shape?
    expect(result).toEqual({
      productId: 1,
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      deletedAt: null,
      categoryId: 5,
    });
    expect(findFirstSpy).toHaveBeenNthCalledWith(1, {
      where: { product_id: 1, deleted_at: null },
    });
  });

  it('findOne throws NotFoundException when no matching product exists', async () => {
    // Arrange
    jest.spyOn(prismaService.products, 'findFirst').mockResolvedValue(null);

    // Act
    const act = service.findOne(999);

    // Assert — your turn. Does it reject with NotFoundException?
    await expect(act).rejects.toThrow('Product not found');
  });

  // update cases
  it('update updates and returns the mapped product when it exists', async () => {
    // Arrange
    const existingRow = {
      product_id: 1,
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
      deleted_at: null,
      category_id: 5,
    };
    const dto = { name: 'winter-tshirt' };
    const updatedRow = { ...existingRow, name: dto.name };
    jest
      .spyOn(prismaService.products, 'findFirst')
      .mockResolvedValue(existingRow);
    const updateSpy = jest
      .spyOn(prismaService.products, 'update')
      .mockResolvedValue(updatedRow);

    // Act
    const result = await service.update(1, dto as ProductUpdateInputDto);

    // Assert — your turn. Was `update` called with the right `where`/`data`
    // shape? Does `result` have the camelCase Product shape with the new name?
    expect(result).toEqual({
      productId: 1,
      name: 'winter-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      deletedAt: null,
      categoryId: 5,
    });
    expect(updateSpy).toHaveBeenCalled();
  });

  it('update throws NotFoundException when the product does not exist, without calling update', async () => {
    // Arrange
    jest.spyOn(prismaService.products, 'findFirst').mockResolvedValue(null);
    const updateSpy = jest.spyOn(prismaService.products, 'update');

    // Act
    const act = service.update(999, {
      name: 'winter-tshirt',
    } as ProductUpdateInputDto);

    // Assert — your turn. Does it reject with NotFoundException? Was
    // `update` never called, since findOne threw first?
    await expect(act).rejects.toThrow(NotFoundException);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
