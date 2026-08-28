import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { productsModel } from 'generated/prisma/models';
import { ProductUpdateInputDto } from './dto/updateProduct.dto';

export type Product = {
  productId: number;
  name: string;
  description: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  deletedAt: Date | null;
  categoryId: number;
};

@Injectable()
export class ProductsService {
  constructor(private prismaService: PrismaService) {}
  private toProduct(row: productsModel): Product {
    return {
      productId: row.product_id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      categoryId: row.category_id,
    };
  }

  async findAll(
    categoryId?: number,
    limit?: number,
    offset?: number,
  ): Promise<Product[]> {
    const products = await this.prismaService.products.findMany({
      where: {
        category_id: categoryId,
        deleted_at: null,
      },
      take: limit,
      skip: offset,
    });
    return products.map((row) => this.toProduct(row));
  }

  async create(dto: ProductInputDto): Promise<Product> {
    const product = await this.prismaService.products.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        category_id: dto.categoryId,
        ...(dto.variants && {
          product_variants: {
            create: dto.variants.map((variant) => ({
              size: variant.size,
              color: variant.color,
              stock_quantity: variant.stockQuantity,
              sku_code: variant.skuCode,
              status: variant.status,
            })),
          },
        }),
      },
    });
    return this.toProduct(product);
  }

  async findOne(productId: number): Promise<Product> {
    const product = await this.prismaService.products.findFirst({
      where: {
        product_id: productId,
        deleted_at: null,
      },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.toProduct(product);
  }

  async update(
    productId: number,
    dto: ProductUpdateInputDto,
  ): Promise<Product> {
    await this.findOne(productId);
    const updateProduct = await this.prismaService.products.update({
      where: {
        product_id: productId,
        deleted_at: null,
      },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        category_id: dto.categoryId,
      },
    });
    return this.toProduct(updateProduct);
  }
}
