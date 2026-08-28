import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from 'generated/prisma/browser';

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
            auth_tokens: {
              create: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            users: {
              update: jest.fn(),
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

    expect(result).toEqual({
      access_token: mockToken,
      refresh_token: expect.any(String),
    });
    expect(usersService.userByEmail).toHaveBeenCalledWith('test@example.com');
    expect(jwtService.signAsync).toHaveBeenCalled();
  });

  it("signIn includes the user's role name in the JWT payload", async () => {
    // Arrange
    const plainPassword = 'test123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const mockUser = {
      user_id: 1,
      email: 'test@example.com',
      password_hash: hashedPassword,
      role_id: 2,
    };
    const mockRole = { role_id: 2, name: 'manager' };
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    (usersService.userByEmail as jest.Mock).mockResolvedValue(mockUser);
    (prismaService.roles.findUnique as jest.Mock).mockResolvedValue(mockRole);
    const signAsyncSpy = jest
      .spyOn(jwtService, 'signAsync')
      .mockResolvedValue(mockToken);

    // Act
    await service.signIn(mockUser.email, plainPassword);

    // Assert — your turn. Was prismaService.roles.findUnique called with
    // { where: { role_id: 2 } }? Was jwtService.signAsync called with a
    // payload that includes `role: 'manager'`?
    expect(signAsyncSpy).toHaveBeenCalledWith({
      sub: 1,
      email: 'test@example.com',
      role: 'manager',
    });
    expect(prismaService.roles.findUnique).toHaveBeenCalledWith({
      where: {
        role_id: 2,
      },
    });
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

    expect(result).toEqual({
      access_token: mockToken,
      refresh_token: expect.any(String),
    });
    expect(usersService.createUser).toHaveBeenCalledWith(
      dto.email,
      dto.username,
      expect.any(String),
      clientRole.role_id,
      dto.birthdate,
    );
  });

  it('signUp should throw ConflictException when email already exists', async () => {
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

  // forgotPassword cases
  it('forgotPassword creates a reset token when the user exists', async () => {
    // Arrange
    const mockUser = { user_id: 1, email: 'test@example.com' };
    (usersService.userByEmail as jest.Mock).mockResolvedValue(mockUser);

    const createSpy = jest
      .spyOn(prismaService.auth_tokens, 'create')
      .mockResolvedValue({
        token_id: 1,
        user_id: 1,
        token_hash: expect.any(String),
        type: 'reset',
        revoked: false,
        expires_at: expect.any(Date),
        jti: null,
        ip_address: null,
        user_agent: null,
        created_at: expect.any(Date),
      });

    // Act
    await service.forgotPassword(mockUser.email);

    // Assert — your turn. Was auth_tokens.create called? With what shape
    // (user_id, type: 'reset')? Check the `data` argument it was called with.
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        user_id: mockUser.user_id,
        token_hash: expect.any(String),
        type: 'reset',
        revoked: false,
        expires_at: expect.any(Date),
      },
    });
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('forgotPassword does nothing when the email is unknown, but does not throw', async () => {
    // Arrange
    (usersService.userByEmail as jest.Mock).mockResolvedValue(null);
    const createSpy = jest.spyOn(prismaService.auth_tokens, 'create');
    // Act
    const act = service.forgotPassword('unknown@example.com');

    // Assert — your turn. Does it reject? Was auth_tokens.create called?
    await expect(act).resolves.toBeUndefined();
    expect(createSpy).not.toHaveBeenCalled();
  });

  // resetPassword cases
  it('resetPassword updates the password and revokes the token when valid', async () => {
    // Arrange
    const mockResetToken = {
      user_id: 1,
      token_hash: 'irrelevant-here',
      type: 'reset',
      revoked: false,
    };
    (prismaService.auth_tokens.findFirst as jest.Mock).mockResolvedValue(
      mockResetToken,
    );
    const updateUserSpy = jest
      .spyOn(prismaService.users, 'update')
      .mockResolvedValue({} as Prisma.usersModel);
    const updateTokenSpy = jest
      .spyOn(prismaService.auth_tokens, 'update')
      .mockResolvedValue({} as Prisma.auth_tokensModel);
    // Act
    await service.resetPassword('some-reset-token', 'newPassword123');

    // Assert — your turn. Was users.update called with the right user_id?
    // Was auth_tokens.update called to set revoked: true?
    expect(updateUserSpy).toHaveBeenNthCalledWith(1, {
      where: { user_id: mockResetToken.user_id },
      data: { password_hash: expect.any(String) },
    });
    expect(updateTokenSpy).toHaveBeenNthCalledWith(1, {
      where: {
        token_hash: expect.any(String), // hashed version of 'some-reset-token'
        user_id: mockResetToken.user_id,
      },
      data: { revoked: true },
    });
  });

  it('resetPassword throws when the token is missing, expired, or revoked', async () => {
    // Arrange
    (prismaService.auth_tokens.findFirst as jest.Mock).mockResolvedValue(null);
    const updateUsersSpy = jest.spyOn(prismaService.users, 'update');
    // Act
    const act = service.resetPassword('bad-token', 'newPassword123');

    // Assert — your turn. Should reject with UnauthorizedException. Also:
    // should users.update have been called in this case?
    await expect(act).rejects.toThrow(UnauthorizedException);
    expect(updateUsersSpy).not.toHaveBeenCalled();
  });
});
