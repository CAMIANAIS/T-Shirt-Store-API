import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../src/prisma/prisma.service';

export const FIXTURE_PASSWORD = 'Password123!';

// A plain incrementing counter isn't safe here: each e2e test *file* gets
// its own module instance (so its own counter starting back at 0), but all
// files share one Testcontainers Postgres. Running files in parallel (the
// default) collided on email/sku uniqueness. A per-process-run unique id
// avoids that regardless of how many files run at once.
// Short enough to fit every VARCHAR(50) column these fixtures touch
// (Categories.name, Users.username) once the prefix text is added, while
// still collision-safe at test scale.
function uniqueId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

export async function createUserFixture(
  prisma: PrismaService,
  role: 'client' | 'manager' = 'client',
) {
  const id = uniqueId();
  const roleRow = await prisma.roles.findFirstOrThrow({
    where: { name: role },
  });
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);

  const user = await prisma.users.create({
    data: {
      email: `fixture-user-${id}@example.com`,
      username: `fixture-user-${id}`,
      password_hash: passwordHash,
      role_id: roleRow.role_id,
      carts: { create: {} },
    },
  });

  return {
    userId: user.user_id,
    email: user.email,
    password: FIXTURE_PASSWORD,
    role,
  };
}

export async function createProductFixture(
  prisma: PrismaService,
  overrides?: { stockQuantity?: number; price?: number },
) {
  const id = uniqueId();
  const category = await prisma.categories.findFirst();
  const categoryId =
    category?.category_id ??
    (
      await prisma.categories.create({
        data: { name: `Fixture Category ${id}` },
      })
    ).category_id;

  const product = await prisma.products.create({
    data: {
      name: `Fixture Product ${id}`,
      description: 'A product created for e2e tests',
      status: 'active',
      category_id: categoryId,
      product_variants: {
        create: {
          size: 'M',
          color: 'black',
          sku_code: `SKU-${id}`,
          stock_quantity: overrides?.stockQuantity ?? 10,
          status: 'active',
          prices_history: { create: { price: overrides?.price ?? 1999 } },
        },
      },
    },
    include: { product_variants: true },
  });

  return {
    productId: product.product_id,
    productVariantId: product.product_variants[0].product_variant_id,
    skuCode: product.product_variants[0].sku_code,
    stockQuantity: product.product_variants[0].stock_quantity,
    price: overrides?.price ?? 1999,
  };
}

// Inserts an order directly (skips the cart/checkout ceremony — that flow
// is checkout.e2e-spec.ts's job; this one's about who's allowed to see it).
export async function createOrderFixture(
  prisma: PrismaService,
  userId: number,
  productVariantId: number,
  overrides?: { quantity?: number; priceAtPurchase?: number; status?: string },
) {
  const quantity = overrides?.quantity ?? 1;
  const priceAtPurchase = overrides?.priceAtPurchase ?? 1999;

  const order = await prisma.orders.create({
    data: {
      user_id: userId,
      total_amount: priceAtPurchase * quantity,
      order_items: {
        create: {
          product_variant_id: productVariantId,
          quantity,
          price_at_purchase: priceAtPurchase,
        },
      },
      order_status_history: {
        create: { status: overrides?.status ?? 'pending' },
      },
    },
  });

  return { orderId: order.order_id };
}
