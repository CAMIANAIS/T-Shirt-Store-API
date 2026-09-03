import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { SignUpDto } from './dto/signup.dto';
import { SignOutDto } from './dto/signout.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { JWTAuthGuard } from './guards/jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgotPassword.dto';
import { ResetPasswordDto } from './dto/resetpassword.dto';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthDto } from './dto/auth.dto';

interface JwtPayload {
  sub: number;
}
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Logs user into the system' })
  @ApiResponse({ status: 200, type: AuthDto })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }
  @ApiOperation({ summary: 'Create user' })
  @ApiResponse({ status: 201, type: AuthDto })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('signup')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @ApiOperation({ summary: 'Logs out current logged-in user' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200 })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JWTAuthGuard)
  @Post('signout')
  signOut(@CurrentUser() user: JwtPayload, @Body() signOutDto: SignOutDto) {
    return this.authService.signOut(user.sub, signOutDto.token);
  }

  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200 })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgotpassword')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200 })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resetpassword')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }
}
