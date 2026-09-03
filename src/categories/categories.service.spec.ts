import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            categories: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns mapped categories and the total count', async () => {
    // Arrange
    const findManySpy = jest
      .spyOn(prismaService.categories, 'findMany')
      .mockResolvedValue([
        {
          category_id: 1,
          name: 't-shirts',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        },
        {
          category_id: 2,
          name: 'hoodies',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        },
      ]);
    const countSpy = jest
      .spyOn(prismaService.categories, 'count')
      .mockResolvedValue(2);

    // Act
    const result = await service.findAll(20, 0);

    // Assert — your turn. Was findMany called with
    // `where: { deleted_at: null }, take: 20, skip: 0`? Was count called
    // with the same `where`? Does result equal
    // `{ categories: [{ id: 1, name: 't-shirts' }, { id: 2, name: 'hoodies' }], total: 2 }`?
    expect(countSpy).toHaveBeenCalledWith({
      where: { deleted_at: null },
    });
    expect(result).toEqual({
      categories: [
        { id: 1, name: 't-shirts' },
        { id: 2, name: 'hoodies' },
      ],
      total: 2,
    });
    expect(findManySpy).toHaveBeenCalledWith({
      where: { deleted_at: null },
      take: 20,
      skip: 0,
    });
  });

  describe('findOne', () => {
    it('returns the mapped category when found', async () => {
      const findFirstSpy = jest
        .spyOn(prismaService.categories, 'findFirst')
        .mockResolvedValue({
          category_id: 1,
          name: 't-shirts',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        });

      const result = await service.findOne(1);

      expect(findFirstSpy).toHaveBeenCalledWith({
        where: { category_id: 1, deleted_at: null },
      });
      expect(result).toEqual({ id: 1, name: 't-shirts' });
    });

    it('throws NotFoundException when the category does not exist', async () => {
      jest.spyOn(prismaService.categories, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a category when the name is not taken', async () => {
      jest.spyOn(prismaService.categories, 'findFirst').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(prismaService.categories, 'create')
        .mockResolvedValue({
          category_id: 3,
          name: 'jackets',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        });

      const result = await service.create({ name: 'jackets' });

      expect(createSpy).toHaveBeenCalledWith({ data: { name: 'jackets' } });
      expect(result).toEqual({ id: 3, name: 'jackets' });
    });

    it('throws ConflictException when the name is already taken', async () => {
      jest.spyOn(prismaService.categories, 'findFirst').mockResolvedValue({
        category_id: 1,
        name: 't-shirts',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      });
      const createSpy = jest.spyOn(prismaService.categories, 'create');

      await expect(service.create({ name: 't-shirts' })).rejects.toThrow(
        ConflictException,
      );
      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the name when it is not taken by another category', async () => {
      jest
        .spyOn(prismaService.categories, 'findFirst')
        .mockResolvedValueOnce({
          category_id: 1,
          name: 't-shirts',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        })
        .mockResolvedValueOnce(null);
      const updateSpy = jest
        .spyOn(prismaService.categories, 'update')
        .mockResolvedValue({
          category_id: 1,
          name: 'tees',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        });

      const result = await service.update(1, { name: 'tees' });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { category_id: 1 },
        data: { name: 'tees' },
      });
      expect(result).toEqual({ id: 1, name: 'tees' });
    });

    it('throws NotFoundException when the category does not exist', async () => {
      jest.spyOn(prismaService.categories, 'findFirst').mockResolvedValue(null);
      const updateSpy = jest.spyOn(prismaService.categories, 'update');

      await expect(service.update(999, { name: 'tees' })).rejects.toThrow(
        NotFoundException,
      );
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('throws ConflictException when renaming to a name another category already has', async () => {
      jest
        .spyOn(prismaService.categories, 'findFirst')
        .mockResolvedValueOnce({
          category_id: 1,
          name: 't-shirts',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        })
        .mockResolvedValueOnce({
          category_id: 2,
          name: 'hoodies',
          created_at: null,
          updated_at: null,
          deleted_at: null,
        });
      const updateSpy = jest.spyOn(prismaService.categories, 'update');

      await expect(service.update(1, { name: 'hoodies' })).rejects.toThrow(
        ConflictException,
      );
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes the category by setting deleted_at', async () => {
      jest.spyOn(prismaService.categories, 'findFirst').mockResolvedValue({
        category_id: 1,
        name: 't-shirts',
        created_at: null,
        updated_at: null,
        deleted_at: null,
      });
      const updateSpy = jest
        .spyOn(prismaService.categories, 'update')
        .mockResolvedValue({
          category_id: 1,
          name: 't-shirts',
          created_at: null,
          updated_at: null,
          deleted_at: new Date(),
        });

      await service.remove(1);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { category_id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
    });

    it('throws NotFoundException when the category does not exist', async () => {
      jest.spyOn(prismaService.categories, 'findFirst').mockResolvedValue(null);
      const updateSpy = jest.spyOn(prismaService.categories, 'update');

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
