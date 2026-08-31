import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { ProductVariantInputDto } from './dto/createProductVariant.dto';
import { ProductVariantUpdateInputDto } from './dto/updateProductVariant.dto';
import { product_variantsModel as ProductVariantModel } from '../../generated/prisma/models';

export type ProductVariant = {
  productVariantId: number;
  productId: number;
  size: string;
  color: string;
  stockQuantity: number;
  skuCode: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

@Injectable()
export class VariantsService {
  constructor(
    private prismaService: PrismaService,
    private productsService: ProductsService,
  ) {}

  private toProductVariant(row: ProductVariantModel): ProductVariant {
    return {
      productVariantId: row.product_variant_id,
      productId: row.product_id,
      size: row.size,
      color: row.color,
      stockQuantity: row.stock_quantity,
      skuCode: row.sku_code,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findOne(productVariantId: number): Promise<ProductVariant> {
    const productVariant = await this.prismaService.product_variants.findFirst({
      where: {
        product_variant_id: productVariantId,
      },
    });
    if (!productVariant) {
      throw new NotFoundException('ProductVariant not found');
    }
    return this.toProductVariant(productVariant);
  }

  async findByProductId(
    productId: number,
    limit?: number,
    offset?: number,
  ): Promise<ProductVariant[]> {
    // Verify product exists (not deleted)
    await this.productsService.findOne(productId);

    const variants = await this.prismaService.product_variants.findMany({
      where: {
        product_id: productId,
      },
      take: limit,
      skip: offset,
    });

    return variants.map((row) => this.toProductVariant(row));
  }

  async create(
    productId: number,
    dto: ProductVariantInputDto,
  ): Promise<ProductVariant> {
    // Verify product exists (not deleted)
    await this.productsService.findOne(productId);

    // Check for duplicate SKU across all variants
    const existingSku = await this.prismaService.product_variants.findFirst({
      where: {
        sku_code: dto.skuCode,
      },
    });

    if (existingSku) {
      throw new ConflictException('SKU already exists');
    }

    const variant = await this.prismaService.product_variants.create({
      data: {
        product_id: productId,
        size: dto.size,
        color: dto.color,
        stock_quantity: dto.stockQuantity,
        sku_code: dto.skuCode,
        status: dto.status || 'active',
      },
    });

    return this.toProductVariant(variant);
  }

  async update(
    productId: number,
    variantId: number,
    dto: ProductVariantUpdateInputDto,
  ): Promise<ProductVariant> {
    // Verify product exists (not deleted)
    await this.productsService.findOne(productId);

    // Verify variant exists and belongs to this product
    const existingVariant = await this.prismaService.product_variants.findFirst(
      {
        where: {
          product_variant_id: variantId,
          product_id: productId,
        },
      },
    );

    if (!existingVariant) {
      throw new NotFoundException('Variant not found');
    }

    // If SKU is being changed, check it doesn't conflict with existing SKUs
    if (dto.skuCode && dto.skuCode !== existingVariant.sku_code) {
      const conflictingSku =
        await this.prismaService.product_variants.findFirst({
          where: {
            sku_code: dto.skuCode,
          },
        });

      if (conflictingSku) {
        throw new ConflictException('SKU already exists');
      }
    }

    const updated = await this.prismaService.product_variants.update({
      where: {
        product_variant_id: variantId,
      },
      data: {
        ...(dto.size && { size: dto.size }),
        ...(dto.color && { color: dto.color }),
        ...(dto.stockQuantity !== undefined && {
          stock_quantity: dto.stockQuantity,
        }),
        ...(dto.skuCode && { sku_code: dto.skuCode }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return this.toProductVariant(updated);
  }
}
