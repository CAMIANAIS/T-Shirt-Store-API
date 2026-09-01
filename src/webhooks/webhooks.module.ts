import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { CartsModule } from '../carts/carts.module';

@Module({
  providers: [WebhooksService],
  controllers: [WebhooksController],
  imports: [PrismaModule, StripeModule, CartsModule],
})
export class WebhooksModule {}
