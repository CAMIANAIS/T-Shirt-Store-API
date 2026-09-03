import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
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

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to UsersService.findAll', async () => {
    const findAllSpy = jest
      .spyOn(usersService, 'findAll')
      .mockResolvedValue([]);

    await controller.findAll(20, 0);

    expect(findAllSpy).toHaveBeenCalledWith(20, 0);
  });

  it('findOne delegates to UsersService.findOne', async () => {
    const findOneSpy = jest
      .spyOn(usersService, 'findOne')
      .mockResolvedValue({} as any);

    await controller.findOne(1);

    expect(findOneSpy).toHaveBeenCalledWith(1);
  });

  it('remove delegates to UsersService.remove', async () => {
    const removeSpy = jest
      .spyOn(usersService, 'remove')
      .mockResolvedValue(undefined);

    await controller.remove(1);

    expect(removeSpy).toHaveBeenCalledWith(1);
  });
});
