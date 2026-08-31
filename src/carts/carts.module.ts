import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { ProductsModule } from '../products/products.module';
import { VariantsModule } from '../variants/variants.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [CartsService],
  controllers: [CartsController],
  imports: [ProductsModule, VariantsModule, PrismaModule],
})
export class CartsModule {}
