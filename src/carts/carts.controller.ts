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
import { CartsService } from './carts.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CartItemInputDto } from './dto/cartItemInput.dto';
import { CartItemUpdateDto } from './dto/cartItemUpdate.dto';
interface JwtPayload {
  sub: number;
}
@Controller('carts')
export class CartsController {
  constructor(private readonly cartService: CartsService) {}
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @HttpCode(HttpStatus.OK)
  @Get()
  getCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(user.sub);
  }

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @Post('items')
  addItem(
    @CurrentUser() user: JwtPayload,
    @Body() cartItemInputDto: CartItemInputDto,
  ) {
    return this.cartService.addItem(user.sub, cartItemInputDto);
  }

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

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('manage', 'Cart'))
  @HttpCode(204)
  @Delete()
  async clearCart(@CurrentUser() userId: JwtPayload): Promise<void> {
    return this.cartService.clearCart(userId.sub);
  }
}
