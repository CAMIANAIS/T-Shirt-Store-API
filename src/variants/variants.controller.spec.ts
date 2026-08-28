import { Test, TestingModule } from '@nestjs/testing';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('VariantsController', () => {
  let controller: VariantsController;
  let variantsService: VariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [
        {
          provide: VariantsService,
          useValue: {
            findByProductId: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VariantsController>(VariantsController);
    variantsService = module.get<VariantsService>(VariantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findByProductId delegates to VariantsService.findByProductId', async () => {
    // Arrange
    const mockVariants = [{ productVariantId: 1, size: 'M' }];
    const findSpy = jest
      .spyOn(variantsService, 'findByProductId')
      .mockResolvedValue(mockVariants as any);

    // Act
    const result = await controller.findByProductId(5, 10, 0);

    // Assert — your turn. Was findByProductId called with (5, 10, 0)? Does
    // the controller return exactly what the service returned?
    expect(result).toEqual(mockVariants);
    expect(findSpy).toHaveBeenCalled();
  });

  it('create delegates to VariantsService.create with productId and body', async () => {
    // Arrange
    const dto = {
      size: 'M',
      color: 'red',
      stockQuantity: 10,
      skuCode: 'TSH-RED-MD',
    };
    const mockCreated = { productVariantId: 1, ...dto };
    const createSpy = jest
      .spyOn(variantsService, 'create')
      .mockResolvedValue(mockCreated as any);

    // Act
    const result = await controller.create(5, dto);

    // Assert — your turn. Was create called with (5, dto)? Does the
    // controller return exactly what the service returned?
    expect(result).toEqual(mockCreated);
    expect(createSpy).toHaveBeenCalled();
  });

  it('update delegates to VariantsService.update with productId, variantId, and body', async () => {
    // Arrange
    const dto = { stockQuantity: 20 };
    const mockUpdated = { productVariantId: 1, stockQuantity: 20 };
    const updateSpy = jest
      .spyOn(variantsService, 'update')
      .mockResolvedValue(mockUpdated as any);

    // Act
    const result = await controller.update(5, 1, dto);

    // Assert — your turn. Was update called with (5, 1, dto)? Does the
    // controller return exactly what the service returned?
    expect(result).toEqual(mockUpdated);
    expect(updateSpy).toHaveBeenCalled();
  });
});
