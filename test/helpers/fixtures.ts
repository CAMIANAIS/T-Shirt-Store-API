import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';

export const FIXTURE_PASSWORD = 'Password123!';

let userCounter = 0;
let productCounter = 0;

export async function createUserFixture(
  prisma: PrismaService,
  role: 'client' | 'manager' = 'client',
) {
  userCounter += 1;
  const roleRow = await prisma.roles.findFirstOrThrow({
    where: { name: role },
  });
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);

  const user = await prisma.users.create({
    data: {
      email: `fixture-user-${userCounter}@example.com`,
      username: `fixture-user-${userCounter}`,
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
  productCounter += 1;
  const category = await prisma.categories.findFirst();
  const categoryId =
    category?.category_id ??
    (
      await prisma.categories.create({
        data: { name: `Fixture Category ${productCounter}` },
      })
    ).category_id;

  const product = await prisma.products.create({
    data: {
      name: `Fixture Product ${productCounter}`,
      description: 'A product created for e2e tests',
      status: 'active',
      category_id: categoryId,
      product_variants: {
        create: {
          size: 'M',
          color: 'black',
          sku_code: `FIXTURE-SKU-${productCounter}`,
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
  };
}
