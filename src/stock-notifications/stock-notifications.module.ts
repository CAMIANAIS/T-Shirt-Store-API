import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { S3Module } from '../s3/s3.module';
import { StockNotificationsProducer } from './stock-notifications.producer';
import { StockNotificationsProcessor } from './stock-notifications.processor';
import { STOCK_NOTIFICATIONS_QUEUE } from './stock-notifications.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: STOCK_NOTIFICATIONS_QUEUE }),
    PrismaModule,
    EmailModule,
    S3Module,
  ],
  providers: [StockNotificationsProducer, StockNotificationsProcessor],
  exports: [StockNotificationsProducer],
})
export class StockNotificationsModule {}
