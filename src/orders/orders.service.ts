import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';
import { StripeService } from '../stripe/stripe.service';
import { CreateOrderDto } from './dto/createOrder.dto';
import { PaymentIntentInputDto } from './dto/paymentIntentInput.dto';
import {
  order_status_historyModel,
  ordersGetPayload,
} from '../../generated/prisma/models';
import { OrderParamsDto } from './dto/orderParams.dto';
import { OrderStatusHistoryDto } from './dto/orderStatusHistory.dto';

export type PaymentIntentResult = {
  intentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
};

export type OrderLineItem = {
  productVariantId: number;
  quantity: number;
  priceAtPurchase: number;
};

export type Order = {
  id: number;
  userId: number;
  totalAmount: number;
  items: OrderLineItem[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

@Injectable()
export class OrdersService {
  constructor(
    private prismaService: PrismaService,
    private cartsService: CartsService,
    private stripeService: StripeService,
  ) {}

  private toOrder(
    row: ordersGetPayload<{ include: { order_items: true } }>,
  ): Order {
    return {
      id: row.order_id,
      userId: row.user_id,
      totalAmount: Number(row.total_amount),
      items: row.order_items.map((item) => ({
        productVariantId: item.product_variant_id,
        quantity: item.quantity,
        priceAtPurchase: Number(item.price_at_purchase),
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  private toOrderStatusHistory(
    row: order_status_historyModel,
  ): OrderStatusHistoryDto {
    return {
      status: row.status,
      changedAt: row.created_at,
      changedBy: row.changed_by_email ?? 'system',
    };
  }
  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    const cart = await this.cartsService.getCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    for (const item of cart.items) {
      const variant = await this.prismaService.product_variants.findUnique({
        where: { product_variant_id: item.productVariantId },
      });
      if (!variant) {
        throw new NotFoundException(
          `Variant ${item.productVariantId} not found`,
        );
      } else {
        if (variant.stock_quantity < item.quantity) {
          throw new ConflictException(
            `Variant ${item.productVariantId} does not have enough stock`,
          );
        }
      }
    }

    const order = await this.prismaService.orders.create({
      data: {
        user_id: userId,
        // payment_method stays null here — set later by the Stripe
        // webhook once the customer actually picks how to pay.
        total_amount: cart.items.reduce(
          (acc, item) => acc + item.priceAtPurchase * item.quantity,
          0,
        ),
        order_items: {
          create: cart.items.map((item) => ({
            product_variant_id: item.productVariantId,
            quantity: item.quantity,
            price_at_purchase: item.priceAtPurchase,
          })),
        },
        order_status_history: {
          create: {
            status: 'pending',
          },
        },
        order_addresses: {
          create: {
            street1: dto.shippingAddress.street1,
            street2: dto.shippingAddress.street2,
            street3: dto.shippingAddress.street3,
            city: dto.shippingAddress.city,
            postal_code: dto.shippingAddress.postalCode,
            state: dto.shippingAddress.state,
            country: dto.shippingAddress.country,
          },
        },
      },
      include: { order_items: true },
    });

    return this.toOrder(order);
  }

  async createPayment(
    userId: number,
    orderId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- payment_method_types deliberately deferred, see PaymentIntents.create call below
    dto: PaymentIntentInputDto,
  ): Promise<PaymentIntentResult> {
    const order = await this.prismaService.orders.findUnique({
      where: { order_id: orderId },
      include: { order_items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user_id !== userId) {
      throw new ForbiddenException('You are not allowed');
    }

    const currentStatus =
      await this.prismaService.order_status_history.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
      });
    if (currentStatus?.status !== 'pending') {
      throw new ConflictException('Order must be in pending status');
    }

    for (const item of order.order_items) {
      const variant = await this.prismaService.product_variants.findUnique({
        where: { product_variant_id: item.product_variant_id },
      });
      if (!variant || variant.stock_quantity < item.quantity) {
        throw new ConflictException(
          `Variant ${item.product_variant_id} does not have enough stock`,
        );
      }
    }

    const intent = await this.stripeService.paymentIntents.create({
      amount: Number(order.total_amount),
      currency: 'usd',
      metadata: { orderId: String(orderId) },
      // No frontend exists to handle a redirect-based payment method, so
      // never allow one — this also means `return_url` is never required
      // at confirmation time (this is what triggered Stripe's warning
      // email during manual CLI testing).
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    });

    return {
      intentId: intent.id,
      clientSecret: intent.client_secret ? intent.client_secret : '',
      amount: intent.amount,
      currency: intent.currency,
    };
  }
  async getOrders(dto: OrderParamsDto, userId?: number): Promise<Order[]> {
    const userFilter = userId ? { user_id: userId } : {};
    const latestStatuses =
      await this.prismaService.order_status_history.findMany({
        orderBy: [{ order_id: 'asc' }, { created_at: 'desc' }],
        distinct: ['order_id'],
      });

    const orderIds = dto.status
      ? latestStatuses
          .filter((row) => row.status === dto.status)
          .map((row) => row.order_id)
      : undefined;
    const orders = await this.prismaService.orders.findMany({
      where: {
        ...(orderIds && { order_id: { in: orderIds } }),
        created_at: {
          gte: dto.fromDate,
          lte: dto.toDate,
        },

        total_amount: {
          gte: dto.minAmount,
          lte: dto.maxAmount,
        },
        ...userFilter,
      },
      take: dto.limit,
      skip: dto.offset,
      include: { order_items: true },
      orderBy: { created_at: 'desc' },
    });
    return orders.map((order) => this.toOrder(order));
  }

  async findOne(
    orderId: number,
    userId: number,
    isManager: boolean,
  ): Promise<Order> {
    const order = await this.prismaService.orders.findFirst({
      where: {
        order_id: orderId,
      },
      include: { order_items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!isManager && order.user_id !== userId) {
      throw new ForbiddenException('You are not allowed');
    }
    return this.toOrder(order);
  }

  async getStatusHistory(
    orderId: number,
    limit?: number,
    offset?: number,
  ): Promise<OrderStatusHistoryDto[]> {
    const statusHistory =
      await this.prismaService.order_status_history.findMany({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      });
    return statusHistory.map((row) => this.toOrderStatusHistory(row));
  }
  async postStatusHistory(
    orderId: number,
    status: string,
    changedByEmail: string,
    changedByUserId: number,
  ): Promise<OrderStatusHistoryDto> {
    const currentStatus =
      await this.prismaService.order_status_history.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
      });

    const isLegal =
      (currentStatus?.status === 'paid' && status === 'processing') ||
      (currentStatus?.status === 'processing' && status === 'shipped');

    if (!isLegal) {
      throw new ConflictException('Invalid status transition');
    }

    const orderStatusHistory =
      await this.prismaService.order_status_history.create({
        data: {
          order_id: orderId,
          status,
          changed_by_type: 'user',
          changed_by_email: changedByEmail,
          changed_by_user_id: changedByUserId,
        },
      });
    return this.toOrderStatusHistory(orderStatusHistory);
  }
  async cancelOrder(
    orderId: number,
    userId: number,
    changedByEmail: string,
  ): Promise<Order> {
    const order = await this.prismaService.orders.findFirst({
      where: {
        order_id: orderId,
      },
      include: { order_items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.user_id !== userId) {
      throw new ForbiddenException('You are not allowed');
    }
    const currentStatus =
      await this.prismaService.order_status_history.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
      });
    const alreadyFinal =
      currentStatus?.status === 'cancelled' ||
      currentStatus?.status === 'delivered' ||
      currentStatus?.status === 'shipped';

    if (alreadyFinal) {
      throw new ConflictException('Order cannot be cancelled at this stage');
    }

    await this.prismaService.order_status_history.create({
      data: {
        order_id: orderId,
        status: 'cancelled',
        changed_by_type: 'user',
        changed_by_email: changedByEmail,
        changed_by_user_id: userId,
      },
    });
    return this.toOrder(order);
  }
}
