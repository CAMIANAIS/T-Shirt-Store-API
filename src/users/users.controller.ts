import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/policies.decorator';
import { AppAbility } from '../casl/casl-ability.factory';
import { UserDto } from './dto/user.dto';
import { ErrorDto } from '../common/dto/error.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List users (manager only)' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, type: [UserDto] })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'User'))
  @Get()
  findAll(@Query('limit') limit: number, @Query('offset') offset: number) {
    return this.usersService.findAll(limit, offset);
  }

  @ApiOperation({ summary: 'Get a user by id (manager only)' })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('read', 'User'))
  @Get(':userId')
  findOne(@Param('userId') userId: number) {
    return this.usersService.findOne(userId);
  }

  @ApiOperation({ summary: 'Delete a user (manager only)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 403, type: ErrorDto })
  @ApiResponse({ status: 404, type: ErrorDto })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JWTAuthGuard, PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can('delete', 'User'))
  @Delete(':userId')
  remove(@Param('userId') userId: number) {
    return this.usersService.remove(userId);
  }
}
