import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderParamsDto } from './dto/orderParams.dto';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtUser } from '../casl/casl-ability.factory';
import { OrderDto } from './dto/order.dto';
import { ErrorDto } from '../common/dto/error.dto';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: "Get the authenticated user's own orders" })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'minAmount', required: false })
  @ApiQuery({ name: 'maxAmount', required: false })
  @ApiResponse({ status: 200, type: [OrderDto] })
  @ApiResponse({ status: 400, type: ErrorDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'Order'))
  @Get('orders')
  getMyOrders(@CurrentUser() userId: JwtUser, @Query() dto: OrderParamsDto) {
    return this.ordersService.getOrders(dto, userId.sub);
  }
}
