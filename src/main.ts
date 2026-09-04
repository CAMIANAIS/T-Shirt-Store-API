import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) =>
    error.constraints
      ? Object.values(error.constraints)
      : flattenValidationErrors(error.children ?? []),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  // Without this, SIGTERM/SIGINT never trigger onModuleDestroy/onApplicationShutdown,
  // so PrismaService never disconnects and BullMQ's worker.close() never runs —
  // in-flight jobs get killed mid-run instead of finishing.
  app.enableShutdownHooks();
  // Known gap, deliberately deferred: no origin restriction (allows '*') since no
  // frontend origin exists yet to restrict it to. Revisit once one does.
  app.enableCors();

  app.use(helmet());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('T-Shirt Store API')
    .setDescription('See docs/openApi.yml for the full design spec')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, swaggerDocument);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error if unknown fields detected
      transform: true, // Auto-transform payloads to DTO class instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) =>
        new UnprocessableEntityException(flattenValidationErrors(errors)),
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
