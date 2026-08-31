import { Test, TestingModule } from '@nestjs/testing';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';

describe('CartsController', () => {
  let controller: CartsController;
  let cartsService: CartsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartsController],
      providers: [
        {
          provide: CartsService,
          useValue: {
            getCart: jest.fn(),
            addItem: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartsController>(CartsController);
    cartsService = module.get<CartsService>(CartsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getCart delegates to CartsService.getCart with the current user id', async () => {
    // Arrange
    const mockCart = { id: 1, userId: 5, items: [] };
    const getCartSpy = jest
      .spyOn(cartsService, 'getCart')
      .mockResolvedValue(mockCart);

    // Act
    const result = await controller.getCart({ sub: 5 });

    // Assert — your turn. Was getCart called with 5 (user.sub), not the
    // whole user object? Does result equal mockCart?
    expect(getCartSpy).toHaveBeenCalledWith(5);
    expect(result).toEqual(mockCart);
  });

  it('addItem delegates to CartsService.addItem with the current user id and dto', async () => {
    // Arrange
    const mockCart = { id: 1, userId: 5, items: [] };
    const addItemSpy = jest
      .spyOn(cartsService, 'addItem')
      .mockResolvedValue(mockCart);
    const dto = { productVariantId: 42, quantity: 3 };

    // Act
    const result = await controller.addItem({ sub: 5 }, dto);

    // Assert — your turn. Was addItem called with (5, dto)? Does result
    // equal mockCart?
    expect(addItemSpy).toHaveBeenCalledWith(5, dto);
    expect(result).toEqual(mockCart);
  });
});
