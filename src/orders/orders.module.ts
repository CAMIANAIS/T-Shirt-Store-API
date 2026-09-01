import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CaslModule } from '../casl/casl.module';
import { CartsModule } from '../carts/carts.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  providers: [OrdersService],
  controllers: [OrdersController],
  imports: [PrismaModule, AuthModule, CaslModule, CartsModule, StripeModule],
})
export class OrdersModule {}
