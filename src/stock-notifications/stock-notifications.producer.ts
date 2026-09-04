import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { STOCK_NOTIFICATIONS_QUEUE } from './stock-notifications.constants';

export type StockNotificationJob = { productId: number };

@Injectable()
export class StockNotificationsProducer {
  constructor(
    @InjectQueue(STOCK_NOTIFICATIONS_QUEUE)
    private queue: Queue<StockNotificationJob>,
  ) {}

  async notifyRestock(productId: number): Promise<void> {
    await this.queue.add(
      'restock',
      { productId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
  }
}
