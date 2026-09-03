import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
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
    (prismaService.users.findFirst as jest.Mock).mockResolvedValue(mockUser);

    const result = await service.userByEmail('test@example.com');

    expect(result).toEqual(mockUser);
    expect(prismaService.users.findFirst).toHaveBeenCalledWith({
      where: { email: 'test@example.com', deleted_at: null },
    });
  });

  it('userByEmail should return null when not found', async () => {
    (prismaService.users.findFirst as jest.Mock).mockResolvedValue(null);

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
        birthdate: new Date('2000-01-01'),
        carts: {
          create: {},
        },
      },
    });
  });

  const mockRow = (overrides = {}) => ({
    user_id: 1,
    username: 'testuser',
    email: 'test@example.com',
    birthdate: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    deleted_at: null,
    role_id: 2,
    roles: { role_id: 2, name: 'client' },
    ...overrides,
  });

  describe('findAll', () => {
    it('returns mapped users, excluding soft-deleted ones', async () => {
      const findManySpy = jest
        .spyOn(prismaService.users, 'findMany')
        .mockResolvedValue([mockRow()]);

      const result = await service.findAll(20, 0);

      expect(findManySpy).toHaveBeenCalledWith({
        where: { deleted_at: null },
        include: { roles: true },
        take: 20,
        skip: 0,
      });
      expect(result).toEqual([
        {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          birthdate: null,
          role: 'client',
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('returns the mapped user when found', async () => {
      jest.spyOn(prismaService.users, 'findFirst').mockResolvedValue(mockRow());

      const result = await service.findOne(1);

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        birthdate: null,
        role: 'client',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      jest.spyOn(prismaService.users, 'findFirst').mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOwnProfile', () => {
    it('updates username and birthdate when the username is free', async () => {
      jest.spyOn(prismaService.users, 'findFirst').mockResolvedValue(null);
      const updateSpy = jest
        .spyOn(prismaService.users, 'update')
        .mockResolvedValue(mockRow({ username: 'newname' }));

      const result = await service.updateOwnProfile(1, {
        username: 'newname',
        birthdate: '2000-01-01',
      });

      expect(updateSpy).toHaveBeenCalledWith({
        where: { user_id: 1 },
        data: { username: 'newname', birthdate: new Date('2000-01-01') },
        include: { roles: true },
      });
      expect(result.username).toBe('newname');
    });

    it('throws ConflictException when the username is already taken', async () => {
      jest
        .spyOn(prismaService.users, 'findFirst')
        .mockResolvedValue(mockRow({ user_id: 2 }));
      const updateSpy = jest.spyOn(prismaService.users, 'update');

      await expect(
        service.updateOwnProfile(1, { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes the user', async () => {
      jest.spyOn(prismaService.users, 'findFirst').mockResolvedValue(mockRow());
      const updateSpy = jest
        .spyOn(prismaService.users, 'update')
        .mockResolvedValue(mockRow({ deleted_at: new Date() }));

      await service.remove(1);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { user_id: 1 },
        data: { deleted_at: expect.any(Date) },
      });
    });

    it('throws NotFoundException when the user does not exist', async () => {
      jest.spyOn(prismaService.users, 'findFirst').mockResolvedValue(null);
      const updateSpy = jest.spyOn(prismaService.users, 'update');

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(updateSpy).not.toHaveBeenCalled();
    });
  });
});
