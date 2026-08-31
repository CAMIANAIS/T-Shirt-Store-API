import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
}
