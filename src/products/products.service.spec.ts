import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { S3Service } from '../s3/s3.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;
  let stripeService: StripeService;
  let s3Service: S3Service;

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
            product_likes: {
              upsert: jest.fn(),
              deleteMany: jest.fn(),
            },
            product_variants: {
              findMany: jest.fn(),
            },
            prices_history: {
              findFirst: jest.fn(),
            },
            product_images: {
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: StripeService,
          useValue: {
            paymentLinks: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            upload: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeService>(StripeService);
    s3Service = module.get<S3Service>(S3Service);
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
    const result = await service.create(dto);

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
        {
          size: 'M',
          color: 'red',
          stockQuantity: 10,
          skuCode: 'TSH-RED-MD',
          price: 2999,
        },
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
    await service.create(dto);

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
                prices_history: { create: { price: 2999 } },
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
    const result = await service.update(1, dto);

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
    });

    // Assert — your turn. Does it reject with NotFoundException? Was
    // `update` never called, since findOne threw first?
    await expect(act).rejects.toThrow(NotFoundException);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // remove cases
  it('remove soft-deletes the product by setting deleted_at', async () => {
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
    jest
      .spyOn(prismaService.products, 'findFirst')
      .mockResolvedValue(existingRow);
    const updateSpy = jest
      .spyOn(prismaService.products, 'update')
      .mockResolvedValue({ ...existingRow, deleted_at: new Date() });

    // Act
    const result = await service.remove(1);

    // Assert — your turn. Was `update` called with `where: { product_id: 1,
    // deleted_at: null }` and `data: { deleted_at: <a Date> }`? Does
    // `remove` return `undefined` (its declared type is `Promise<void>`)?
    expect(result).toBeUndefined();
    expect(updateSpy).toHaveBeenCalledWith({
      where: { product_id: 1, deleted_at: null },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('remove throws NotFoundException when the product does not exist, without calling update', async () => {
    // Arrange
    jest.spyOn(prismaService.products, 'findFirst').mockResolvedValue(null);
    const updateSpy = jest.spyOn(prismaService.products, 'update');

    // Act
    const act = service.remove(999);

    // Assert — your turn. Does it reject with NotFoundException? Was
    // `update` never called, since findOne threw first?
    await expect(act).rejects.toThrow(NotFoundException);
    expect(updateSpy).not.toHaveBeenCalled();
  });
  describe('activate', () => {
    it('returns 200 (idempotent) when already active', async () => {
      const mockProduct = { status: 'active' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);
      const updateSpy = jest.spyOn(prismaService.products, 'update');
      const result = await service.activate(1);

      expect(result).toEqual(mockProduct);
      // Prisma update should NOT be called
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('changes status to active when currently inactive', async () => {
      const mockProduct = {
        product_id: 1,
        name: 'summer-tshirt',
        description: 'long sleeves, 100% cotton',
        status: 'inactive',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-02'),
        deleted_at: null,
        category_id: 5,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);
      const updateSpy = jest
        .spyOn(prismaService.products, 'update')
        .mockResolvedValue({ ...mockProduct, status: 'active' });

      const result = await service.activate(1);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { product_id: 1 },
        data: { status: 'active' },
      });
      expect(result.status).toBe('active');
    });

    it('throws 409 when trying to activate discontinued product', async () => {
      const mockProduct = { status: 'discontinued' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);

      const act = service.activate(1);

      await expect(act).rejects.toThrow(
        new ConflictException('Cannot activate a discontinued product'),
      );
    });
  });
  describe('deactivate', () => {
    it('returns 200 (idempotent) when already inactive', async () => {
      const mockProduct = { status: 'inactive' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);
      const updateSpy = jest.spyOn(prismaService.products, 'update');

      const result = await service.deactivate(1);

      expect(result).toEqual(mockProduct);
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('changes status to inactive when currently active', async () => {
      const mockProduct = {
        product_id: 1,
        name: 'summer-tshirt',
        description: 'long sleeves, 100% cotton',
        status: 'active',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-02'),
        deleted_at: null,
        category_id: 5,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);
      const updateSpy = jest
        .spyOn(prismaService.products, 'update')
        .mockResolvedValue({ ...mockProduct, status: 'inactive' });

      const result = await service.deactivate(1);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { product_id: 1 },
        data: { status: 'inactive' },
      });
      expect(result.status).toBe('inactive');
    });

    it('throws 409 when trying to deactivate discontinued product', async () => {
      const mockProduct = { status: 'discontinued' };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);

      const act = service.deactivate(1);

      await expect(act).rejects.toThrow(
        new ConflictException('Cannot deactivate a discontinued product'),
      );
    });
  });

  describe('likeProduct', () => {
    it('upserts on the compound key when the product exists', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      const upsertSpy = jest
        .spyOn(prismaService.product_likes, 'upsert')
        .mockResolvedValue({} as any);

      await service.likeProduct(7, 42);

      // Assert — your turn. Was `upsert` called with the right `where`
      // (compound key `user_id_product_id`), `create`, and an empty `update`?
      expect(upsertSpy).toHaveBeenCalledWith({
        where: { user_id_product_id: { user_id: 7, product_id: 42 } },
        create: { user_id: 7, product_id: 42 },
        update: {},
      });
    });

    it('throws 404 and never calls upsert when the product does not exist', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      const upsertSpy = jest.spyOn(prismaService.product_likes, 'upsert');

      const act = service.likeProduct(7, 999);

      // Assert — your turn. Does it reject with NotFoundException? Was
      // `upsert` never called, since `findOne` threw first?
      expect(upsertSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlikeProduct', () => {
    it('calls deleteMany scoped to the user and product', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      const deleteManySpy = jest
        .spyOn(prismaService.product_likes, 'deleteMany')
        .mockResolvedValue({ count: 1 });

      await service.unlikeProduct(7, 42);

      // Assert — your turn. Was `deleteMany` called with `where: { user_id, product_id }`?
      expect(deleteManySpy).toHaveBeenCalledWith({
        where: { user_id: 7, product_id: 42 },
      });
    });

    it('throws 404 and never calls deleteMany when the product does not exist', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      const deleteManySpy = jest.spyOn(
        prismaService.product_likes,
        'deleteMany',
      );

      const act = service.unlikeProduct(7, 999);

      // Assert — your turn. Does it reject with NotFoundException? Was
      // `deleteMany` never called, since `findOne` threw first?
      expect(deleteManySpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPaymentLink', () => {
    it('creates a Stripe Payment Link when the product has exactly one variant', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue({
        productId: 42,
        name: 'summer-tshirt',
      } as any);
      jest
        .spyOn(prismaService.product_variants, 'findMany')
        .mockResolvedValue([{ product_variant_id: 5, product_id: 42 }] as any);
      jest
        .spyOn(prismaService.prices_history, 'findFirst')
        .mockResolvedValue({ price: BigInt(2500) } as any);
      const createLinkSpy = jest
        .spyOn(stripeService.paymentLinks, 'create')
        .mockResolvedValue({ url: 'https://buy.stripe.com/test_abc' } as any);

      // Act
      const result = await service.createPaymentLink(7, 42);

      // Assert — your turn. Was `paymentLinks.create` called with the
      // right `line_items` (currency, unit_amount 2500, product name) and
      // `metadata` (userId '7', productVariantId '5')? Does `result` match
      // { paymentLink: 'https://buy.stripe.com/test_abc', expiresAt: null }?
      expect(createLinkSpy).toHaveBeenCalledWith({
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: 2500,
              product_data: { name: 'summer-tshirt' },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: '7',
          productVariantId: '5',
        },
      });

      expect(result).toEqual({
        paymentLink: 'https://buy.stripe.com/test_abc',
        expiresAt: null,
      });
    });
    it('throws ConflictException when the product has more than one variant', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue({
        productId: 42,
        name: 'summer-tshirt',
      } as any);
      jest.spyOn(prismaService.product_variants, 'findMany').mockResolvedValue([
        { product_variant_id: 5, product_id: 42 },
        { product_variant_id: 6, product_id: 42 },
      ] as any);
      const createLinkSpy = jest.spyOn(stripeService.paymentLinks, 'create');

      // Act
      const act = service.createPaymentLink(7, 42);

      // Assert — your turn. Does it reject with ConflictException? Was
      // `paymentLinks.create` never called?
      expect(createLinkSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the product does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      const createLinkSpy = jest.spyOn(stripeService.paymentLinks, 'create');

      // Act
      const act = service.createPaymentLink(7, 999);

      // Assert — your turn. Does it reject with NotFoundException? Was
      // `paymentLinks.create` never called?
      expect(createLinkSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(NotFoundException);
    });
  });

  describe('findImages', () => {
    it('maps rows to the url-based ProductImage shape, ordered by displayOrder', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      jest.spyOn(prismaService.product_images, 'findMany').mockResolvedValue([
        {
          image_id: 1,
          filename: 'a-uuid',
          extension: 'png',
          display_order: 0,
          alt_text: 'front view',
          created_at: new Date('2026-01-01'),
          updated_at: new Date('2026-01-01'),
        },
      ] as any);
      const getSignedUrlSpy = jest
        .spyOn(s3Service, 'getSignedUrl')
        .mockResolvedValue('https://signed.example.com/a-uuid.png');

      // Act
      const result = await service.findImages(42);

      // Assert — your turn. Was `getSignedUrl` called with the key
      // `products/42/a-uuid.png`? Does `result[0]` have a `url` field (no
      // `bucketName`/`filename`/`extension`/`product`), matching
      // { id: 1, url: 'https://signed.example.com/a-uuid.png',
      //   displayOrder: 0, altText: 'front view', ... }?
      expect(getSignedUrlSpy).toHaveBeenCalledWith('products/42/a-uuid.png');
      expect(result).toEqual([
        {
          id: 1,
          url: 'https://signed.example.com/a-uuid.png',
          displayOrder: 0,
          altText: 'front view',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);
    });

    it('throws NotFoundException and never queries images when the product does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      const findManySpy = jest.spyOn(prismaService.product_images, 'findMany');

      // Act
      const act = service.findImages(999);

      // Assert — your turn. Does it reject with NotFoundException? Was
      // `product_images.findMany` never called, since `findOne` threw first?
      expect(findManySpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(NotFoundException);
    });
  });

  describe('addImage', () => {
    const fakeFile = {
      buffer: Buffer.from('fake-image-bytes'),
      mimetype: 'image/png',
    } as Express.Multer.File;

    it('uploads to S3 and creates a DB row when the file type is supported', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      jest.spyOn(prismaService.product_images, 'count').mockResolvedValue(2);
      const uploadSpy = jest
        .spyOn(s3Service, 'upload')
        .mockResolvedValue(undefined);
      jest.spyOn(prismaService.product_images, 'create').mockResolvedValue({
        image_id: 10,
        display_order: 2,
        alt_text: 'front view',
        created_at: new Date('2026-01-01'),
        updated_at: new Date('2026-01-01'),
      } as any);
      jest
        .spyOn(s3Service, 'getSignedUrl')
        .mockResolvedValue('https://signed.example.com/new-uuid.png');

      // Act
      const result = await service.addImage(42, fakeFile, {
        altText: 'front view',
      } as any);

      // Assert — your turn. Was `s3Service.upload` called with the fake
      // buffer and `image/png`? When `dto.displayOrder` is missing, does the
      // created row's `display_order` come from the existing image count
      // (2)? Does `result` have a `url` field, no raw storage fields?
      expect(uploadSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^products\/42\/.+\.png$/),
        fakeFile.buffer,
        'image/png',
      );
      expect(result).toEqual({
        id: 10,
        url: 'https://signed.example.com/new-uuid.png',
        displayOrder: 2,
        altText: 'front view',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
    });

    it('throws BadRequestException for an unsupported mimetype, and never touches S3 or the DB', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      const uploadSpy = jest.spyOn(s3Service, 'upload');
      const createSpy = jest.spyOn(prismaService.product_images, 'create');
      const unsupportedFile = {
        buffer: Buffer.from('not-an-image'),
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      // Act
      const act = service.addImage(42, unsupportedFile, {} as any);

      // Assert — your turn. Does it reject with BadRequestException? Were
      // `upload` and `create` never called?
      expect(uploadSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the product already has the max number of images', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue({} as any);
      jest.spyOn(prismaService.product_images, 'count').mockResolvedValue(10);
      const uploadSpy = jest.spyOn(s3Service, 'upload');

      // Act
      const act = service.addImage(42, fakeFile, {} as any);

      // Assert — your turn. Does it reject with ConflictException? Was
      // `upload` never called, since the cap check happens before the S3 call?
      expect(uploadSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the product does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());
      const uploadSpy = jest.spyOn(s3Service, 'upload');

      // Act
      const act = service.addImage(999, fakeFile, {} as any);

      // Assert — your turn. Does it reject with NotFoundException? Was
      // `upload` never called?
      expect(uploadSpy).not.toHaveBeenCalled();
      await expect(act).rejects.toThrow(NotFoundException);
    });
  });
});
