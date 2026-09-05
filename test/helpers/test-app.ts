import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module';

export async function createTestApp(
  options: { disableThrottling?: boolean } = {},
): Promise<INestApplication> {
  const { disableThrottling = true } = options;

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  // Every test in a file shares one in-memory rate-limit counter for the
  // whole 60s window (they all hit the same running app), so an unrelated
  // test's earlier signin/signup call can silently 429 a later one. Off by
  // default; the one test actually about rate-limiting opts back in with
  // its own separate app instance.
  // ThrottlerGuard is registered globally via APP_GUARD, which
  // overrideGuard()/overrideProvider() can't reliably intercept (a known
  // NestJS testing limitation for APP_GUARD/APP_FILTER/APP_INTERCEPTOR
  // multi-tokens). Overriding its own storage dependency instead -- a
  // normal single-token provider -- works: every check reports zero
  // prior hits, so the real guard logic runs but never blocks anything.
  if (disableThrottling) {
    moduleBuilder.overrideProvider(ThrottlerStorage).useValue({
      increment: () =>
        Promise.resolve({
          totalHits: 0,
          timeToExpire: 0,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
    });
  }

  const moduleFixture: TestingModule = await moduleBuilder.compile();

  const app = moduleFixture.createNestApplication({ rawBody: true });

  // Must match main.ts's global pipe exactly — this is the step the
  // guidelines call out as easy to forget, and it's why a request that
  // works in production could pass here for the wrong reason.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}
