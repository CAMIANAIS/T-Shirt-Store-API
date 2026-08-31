import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { JWTAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JWTAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('signIn delegates to AuthService.signIn with email and password', async () => {
    // Arrange
    const mockTokens = { access_token: 'a', refresh_token: 'b' };
    const signInSpy = jest
      .spyOn(authService, 'signIn')
      .mockResolvedValue(mockTokens);

    // Act
    const result = await controller.signIn({
      email: 'a@b.com',
      password: 'secret123',
    });

    // Assert — your turn. Was signIn called with ('a@b.com', 'secret123')
    // — two separate args, not the whole DTO object? Does result equal
    // mockTokens?
    expect(signInSpy).toHaveBeenCalledWith('a@b.com', 'secret123');
    expect(result).toEqual(mockTokens);
  });

  it('signUp delegates to AuthService.signUp with the whole dto', async () => {
    // Arrange
    const mockTokens = { access_token: 'a', refresh_token: 'b' };
    const signUpSpy = jest
      .spyOn(authService, 'signUp')
      .mockResolvedValue(mockTokens);
    const dto = {
      username: 'newuser',
      email: 'a@b.com',
      password: 'secret123',
    };

    // Act
    const result = await controller.signUp(dto);

    // Assert — your turn. Was signUp called with the whole dto object this
    // time (not split into separate args, unlike signIn)? Does result
    // equal mockTokens?
    expect(signUpSpy).toHaveBeenCalledWith(dto);
    expect(result).toBe(mockTokens);
  });

  it('signOut delegates to AuthService.signOut with the current user id and token', async () => {
    // Arrange
    const signOutSpy = jest
      .spyOn(authService, 'signOut')
      .mockResolvedValue(undefined);

    // Act
    const result = await controller.signOut(
      { sub: 5 },
      { token: 'refresh-token-value' },
    );

    // Assert — your turn. Was signOut called with (5, 'refresh-token-value')
    // — the user's sub from the token, not from the body?
    expect(signOutSpy).toHaveBeenCalledWith(5, 'refresh-token-value');
    expect(result).toEqual(undefined);
  });

  it('forgotPassword delegates to AuthService.forgotPassword with the email', async () => {
    // Arrange
    const forgotPasswordSpy = jest
      .spyOn(authService, 'forgotPassword')
      .mockResolvedValue(undefined);

    // Act
    const result = await controller.forgotPassword({ email: 'a@b.com' });

    // Assert — your turn. Was forgotPassword called with just the email
    // string 'a@b.com', not the whole dto?
    expect(forgotPasswordSpy).toHaveBeenCalledWith('a@b.com');
    expect(result).toBeUndefined();
  });

  it('resetPassword delegates to AuthService.resetPassword with token and newPassword', async () => {
    // Arrange
    const resetPasswordSpy = jest
      .spyOn(authService, 'resetPassword')
      .mockResolvedValue(undefined);

    // Act
    const result = await controller.resetPassword({
      token: 'reset-token-value',
      newPassword: 'newSecret123',
    });

    // Assert — your turn. Was resetPassword called with
    // ('reset-token-value', 'newSecret123') as two separate args?
    expect(resetPasswordSpy).toHaveBeenCalledWith(
      'reset-token-value',
      'newSecret123',
    );
    expect(result).toBeUndefined();
  });
});
