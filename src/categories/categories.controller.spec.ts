import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';

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
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  it('create delegates to CategoriesService.create', async () => {
    const createSpy = jest
      .spyOn(categoriesService, 'create')
      .mockResolvedValue({ id: 1, name: 'jackets' });

    const result = await controller.create({ name: 'jackets' });

    expect(createSpy).toHaveBeenCalledWith({ name: 'jackets' });
    expect(result).toEqual({ id: 1, name: 'jackets' });
  });

  it('update delegates to CategoriesService.update', async () => {
    const updateSpy = jest
      .spyOn(categoriesService, 'update')
      .mockResolvedValue({ id: 1, name: 'tees' });

    const result = await controller.update(1, { name: 'tees' });

    expect(updateSpy).toHaveBeenCalledWith(1, { name: 'tees' });
    expect(result).toEqual({ id: 1, name: 'tees' });
  });

  it('remove delegates to CategoriesService.remove', async () => {
    const removeSpy = jest
      .spyOn(categoriesService, 'remove')
      .mockResolvedValue(undefined);

    await controller.remove(1);

    expect(removeSpy).toHaveBeenCalledWith(1);
  });
});
