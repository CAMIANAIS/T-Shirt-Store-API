import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { ProductsModule } from '../products/products.module';
import { VariantsModule } from '../variants/variants.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  providers: [CartsService],
  controllers: [CartsController],
  imports: [
    ProductsModule,
    VariantsModule,
    PrismaModule,
    AuthModule,
    CaslModule,
  ],
  exports: [CartsService],
})
export class CartsModule {}
