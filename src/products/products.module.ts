import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CaslModule } from '../casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  providers: [ProductsService],
  imports: [CaslModule, PrismaModule, AuthModule, StripeModule],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
