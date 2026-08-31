import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CategoriesService, Category } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Category[]> {
    const { categories, total } = await this.categoriesService.findAll(
      limit,
      offset,
    );
    res.set('X-TotalCount', String(total));
    return categories;
  }
}
