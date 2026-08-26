import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { PrismaService } from '../prisma/prisma.service';
const saltOrRounds = 10;

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private prismaService: PrismaService,
  ) {}
  async hashPassword(password: string) {
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
  }

  async comparePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.userService.userByEmail(email);
    if (user === null) {
      throw new UnauthorizedException();
    }
    const isPasswordValid = await this.comparePassword(
      pass,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException();
    }
    const payload = { sub: user.user_id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signUp(dto: SignUpDto): Promise<{ access_token: string }> {
    const existingUser = await this.userService.userByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }
    const password_hash = await this.hashPassword(dto.password);

    const clientRole = await this.prismaService.roles.findUnique({
      where: { name: 'client' },
    });

    if (!clientRole) {
      throw new Error('Client role not found');
    }

    const user = await this.userService.createUser(
      dto.email,
      dto.username,
      password_hash,
      clientRole.role_id,
      dto.birthdate,
    );

    const payload = { sub: user.user_id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
