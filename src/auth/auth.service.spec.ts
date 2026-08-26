import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: { userByEmail: jest.fn(), createUser: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            roles: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('signIn should return an access token with valid credentials', async () => {
    // Arrange
    const plainPassword = 'test123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const mockUser = {
      user_id: 1,
      email: 'test@example.com',
      password_hash: hashedPassword,
    };
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    (usersService.userByEmail as jest.Mock).mockResolvedValue(mockUser);
    (jwtService.signAsync as jest.Mock).mockResolvedValue(mockToken);

    // Act
    const result = await service.signIn(mockUser.email, plainPassword);

    // 1. does `result` match that shape, using mockToken?
    // 2. was userByEmail called with the right email?
    // 3. was signAsync called with the payload signIn actually builds?
    expect(result).toEqual({ access_token: mockToken });
    expect(usersService.userByEmail).toHaveBeenCalledWith('test@example.com');
    expect(jwtService.signAsync).toHaveBeenCalled();
  });

  // signIn cases
  it('signIn should throw UnauthorizedException with wrong password', async () => {
    // Arrange
    const plainPassword = 'test123';
    const wrongPassword = 'wrongpassword';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const mockUser = {
      user_id: 1,
      email: 'test@example.com',
      password_hash: hashedPassword,
    };

    (usersService.userByEmail as jest.Mock).mockResolvedValue(mockUser);

    // Act & Assert
    await expect(
      service.signIn('test@example.com', wrongPassword),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('signIn should throw UnauthorizedException with unknown email', async () => {
    // Arrange
    (usersService.userByEmail as jest.Mock).mockResolvedValue(null);

    // Act & Assert
    await expect(
      service.signIn('unknown@example.com', 'anypassword'),
    ).rejects.toThrow(UnauthorizedException);
  });

  // signUp cases
  it('signUp should create user and return an access token', async () => {
    const dto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'test123',
      birthdate: '1998-04-12',
    };
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const clientRole = { role_id: 1, name: 'client' };
    const newUser = {
      user_id: 1,
      username: dto.username,
      email: dto.email,
    };

    (usersService.userByEmail as jest.Mock).mockResolvedValue(null);
    (prismaService.roles.findUnique as jest.Mock).mockResolvedValue(clientRole);
    (usersService.createUser as jest.Mock).mockResolvedValue(newUser);
    (jwtService.signAsync as jest.Mock).mockResolvedValue(mockToken);

    const result = await service.signUp(dto);

    expect(result).toEqual({ access_token: mockToken });
    expect(usersService.createUser).toHaveBeenCalledWith(
      dto.email,
      dto.username,
      expect.any(String),
      clientRole.role_id,
      dto.birthdate,
    );
  });

  it('signUp should throw ConflictException when email already exists', async () => {
    // Arrange
    const dto = {
      email: 'existing@example.com',
      username: 'someone',
      password: 'password123',
    };
    const existingUser = {
      user_id: 1,
      email: dto.email,
      password_hash: 'hashedpassword',
    };

    (usersService.userByEmail as jest.Mock).mockResolvedValue(existingUser);

    // Act & Assert
    await expect(service.signUp(dto)).rejects.toThrow(ConflictException);
  });
});
