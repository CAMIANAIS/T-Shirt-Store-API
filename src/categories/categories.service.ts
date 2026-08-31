import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type Category = {
  id: number;
  name: string;
};

@Injectable()
export class CategoriesService {
  constructor(private prismaService: PrismaService) {}

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
      categories: rows.map((row) => ({
        id: row.category_id,
        name: row.name,
      })),
      total,
    };
  }
}
