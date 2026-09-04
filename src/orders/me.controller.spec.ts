import { Test, TestingModule } from '@nestjs/testing';
import { MeController } from './me.controller';
import { OrdersService } from './orders.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { OrderParamsDto } from './dto/orderParams.dto';

describe('MeController', () => {
  let controller: MeController;
  let ordersService: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            getOrders: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MeController>(MeController);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyOrders delegates to OrdersService.getOrders with the query dto and the current user id', async () => {
    // Arrange
    const mockOrders = [{ order_id: 1, user_id: 5 }] as any;
    const getOrdersSpy = jest
      .spyOn(ordersService, 'getOrders')
      .mockResolvedValue(mockOrders);
    const dto: OrderParamsDto = { status: 'paid' };

    // Act
    const result = await controller.getMyOrders({ sub: 5 } as never, dto);

    // Assert — your turn. Look at me.controller.ts:41-43: getOrders is
    // called with (dto, userId.sub) — was it called with (dto, 5), not the
    // whole user object? Does result equal mockOrders?
    expect(getOrdersSpy).toHaveBeenCalledWith(dto, 5);
    expect(result).toEqual(mockOrders);
  });
});
