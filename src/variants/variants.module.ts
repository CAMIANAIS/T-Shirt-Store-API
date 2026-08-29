import { Module } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { ProductsModule } from '../products/products.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [ProductsModule, CaslModule],
  providers: [VariantsService],
  controllers: [VariantsController],
})
export class VariantsModule {}
