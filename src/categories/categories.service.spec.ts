import { Test, TestingModule } from '@nestjs/testing';
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
});
