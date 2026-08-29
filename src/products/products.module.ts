import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CaslModule } from '../casl/casl.module';

@Module({
  providers: [ProductsService],
  imports: [CaslModule],
  controllers: [ProductsController],
})
export class ProductsModule {}
