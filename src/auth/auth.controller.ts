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

interface JwtPayload {
  sub: number;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }
  @Post('signup')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }
  @HttpCode(HttpStatus.OK)
  @UseGuards(JWTAuthGuard)
  @Post('signout')
  signOut(@CurrentUser() user: JwtPayload, @Body() signOutDto: SignOutDto) {
    return this.authService.signOut(user.sub, signOutDto.token);
  }
}
