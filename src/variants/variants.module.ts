import { Module } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [ProductsModule],
  providers: [VariantsService],
  controllers: [VariantsController],
})
export class VariantsModule {}
