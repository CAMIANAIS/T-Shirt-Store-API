import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VariantsService } from './variants.service';
import { ProductVariantInputDto } from './dto/createProductVariant.dto';
import { ProductVariantUpdateInputDto } from './dto/updateProductVariant.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('products/:productId/variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  findByProductId(
    @Param('productId') productId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.variantsService.findByProductId(productId, limit, offset);
  }

  @UseGuards(JWTAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Param('productId') productId: number,
    @Body() productVariantInputDto: ProductVariantInputDto,
  ) {
    return this.variantsService.create(productId, productVariantInputDto);
  }

  @UseGuards(JWTAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Patch(':productVariantId')
  update(
    @Param('productId') productId: number,
    @Param('productVariantId') productVariantId: number,
    @Body() productVariantUpdateInputDto: ProductVariantUpdateInputDto,
  ) {
    return this.variantsService.update(
      productId,
      productVariantId,
      productVariantUpdateInputDto,
    );
  }
}
