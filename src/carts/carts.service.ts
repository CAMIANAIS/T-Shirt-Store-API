import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cartsGetPayload } from '../../generated/prisma/models';

export type Cart = {
  id: number;
  userId: number;
  items: LineItem[];
};
export type LineItem = {
  id: number;
  productVariantId: number;
  quantity: number;
  priceAtPurchase: number;
  subtotal: number;
};

@Injectable()
export class CartsService {
  constructor(private prismaService: PrismaService) {}

  private toCart(
    row: cartsGetPayload<{ include: { cart_items: true } }>,
  ): Cart {
    return {
      id: row.cart_id,
      userId: row.user_id,
      items: row.cart_items.map((item) => ({
        id: item.cart_items_id,
        productVariantId: item.product_variant_id,
        quantity: item.quantity,
        priceAtPurchase: Number(item.price_at_purchase),
        subtotal: item.quantity * Number(item.price_at_purchase),
      })),
    };
  }
  async getCart(userId: number): Promise<Cart> {
    const cart = await this.prismaService.carts.findUnique({
      where: {
        user_id: userId,
      },
      include: { cart_items: true },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.toCart(cart);
  }
}
