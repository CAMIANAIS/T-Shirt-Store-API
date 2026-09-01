import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn(),
            createPayment: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to OrdersService.create with userId.sub and the body', async () => {
    // Arrange
    const dto = {
      shippingAddress: {
        street1: '123 Main St',
        street2: 'Apt 4B',
        city: 'Springfield',
        postalCode: '12345',
        state: 'IL',
        country: 'USA',
      },
    };
    const mockOrder = { id: 1, userId: 7, totalAmount: 5000, items: [] };
    const createSpy = jest
      .spyOn(ordersService, 'create')
      .mockResolvedValue(mockOrder as any);

    // Act
    const result = await controller.create({ sub: 7 }, dto);

    // Assert — your turn. Was `create` called with (7, dto) — note
    // it's userId.sub, not the whole JwtPayload object? Does the
    // controller return exactly what the service returned?
    expect(createSpy).toHaveBeenCalledWith(7, dto);
    expect(result).toEqual(mockOrder);
  });

  it('createPayment delegates to OrdersService.createPayment with userId.sub, orderId, and the body', async () => {
    // Arrange
    const dto = { paymentMethod: 'card' };
    const mockResult = {
      intentId: 'pi_123',
      clientSecret: 'fake-client-token-for-tests',
      amount: 5000,
      currency: 'usd',
    };
    const paymentSpy = jest
      .spyOn(ordersService, 'createPayment')
      .mockResolvedValue(mockResult);

    // Act
    const result = await controller.createPayment({ sub: 7 }, 1, dto);

    // Assert — your turn. Was `createPayment` called with (7, 1, dto)?
    // Does the controller return exactly what the service returned?
    expect(paymentSpy).toHaveBeenCalledWith(7, 1, dto);
    expect(result).toEqual(mockResult);
  });
});
