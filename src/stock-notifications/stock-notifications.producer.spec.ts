import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { StockNotificationsProducer } from './stock-notifications.producer';
import { STOCK_NOTIFICATIONS_QUEUE } from './stock-notifications.constants';

describe('StockNotificationsProducer', () => {
  let service: StockNotificationsProducer;
  const mockAdd = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockNotificationsProducer,
        {
          provide: getQueueToken(STOCK_NOTIFICATIONS_QUEUE),
          useValue: { add: mockAdd },
        },
      ],
    }).compile();

    service = module.get<StockNotificationsProducer>(
      StockNotificationsProducer,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notifyRestock', () => {
    it('enqueues a "restock" job with the given productId', async () => {
      // Act
      await service.notifyRestock(1);

      // Assert — TODO: check mockAdd was called with 'restock' and { productId: 1 }.
      expect(mockAdd).toHaveBeenCalledWith(
        'restock',
        { productId: 1 },
        expect.anything(),
      );
    });
  });
});
