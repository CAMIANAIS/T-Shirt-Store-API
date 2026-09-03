import { Module } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { VariantsController } from './variants.controller';
import { ProductsModule } from '../products/products.module';
import { CaslModule } from '../casl/casl.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StockNotificationsModule } from '../stock-notifications/stock-notifications.module';

@Module({
  imports: [
    ProductsModule,
    CaslModule,
    PrismaModule,
    AuthModule,
    StockNotificationsModule,
  ],
  providers: [VariantsService],
  controllers: [VariantsController],
  exports: [VariantsService],
})
export class VariantsModule {}
