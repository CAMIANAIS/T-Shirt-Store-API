import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWTAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';
function createMockContext(authHeader?: string): ExecutionContext {
  const request = {
    headers: {
      authorization: authHeader,
    },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}
interface RequestWithUser extends Request {
  user?: unknown;
}

describe('JWTAuthGuard', () => {
  let guard: JWTAuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() } as unknown as JwtService;
    guard = new JWTAuthGuard(jwtService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('allows the request through with a valid token', async () => {
    const mockPayload = { sub: 1, email: 'test@example.com' };
    const context = createMockContext('Bearer valid.jwt.token');
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

    const result = await guard.canActivate(context);
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    // Assert What should `result` be? What should have
    // ended up on the request's `user` field? (hint: you'll need to pull
    // the request back out of `context.switchToHttp().getRequest()` to check it)
    expect(result).toEqual(true);
    expect(request.user).toEqual(mockPayload);
  });

  it('throws when the authorization header is missing', async () => {
    const context = createMockContext(undefined);

    const act = guard.canActivate(context);

    await expect(act).rejects.toThrow(
      new UnauthorizedException('Missing authorization header'),
    );
  });

  it('throws when the header has no "Bearer" prefix', async () => {
    const context = createMockContext('eyJhbGc.some.token');

    const act = guard.canActivate(context);

    await expect(act).rejects.toThrow(
      new UnauthorizedException('Invalid authorization header format'),
    );
  });

  it('throws when the header has the wrong number of parts', async () => {
    const context = createMockContext('Bearer');

    const act = guard.canActivate(context);

    await expect(act).rejects.toThrow(
      new UnauthorizedException('Invalid authorization header format'),
    );
  });

  it('throws when verifyAsync rejects', async () => {
    const context = createMockContext('Bearer some.jwt.token');
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new Error('jwt expired'),
    );

    const act = guard.canActivate(context);

    await expect(act).rejects.toThrow(
      new UnauthorizedException('Invalid or expired token'),
    );
  });
});
