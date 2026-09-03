import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/updateCategory.dto';

export type Category = {
  id: number;
  name: string;
};

@Injectable()
export class CategoriesService {
  constructor(private prismaService: PrismaService) {}

  private toCategory(row: { category_id: number; name: string }): Category {
    return {
      id: row.category_id,
      name: row.name,
    };
  }

  async findAll(
    limit?: number,
    offset?: number,
  ): Promise<{ categories: Category[]; total: number }> {
    const [rows, total] = await Promise.all([
      this.prismaService.categories.findMany({
        where: { deleted_at: null },
        take: limit,
        skip: offset,
      }),
      this.prismaService.categories.count({
        where: { deleted_at: null },
      }),
    ]);

    return {
      categories: rows.map((row) => this.toCategory(row)),
      total,
    };
  }

  async findOne(categoryId: number): Promise<Category> {
    const category = await this.prismaService.categories.findFirst({
      where: { category_id: categoryId, deleted_at: null },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.toCategory(category);
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.prismaService.categories.findFirst({
      where: { name: dto.name, deleted_at: null },
    });
    if (existing) {
      throw new ConflictException('Category already exists');
    }

    const created = await this.prismaService.categories.create({
      data: { name: dto.name },
    });
    return this.toCategory(created);
  }

  async update(categoryId: number, dto: UpdateCategoryDto): Promise<Category> {
    await this.findOne(categoryId);

    if (dto.name) {
      const conflicting = await this.prismaService.categories.findFirst({
        where: {
          name: dto.name,
          deleted_at: null,
          category_id: { not: categoryId },
        },
      });
      if (conflicting) {
        throw new ConflictException('Category already exists');
      }
    }

    const updated = await this.prismaService.categories.update({
      where: { category_id: categoryId },
      data: { ...(dto.name && { name: dto.name }) },
    });
    return this.toCategory(updated);
  }

  async remove(categoryId: number): Promise<void> {
    await this.findOne(categoryId);

    await this.prismaService.categories.update({
      where: { category_id: categoryId },
      data: { deleted_at: new Date() },
    });
  }
}
