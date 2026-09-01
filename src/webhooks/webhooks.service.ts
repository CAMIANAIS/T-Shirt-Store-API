import { Injectable } from '@nestjs/common';
import type Stripe from 'stripe';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';

@Injectable()
export class WebhooksService {
  constructor(
    private prismaService: PrismaService,
    private cartsService: CartsService,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    // 1. Idempotency guard — P2002 check
    try {
      await this.prismaService.stripe_events.create({
        data: {
          stripe_event_id: event.id,
          event_type: event.type,
          processing_started_at: new Date(),
          processed_at: null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return;
      }
      throw err;
    }

    // Set inside the transaction below when a payment_intent.succeeded
    // is actually processed, so we know whose cart to clear afterward.
    let paidOrderUserId: number | undefined;

    await this.prismaService.$transaction(async (prisma) => {
      if (event.type === 'payment_intent.succeeded') {
        const payment_intent = event.data.object;
        const orderId = parseInt(payment_intent.metadata.orderId);

        await prisma.order_status_history.create({
          data: {
            order_id: orderId,
            status: 'paid',
            created_at: new Date(),
          },
        });

        await prisma.orders.update({
          where: { order_id: orderId },
          data: { payment_method: 'payment_intent' },
        });

        const order = await prisma.orders.findUnique({
          where: { order_id: orderId },
          include: { order_items: true },
        });
        if (!order) {
          throw new Error(`Order with id ${orderId} not found`);
        }

        for (const item of order.order_items) {
          await prisma.product_variants.update({
            where: { product_variant_id: item.product_variant_id },
            data: { stock_quantity: { decrement: item.quantity } },
          });
        }

        paidOrderUserId = order.user_id;
      }
    });

    // Deliberately outside the transaction: CartsService uses its own
    // PrismaService instance, not the transaction-scoped `prisma` client
    // above, so it can't be made atomic with those writes anyway. Order
    // paid + stock decremented is the part that must never partially
    // fail; clearing the cart is best-effort cleanup on top of that.
    if (paidOrderUserId !== undefined) {
      await this.cartsService.clearCart(paidOrderUserId);
    }

    await this.prismaService.stripe_events.update({
      where: { stripe_event_id: event.id },
      data: { status: 'processed', processed_at: new Date() },
    });
  }
}
