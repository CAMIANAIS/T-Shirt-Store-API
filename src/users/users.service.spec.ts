import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            users: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('userByEmail should return user when found', async () => {
    const mockUser = {
      user_id: 1,
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hash',
      role_id: 1,
    };
    (prismaService.users.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.userByEmail('test@example.com');

    expect(result).toEqual(mockUser);
    expect(prismaService.users.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('userByEmail should return null when not found', async () => {
    (prismaService.users.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.userByEmail('unknown@example.com');

    expect(result).toBeNull();
  });

  it('createUser should create and return user', async () => {
    const mockUser = {
      user_id: 1,
      email: 'new@example.com',
      username: 'newuser',
      password_hash: 'hash',
      role_id: 2,
      birthdate: '2000-01-01',
    };
    (prismaService.users.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.createUser(
      'new@example.com',
      'newuser',
      'hash',
      2,
      '2000-01-01',
    );

    expect(result).toEqual(mockUser);
    expect(prismaService.users.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        username: 'newuser',
        password_hash: 'hash',
        role_id: 2,
        birthdate: '2000-01-01',
      },
    });
  });
});
