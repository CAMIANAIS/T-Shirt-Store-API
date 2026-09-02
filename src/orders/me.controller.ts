import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderParamsDto } from './dto/orderParams.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface JwtPayload {
  sub: number;
}

@Controller('me')
export class MeController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'Order'))
  @Get('orders')
  getMyOrders(@CurrentUser() userId: JwtPayload, @Query() dto: OrderParamsDto) {
    return this.ordersService.getOrders(dto, userId.sub);
  }
}
