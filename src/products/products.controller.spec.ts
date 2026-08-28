import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    productsService = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to ProductsService.findAll with the query params', async () => {
    // Arrange
    const mockProducts = [{ productId: 1, name: 'summer-tshirt' }];
    const findAllSpy = jest
      .spyOn(productsService, 'findAll')
      .mockResolvedValue(mockProducts as any);

    // Act
    const result = await controller.findAll(5, 10, 20);

    // Assert — your turn. Was findAll called with (5, 10, 20)? Does the
    // controller return exactly what the service returned?
    expect(findAllSpy).toHaveBeenCalled();
    expect(result).toEqual(mockProducts);
  });

  it('create delegates to ProductsService.create with the request body', async () => {
    // Arrange
    const dto = {
      name: 'summer-tshirt',
      description: 'long sleeves, 100% cotton',
      status: 'active',
      categoryId: 5,
    };
    const mockCreated = { productId: 1, ...dto };
    const createSpy = jest
      .spyOn(productsService, 'create')
      .mockResolvedValue(mockCreated as any);

    // Act
    const result = await controller.create(dto as any);

    // Assert — your turn. Was create called with dto? Does the controller
    // return exactly what the service returned?
    expect(createSpy).toHaveBeenCalled();

    expect(result).toEqual(mockCreated);
  });

  it('findOne delegates to ProductsService.findOne with the productId param', async () => {
    // Arrange
    const mockProduct = { productId: 1, name: 'summer-tshirt' };
    const findOneSpy = jest
      .spyOn(productsService, 'findOne')
      .mockResolvedValue(mockProduct as any);

    // Act
    const result = await controller.findOne(1);

    // Assert — your turn. Was findOne called with 1? Does the controller
    // return exactly what the service returned?
    expect(findOneSpy).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockProduct);
  });

  it('update delegates to ProductsService.update with productId and body', async () => {
    // Arrange
    const dto = { name: 'winter-tshirt' };
    const mockUpdated = { productId: 1, name: dto.name };
    const updateSpy = jest
      .spyOn(productsService, 'update')
      .mockResolvedValue(mockUpdated as any);

    // Act
    const result = await controller.update(1, dto as any);

    // Assert — your turn. Was update called with (1, dto)? Does the
    // controller return exactly what the service returned?
    expect(result).toEqual(mockUpdated);
    expect(updateSpy).toHaveBeenCalledWith(1, dto);
  });

  it('remove delegates to ProductsService.remove with the productId param', async () => {
    // Arrange
    const removeSpy = jest
      .spyOn(productsService, 'remove')
      .mockResolvedValue(undefined);

    // Act
    const result = await controller.remove(1);

    // Assert — your turn. Was remove called with 1? Does the controller
    // return undefined (matches remove's Promise<void>)?
    expect(removeSpy).toHaveBeenCalledWith(1);
    expect(result).toBeUndefined();
  });
});
