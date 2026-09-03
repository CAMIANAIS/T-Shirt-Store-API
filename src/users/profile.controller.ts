import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JWTAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateMeDto } from './dto/updateMe.dto';
import { UserDto } from './dto/user.dto';
import { ErrorDto } from '../common/dto/error.dto';

interface JwtPayload {
  sub: number;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('me')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "Get the authenticated user's own profile" })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @UseGuards(JWTAuthGuard)
  @Get()
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findOne(user.sub);
  }

  @ApiOperation({
    summary: "Update the authenticated user's own profile",
    description:
      'Only username and birthdate can be changed here -- never role or email.',
  })
  @ApiResponse({ status: 200, type: UserDto })
  @ApiResponse({ status: 401, type: ErrorDto })
  @ApiResponse({ status: 409, type: ErrorDto })
  @ApiResponse({ status: 422, type: ErrorDto })
  @UseGuards(JWTAuthGuard)
  @Patch()
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.usersService.updateOwnProfile(user.sub, dto);
  }
}
