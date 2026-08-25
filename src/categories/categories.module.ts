import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [CategoriesService],
  imports: [PrismaModule],
  exports: [CategoriesService],
})
export class CategoriesModule {}
