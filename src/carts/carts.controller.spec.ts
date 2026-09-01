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
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            clearCart: jest.fn(),
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

  it('updateItem delegates to CartsService.updateItem with user id, itemId, and quantity', async () => {
    // Arrange
    const mockLineItem = {
      id: 10,
      productVariantId: 42,
      quantity: 7,
      priceAtPurchase: 1500,
      subtotal: 10500,
    };
    const updateItemSpy = jest
      .spyOn(cartsService, 'updateItem')
      .mockResolvedValue(mockLineItem);

    // Act
    const result = await controller.updateItem({ sub: 5 }, { quantity: 7 }, 10);

    // Assert — your turn. Was updateItem called with (5, 10, 7) — three
    // separate args, not the whole dto object? Does result equal
    // mockLineItem?
    expect(updateItemSpy).toHaveBeenCalledWith(5, 10, 7);
    expect(result).toEqual(mockLineItem);
  });

  it('removeItem delegates to CartsService.removeItem with user id and itemId', async () => {
    // Arrange
    const removeItemSpy = jest
      .spyOn(cartsService, 'removeItem')
      .mockResolvedValue(undefined);

    // Act
    await controller.removeItem(10, { sub: 5 });

    // Assert — your turn. Was removeItem called with (5, 10)?
    expect(removeItemSpy).toHaveBeenCalledWith(5, 10);
  });

  it('clearCart delegates to CartsService.clearCart with the current user id', async () => {
    // Arrange
    const clearCartSpy = jest
      .spyOn(cartsService, 'clearCart')
      .mockResolvedValue(undefined);

    // Act
    await controller.clearCart({ sub: 5 });

    // Assert — your turn. Was clearCart called with 5?
    expect(clearCartSpy).toHaveBeenCalledWith(5);
  });
});
