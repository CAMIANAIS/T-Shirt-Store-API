import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type categoryType = string[];
@Injectable()
export class CategoriesService {
  constructor(private prismaService: PrismaService) {}

  async findAll(): Promise<categoryType> {
    const categories = await this.prismaService.categories.findMany();
    return categories.map((categ) => categ.name);
  }
}
