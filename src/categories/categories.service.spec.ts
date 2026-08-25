import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockPrismaService = {
    categories: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, name: 't-shirts' },
        { id: 2, name: 'hoodies' },
      ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return category names', async () => {
    const result = await service.findAll();
    expect(result).toEqual(['t-shirts', 'hoodies']);
    expect(mockPrismaService.categories.findMany).toHaveBeenCalled();
  });
});
