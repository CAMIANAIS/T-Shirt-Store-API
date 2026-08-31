import { Module } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { ProductsModule } from '../products/products.module';
import { CaslModule } from '../casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ProductsModule, CaslModule, PrismaModule, AuthModule],
  providers: [VariantsService],
  controllers: [VariantsController],
  exports: [VariantsService],
})
export class VariantsModule {}
