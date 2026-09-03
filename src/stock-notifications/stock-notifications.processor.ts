import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { S3Service } from '../s3/s3.service';
import { STOCK_NOTIFICATIONS_QUEUE } from './stock-notifications.constants';
import { StockNotificationJob } from './stock-notifications.producer';

@Processor(STOCK_NOTIFICATIONS_QUEUE)
export class StockNotificationsProcessor extends WorkerHost {
  constructor(
    private prismaService: PrismaService,
    private emailService: EmailService,
    private s3Service: S3Service,
  ) {
    super();
  }

  async process(job: Job<StockNotificationJob>): Promise<void> {
    const { productId } = job.data;

    const product = await this.prismaService.products.findUnique({
      where: { product_id: productId },
    });
    if (!product) {
      return;
    }

    const image = await this.prismaService.product_images.findFirst({
      where: { product_id: productId },
      orderBy: { display_order: 'asc' },
    });
    const imageUrl = image
      ? await this.s3Service.getSignedUrl(
          `products/${productId}/${image.filename}.${image.extension}`,
        )
      : null;

    const likes = await this.prismaService.product_likes.findMany({
      where: { product_id: productId },
      include: { users: true },
    });

    for (const like of likes) {
      const alreadyNotified =
        await this.prismaService.stock_notifications.findUnique({
          where: {
            product_id_user_id: {
              product_id: productId,
              user_id: like.user_id,
            },
          },
        });
      if (alreadyNotified) {
        continue;
      }

      await this.emailService.sendEmail(
        like.users.email,
        `${product.name} is back in stock!`,
        `<p>${product.name} is back in stock.</p>${
          imageUrl ? `<img src="${imageUrl}" alt="${product.name}" />` : ''
        }`,
      );

      await this.prismaService.stock_notifications.create({
        data: { product_id: productId, user_id: like.user_id },
      });
    }
  }
}
