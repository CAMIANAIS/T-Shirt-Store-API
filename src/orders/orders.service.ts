import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';
import { CreateOrderDto } from './dto/createOrder.dto';
import { ordersGetPayload } from '../../generated/prisma/models';

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
    // Your turn. Steps, roughly:
    // 1. Read the user's cart via this.cartsService.getCart(userId).
    const cart = await this.cartsService.getCart(userId);
    // 2. 400 if it's empty.
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    // 3. Check each item's stock (product_variants.stock_quantity) —
    //    409 if any item doesn't have enough.
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
    // 4. Create the order + its order_items (snapshot quantity and
    //    priceAtPurchase from the cart items) + an order_status_history
    //    row of 'pending', plus the order_addresses row from dto.shippingAddress
    //    — all in one Prisma transaction (prismaService.$transaction).
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
    // 5. Do NOT decrement stock or clear the cart here — that happens on
    //    the Stripe webhook, once payment actually succeeds.
    return this.toOrder(order);
  }
}
