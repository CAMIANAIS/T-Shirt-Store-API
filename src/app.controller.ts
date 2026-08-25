import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { CategoriesService } from './categories/categories.service';
import type { categoryType } from './categories/categories.service';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private categoriesService: CategoriesService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Get('categories')
  async findAll(): Promise<categoryType> {
    return this.categoriesService.findAll();
  }
}
