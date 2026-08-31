import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { cartsGetPayload } from '../../generated/prisma/models';
import { VariantsService } from '../variants/variants.service';
import { CartItemInputDto } from './dto/cartItemInput.dto';

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
  constructor(
    private prismaService: PrismaService,
    private variantsService: VariantsService,
  ) {}

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

  async addItem(userId: number, dto: CartItemInputDto): Promise<Cart> {
    // Step 1: verify the variant exists (throws NotFoundException if not)
    await this.variantsService.findOne(dto.productVariantId);

    const userCart = await this.prismaService.carts.findUnique({
      where: { user_id: userId },
    });

    if (!userCart) {
      throw new NotFoundException();
    }

    const existingItem = await this.prismaService.cart_items.findUnique({
      where: {
        cart_id_product_variant_id: {
          cart_id: userCart.cart_id,
          product_variant_id: dto.productVariantId,
        },
      },
    });

    if (existingItem) {
      await this.prismaService.cart_items.update({
        where: { cart_items_id: existingItem.cart_items_id },
        data: { quantity: existingItem.quantity + dto.quantity },
      });
    } else {
      const latestPrice = await this.prismaService.prices_history.findFirst({
        where: { product_variant_id: dto.productVariantId },
        orderBy: { effective_from: 'desc' },
      });
      await this.prismaService.cart_items.create({
        data: {
          cart_id: userCart.cart_id,
          product_variant_id: dto.productVariantId,
          quantity: dto.quantity,
          price_at_purchase: Number(latestPrice?.price),
        },
      });
    }
    return this.getCart(userId);
  }
}
