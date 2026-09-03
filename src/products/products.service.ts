import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { S3Service } from '../s3/s3.service';
import { ProductInputDto } from './dto/createProduct.dto';
import { productsModel } from '../../generated/prisma/models';
import { ProductUpdateInputDto } from './dto/updateProduct.dto';
import { CreateProductImageDto } from './dto/productImage.dto';

const MAX_IMAGES_PER_PRODUCT = 10;
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

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

export type PaymentLinkResult = {
  paymentLink: string;
  expiresAt: null;
};

export type ProductImage = {
  id: number;
  url: string;
  displayOrder: number;
  altText: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

@Injectable()
export class ProductsService {
  constructor(
    private prismaService: PrismaService,
    private stripeService: StripeService,
    private s3Service: S3Service,
  ) {}
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
              prices_history: { create: { price: variant.price } },
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

  async remove(productId: number): Promise<void> {
    await this.findOne(productId);

    await this.prismaService.products.update({
      where: {
        product_id: productId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  async activate(productId: number): Promise<Product> {
    const product = await this.findOne(productId);

    if (product.status === 'active') {
      return product;
    }

    if (product.status === 'discontinued') {
      throw new ConflictException('Cannot activate a discontinued product');
    }

    const updated = await this.prismaService.products.update({
      where: { product_id: productId },
      data: { status: 'active' },
    });

    return this.toProduct(updated);
  }

  async deactivate(productId: number): Promise<Product> {
    const product = await this.findOne(productId);

    if (product.status === 'inactive') {
      return product;
    }

    if (product.status === 'discontinued') {
      throw new ConflictException('Cannot deactivate a discontinued product');
    }

    const updated = await this.prismaService.products.update({
      where: { product_id: productId },
      data: { status: 'inactive' },
    });

    return this.toProduct(updated);
  }

  async likeProduct(userId: number, productId: number): Promise<void> {
    await this.findOne(productId);

    await this.prismaService.product_likes.upsert({
      where: {
        user_id_product_id: { user_id: userId, product_id: productId },
      },
      create: { user_id: userId, product_id: productId },
      update: {},
    });
    return;
  }

  async unlikeProduct(userId: number, productId: number) {
    await this.findOne(productId);

    await this.prismaService.product_likes.deleteMany({
      where: {
        user_id: userId,
        product_id: productId,
      },
    });
    return;
  }

  async createPaymentLink(
    userId: number,
    productId: number,
  ): Promise<PaymentLinkResult> {
    const product = await this.findOne(productId);

    const variants = await this.prismaService.product_variants.findMany({
      where: { product_id: productId },
    });

    if (variants.length !== 1) {
      throw new ConflictException(
        'Product must have exactly one variant to create a payment link',
      );
    }

    const latestPrice = await this.prismaService.prices_history.findFirst({
      where: { product_variant_id: variants[0].product_variant_id },
      orderBy: { effective_from: 'desc' },
    });

    const link = await this.stripeService.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: Number(latestPrice?.price),
            product_data: { name: product.name },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: String(userId),
        productVariantId: String(variants[0].product_variant_id),
      },
    });
    return { paymentLink: link.url, expiresAt: null };
  }

  private imageKey(productId: number, filename: string, extension: string) {
    return `products/${productId}/${filename}.${extension}`;
  }

  async findImages(
    productId: number,
    limit?: number,
    offset?: number,
  ): Promise<ProductImage[]> {
    await this.findOne(productId);

    const images = await this.prismaService.product_images.findMany({
      where: { product_id: productId },
      orderBy: { display_order: 'asc' },
      take: limit,
      skip: offset,
    });

    return Promise.all(
      images.map(async (row) => ({
        id: row.image_id,
        url: await this.s3Service.getSignedUrl(
          this.imageKey(productId, row.filename, row.extension),
        ),
        displayOrder: row.display_order,
        altText: row.alt_text,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );
  }

  async addImage(
    productId: number,
    file: Express.Multer.File,
    dto: CreateProductImageDto,
  ): Promise<ProductImage> {
    await this.findOne(productId);

    const extension = MIME_TO_EXTENSION[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'Unsupported image format — supported: jpg, png, webp, gif',
      );
    }

    const existingCount = await this.prismaService.product_images.count({
      where: { product_id: productId },
    });
    if (existingCount >= MAX_IMAGES_PER_PRODUCT) {
      throw new ConflictException(
        `Product already has the maximum of ${MAX_IMAGES_PER_PRODUCT} images`,
      );
    }

    const filename = randomUUID();
    await this.s3Service.upload(
      this.imageKey(productId, filename, extension),
      file.buffer,
      file.mimetype,
    );

    const created = await this.prismaService.product_images.create({
      data: {
        product_id: productId,
        bucket_name: this.s3Service.bucketName,
        filename,
        extension,
        display_order: dto.displayOrder ?? existingCount,
        alt_text: dto.altText,
      },
    });

    return {
      id: created.image_id,
      url: await this.s3Service.getSignedUrl(
        this.imageKey(productId, filename, extension),
      ),
      displayOrder: created.display_order,
      altText: created.alt_text,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }
}
