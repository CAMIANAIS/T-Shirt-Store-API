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
import { ordersGetPayload } from '../../generated/prisma/models';

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
    // Your turn. Steps, roughly:
    // 1. Fetch the order by orderId, including its order_status_history
    //    (prismaService.orders.findUnique — remember the compound-key
    //    lesson from likes doesn't apply here, order_id is a plain PK).
    //    404 if it doesn't exist.
    const order = await this.prismaService.orders.findUnique({
      where: { order_id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    // 2. 403 (ForbiddenException) if order.user_id !== userId — this
    //    isn't your order to pay for.
    if (order.user_id !== userId) {
      throw new ForbiddenException('You are not allowed');
    }
    // 3. Figure out the order's CURRENT status from order_status_history
    //    (most recent row by created_at). 409 (ConflictException) if
    //    it's not 'pending' — spec says "Order must be in pending status."
    const currentStatus =
      await this.prismaService.order_status_history.findFirst({
        where: { order_id: orderId },
        orderBy: { created_at: 'desc' },
      });
    if (currentStatus?.status !== 'pending') {
      throw new ConflictException('Order must be in pending status');
    }
    // 4. Call this.stripeService.paymentIntents.create({ amount, currency,
    //    metadata: { orderId: String(orderId) } }). amount is order.total_amount
    //    (already in cents, per how you built `create`). currency: 'usd'.
    //    Leave payment_method_types out for now — that's a deliberate
    //    Stripe Elements default, not something dto.paymentMethod maps
    //    to cleanly (remember the apple_pay/google_pay flag from earlier).
    const intent = await this.stripeService.paymentIntents.create({
      amount: Number(order.total_amount),
      currency: 'usd',
      metadata: { orderId: String(orderId) },
    });
    // 5. Return { intentId: intent.id, clientSecret: intent.client_secret!,
    //    amount: intent.amount, currency: intent.currency }.
    return {
      intentId: intent.id,
      clientSecret: intent.client_secret ? intent.client_secret : '',
      amount: intent.amount,
      currency: intent.currency,
    };
  }
}
