import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let categoriesService: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    categoriesService = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to CategoriesService.findAll and sets X-TotalCount', async () => {
    // Arrange
    const mockCategories = [{ id: 1, name: 't-shirts' }];
    const findAllSpy = jest
      .spyOn(categoriesService, 'findAll')
      .mockResolvedValue({ categories: mockCategories, total: 1 });
    const setSpy = jest.fn();
    const mockRes = { set: setSpy } as any;

    // Act
    const result = await controller.findAll(20, 0, mockRes);

    // Assert — your turn. Was findAll called with (20, 0)? Does result
    // equal mockCategories? Was res.set called with
    // ('X-TotalCount', '1')?
    expect(result).toEqual(mockCategories);
    expect(findAllSpy).toHaveBeenCalledWith(20, 0);
    expect(setSpy).toHaveBeenCalledWith('X-TotalCount', '1');
  });
});
