import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { StockNotificationsProcessor } from './stock-notifications.processor';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { S3Service } from '../s3/s3.service';
import { StockNotificationJob } from './stock-notifications.producer';

describe('StockNotificationsProcessor', () => {
  let processor: StockNotificationsProcessor;
  let prismaService: PrismaService;
  let emailService: EmailService;
  let s3Service: S3Service;

  // A fake BullMQ Job — process() only reads job.data, so that's all this
  // needs to look like.
  const makeJob = (productId: number): Job<StockNotificationJob> =>
    ({ data: { productId } }) as Job<StockNotificationJob>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockNotificationsProcessor,
        {
          provide: PrismaService,
          useValue: {
            products: { findFirst: jest.fn() },
            product_images: { findFirst: jest.fn() },
            product_likes: { findMany: jest.fn() },
            stock_notifications: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
        {
          provide: S3Service,
          useValue: { getSignedUrl: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<StockNotificationsProcessor>(
      StockNotificationsProcessor,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    s3Service = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('returns early and sends no email when the product is not found', async () => {
      // Arrange
      (prismaService.products.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      await processor.process(makeJob(1));

      // Assert — TODO: what should emailService.sendEmail and
      // prismaService.product_likes.findMany look like here? Nothing should
      // have run past the early return.
      expect(prismaService.product_likes.findMany).not.toHaveBeenCalled();
    });

    it('emails each liker who has not already been notified, and records a stock_notifications row for them', async () => {
      // Arrange
      (prismaService.products.findFirst as jest.Mock).mockResolvedValue({
        product_id: 1,
        name: 'Restock Tee',
      });
      (prismaService.product_images.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.product_likes.findMany as jest.Mock).mockResolvedValue([
        { user_id: 10, users: { email: 'liker@example.com' } },
      ]);
      (
        prismaService.stock_notifications.findUnique as jest.Mock
      ).mockResolvedValue(null);

      // Act
      await processor.process(makeJob(1));

      // Assert — TODO: check emailService.sendEmail was called with
      // 'liker@example.com' and a subject/body mentioning the product name,
      // and that prismaService.stock_notifications.create was called with
      // { product_id: 1, user_id: 10 }.
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'liker@example.com',
        'Restock Tee is back in stock!',
        expect.any(String),
      );
      expect(prismaService.stock_notifications.create).toHaveBeenCalledWith({
        data: { product_id: 1, user_id: 10 },
      });
    });

    it('skips a liker who already has a stock_notifications row', async () => {
      // Arrange
      (prismaService.products.findFirst as jest.Mock).mockResolvedValue({
        product_id: 1,
        name: 'Restock Tee',
      });
      (prismaService.product_images.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.product_likes.findMany as jest.Mock).mockResolvedValue([
        { user_id: 10, users: { email: 'liker@example.com' } },
      ]);
      (
        prismaService.stock_notifications.findUnique as jest.Mock
      ).mockResolvedValue({ product_id: 1, user_id: 10 });

      // Act
      await processor.process(makeJob(1));

      // Assert — TODO: emailService.sendEmail and
      // prismaService.stock_notifications.create should NOT have been
      // called for this liker.
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(prismaService.stock_notifications.create).not.toHaveBeenCalled();
    });

    it('includes the signed image URL in the email body when the product has an image', async () => {
      // Arrange
      (prismaService.products.findFirst as jest.Mock).mockResolvedValue({
        product_id: 1,
        name: 'Restock Tee',
      });
      (prismaService.product_images.findFirst as jest.Mock).mockResolvedValue({
        product_id: 1,
        filename: 'photo',
        extension: 'png',
      });
      (s3Service.getSignedUrl as jest.Mock).mockResolvedValue(
        'https://signed-url.example.com/photo.png',
      );
      (prismaService.product_likes.findMany as jest.Mock).mockResolvedValue([
        { user_id: 10, users: { email: 'liker@example.com' } },
      ]);
      (
        prismaService.stock_notifications.findUnique as jest.Mock
      ).mockResolvedValue(null);

      // Act
      await processor.process(makeJob(1));

      // Assert — TODO: check the html string sendEmail was called with
      // contains 'https://signed-url.example.com/photo.png'.
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        'liker@example.com',
        expect.any(String),
        expect.stringContaining('https://signed-url.example.com/photo.png'),
      );
    });
  });
});
