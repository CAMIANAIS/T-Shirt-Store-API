import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { EnvironmentVariables } from './config/environment';
import { CategoriesModule } from './categories/categories.module';
import { AppService } from './app.service';
import { validateConfig } from './config/validate-config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ProductsModule } from './products/products.module';
import { VariantsModule } from './variants/variants.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CartsModule } from './carts/carts.module';
import { OrdersModule } from './orders/orders.module';
import { StripeModule } from './stripe/stripe.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => ({
        connection: new Redis(configService.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: null,
        }),
      }),
    }),
    CategoriesModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    ProductsModule,
    VariantsModule,
    CartsModule,
    OrdersModule,
    StripeModule,
    WebhooksModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
