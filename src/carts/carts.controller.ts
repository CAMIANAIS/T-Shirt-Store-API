import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartItemInputDto } from './dto/cartItemInput.dto';
import { CartItemUpdateDto } from './dto/cartItemUpdate.dto';
import { CartDto, LineItemDto } from './dto/cart.dto';
import { ErrorDto } from '../common/dto/error.dto';
interface JwtPayload {
  sub: number;
}
@ApiTags('carts')
@ApiBearerAuth()
@Controller('carts')
export class CartsController {
  constructor(private readonly cartService: CartsService) {}

  @ApiOperation({ summary: "Get the authenticated user's cart" })
  @ApiResponse({ status: 200, type: CartDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @HttpCode(HttpStatus.OK)
  @Get()
  getCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(user.sub);
  }

  @ApiOperation({ summary: 'Add a product variant to the cart' })
  @ApiResponse({ status: 201, type: CartDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @Post('items')
  addItem(
    @CurrentUser() user: JwtPayload,
    @Body() cartItemInputDto: CartItemInputDto,
  ) {
    return this.cartService.addItem(user.sub, cartItemInputDto);
  }

  @ApiOperation({ summary: 'Update a cart line item quantity' })
  @ApiResponse({ status: 200, type: LineItemDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @Patch('items/:itemId')
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Body() cartItemUpdateDto: CartItemUpdateDto,
    @Param('itemId') itemId: number,
  ) {
    return this.cartService.updateItem(
      user.sub,
      itemId,
      cartItemUpdateDto.quantity,
    );
  }

  @ApiOperation({
    summary: 'Remove a line item from the cart',
    description:
      'Idempotent: returns 204 even if the item was already removed or never existed.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @HttpCode(204)
  @Delete('/items/:itemId')
  async removeItem(
    @Param('itemId') itemId: number,
    @CurrentUser() userId: JwtPayload,
  ): Promise<void> {
    return this.cartService.removeItem(userId.sub, itemId);
  }

  @ApiOperation({ summary: "Clear the authenticated user's cart" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @HttpCode(204)
  @Delete()
  async clearCart(@CurrentUser() userId: JwtPayload): Promise<void> {
    return this.cartService.clearCart(userId.sub);
  }
}
