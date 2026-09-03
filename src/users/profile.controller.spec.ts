import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { UsersService } from './users.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ProfileController', () => {
  let controller: ProfileController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            updateOwnProfile: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProfileController>(ProfileController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMe delegates to UsersService.findOne with the caller id', async () => {
    const findOneSpy = jest
      .spyOn(usersService, 'findOne')
      .mockResolvedValue({} as any);

    await controller.getMe({ sub: 7 });

    expect(findOneSpy).toHaveBeenCalledWith(7);
  });

  it('updateMe delegates to UsersService.updateOwnProfile with the caller id', async () => {
    const updateSpy = jest
      .spyOn(usersService, 'updateOwnProfile')
      .mockResolvedValue({} as any);

    await controller.updateMe({ sub: 7 }, { username: 'newname' });

    expect(updateSpy).toHaveBeenCalledWith(7, { username: 'newname' });
  });
});
