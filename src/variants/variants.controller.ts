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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VariantsService } from './variants.service';
import { ProductVariantInputDto } from './dto/createProductVariant.dto';
import { ProductVariantUpdateInputDto } from './dto/updateProductVariant.dto';
import { ProductVariantDto } from './dto/productVariant.dto';
import { PaginationParamsDto } from '../common/dto/pagination.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { AppAbility } from '../casl/casl-ability.factory';
import { CheckPolicies } from '../casl/policies.decorator';
import { ErrorDto } from '../common/dto/error.dto';

@ApiTags('variants')
@Controller('products/:productId/variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @ApiOperation({ summary: "List a product's variants" })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, type: [ProductVariantDto] })
  @ApiResponse({ status: 404, type: ErrorDto })
  @HttpCode(HttpStatus.OK)
  @Get()
  findByProductId(
    @Param('productId') productId: number,
    @Query() { limit, offset }: PaginationParamsDto,
  ) {
    return this.variantsService.findByProductId(productId, limit, offset);
  }

  @ApiOperation({ summary: 'Create a product variant (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: ProductVariantDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Product'))
  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @Param('productId') productId: number,
    @Body() productVariantInputDto: ProductVariantInputDto,
  ) {
    return this.variantsService.create(productId, productVariantInputDto);
  }

  @ApiOperation({ summary: 'Update a product variant (manager only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: ProductVariantDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('update', 'Product'))
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
