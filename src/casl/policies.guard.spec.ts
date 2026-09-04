import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PoliciesGuard } from './policies.guard';
import { CaslAbilityFactory } from './casl-ability.factory';

function createMockContext(user?: unknown): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({ name: 'testHandler' }),
    getClass: () => ({ name: 'TestController' }),
  } as unknown as ExecutionContext;
}

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: Reflector;
  let caslAbilityFactory: CaslAbilityFactory;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as Reflector;
    caslAbilityFactory = {
      createForUser: jest.fn(),
    };
    guard = new PoliciesGuard(reflector, caslAbilityFactory);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('throws when no @CheckPolicies decorator is present at all (fail closed, not open)', () => {
    // Arrange — this is the exact bug that got fixed: reflector.get()
    // returns undefined when a route has no @CheckPolicies().
    (reflector.get as jest.Mock).mockReturnValue(undefined);
    const context = createMockContext({ sub: 1, role: 'client' });

    // Act
    const act = () => guard.canActivate(context);

    // Assert — your turn. See policies.guard.ts:29-33 — what does it throw,
    // and does it ever return `false` or `true` instead?
    expect(act).toThrow(Error);
  });

  it('throws when @CheckPolicies was given an empty handler array', () => {
    // Arrange — same fail-closed path, but reflector.get() returns [] this
    // time instead of undefined. Both must be rejected, not just one.
    (reflector.get as jest.Mock).mockReturnValue([]);
    const context = createMockContext({ sub: 1, role: 'client' });

    // Act
    const act = () => guard.canActivate(context);

    // Assert — your turn.
    expect(act).toThrow(Error);
  });

  it('throws UnauthorizedException when there is no user on the request', () => {
    // Arrange
    (reflector.get as jest.Mock).mockReturnValue([() => true]);
    const context = createMockContext(undefined);

    // Act
    const act = () => guard.canActivate(context);

    // Assert — your turn. What specific exception type?
    expect(act).toThrow(UnauthorizedException);
  });

  it('returns true when every policy handler allows the action', () => {
    // Arrange
    const handlerA = jest.fn().mockReturnValue(true);
    const handlerB = jest.fn().mockReturnValue(true);
    (reflector.get as jest.Mock).mockReturnValue([handlerA, handlerB]);
    const mockAbility = { can: jest.fn() };
    (caslAbilityFactory.createForUser as jest.Mock).mockReturnValue(
      mockAbility,
    );
    const context = createMockContext({ sub: 1, role: 'client' });

    // Act
    const result = guard.canActivate(context);

    // Assert — your turn. Was each handler called with `mockAbility`? Is
    // the guard's overall result `true`?
    expect(handlerA).toHaveBeenCalledWith(mockAbility);
    expect(handlerB).toHaveBeenCalledWith(mockAbility);
    expect(result).toBe(true);
  });

  it('returns false when any policy handler denies the action', () => {
    // Arrange
    const handlerA = jest.fn().mockReturnValue(true);
    const handlerB = jest.fn().mockReturnValue(false);
    (reflector.get as jest.Mock).mockReturnValue([handlerA, handlerB]);
    (caslAbilityFactory.createForUser as jest.Mock).mockReturnValue({});
    const context = createMockContext({ sub: 1, role: 'client' });

    // Act
    const result = guard.canActivate(context);

    // Assert — your turn.
    expect(result).toBe(false);
  });

  it('supports an object-style policy handler (a .handle() method, not just a plain function)', () => {
    // Arrange — see policies.guard.ts:46-51, execPolicyHandler branches on
    // typeof handler === 'function' vs an { handle(ability) } object.
    const objectHandler = { handle: jest.fn().mockReturnValue(true) };
    (reflector.get as jest.Mock).mockReturnValue([objectHandler]);
    const mockAbility = { can: jest.fn() };
    (caslAbilityFactory.createForUser as jest.Mock).mockReturnValue(
      mockAbility,
    );
    const context = createMockContext({ sub: 1, role: 'client' });

    // Act
    const result = guard.canActivate(context);

    // Assert — your turn. Was `.handle()` called with `mockAbility`?
    expect(objectHandler.handle).toHaveBeenCalledWith(mockAbility);
    expect(result).toBe(true);
  });
});
