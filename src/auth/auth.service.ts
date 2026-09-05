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
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
const saltOrRounds = 10;

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    private prismaService: PrismaService,
    private emailService: EmailService,
  ) {}
  async hashPassword(password: string) {
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
  }

  async comparePassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  private hashtoken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  async issueRefreshToken(userId: number): Promise<string> {
    const token = this.generateRefreshToken();
    const tokenHash = this.hashtoken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prismaService.auth_tokens.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        type: 'refresh',
        revoked: false,
        expires_at: expiresAt,
      },
    });
    return token;
  }
  async signIn(
    email: string,
    pass: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
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
    const clientRole = await this.prismaService.roles.findUnique({
      where: { role_id: user.role_id },
    });
    const payload = {
      sub: user.user_id,
      email: user.email,
      role: clientRole?.name,
    };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.issueRefreshToken(user.user_id);
    return { access_token, refresh_token };
  }

  async signUp(
    dto: SignUpDto,
  ): Promise<{ access_token: string; refresh_token: string }> {
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

    const payload = {
      sub: user.user_id,
      email: user.email,
      role: clientRole.name,
    };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.issueRefreshToken(user.user_id);
    return { access_token, refresh_token };
  }

  async signOut(userId: number, token: string): Promise<void> {
    const tokenHash = this.hashtoken(token);

    await this.prismaService.auth_tokens.update({
      where: {
        token_hash: tokenHash,
        user_id: userId,
      },
      data: { revoked: true },
    });
  }
  // Same response whether or not the email exists, to avoid leaking which
  // emails are registered. Token is logged, not returned — no email system
  // yet to actually deliver it.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userService.userByEmail(email);

    const token = this.generateRefreshToken();
    const tokenHash = this.hashtoken(token);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);
    if (user) {
      await this.prismaService.auth_tokens.create({
        data: {
          user_id: user.user_id,
          token_hash: tokenHash,
          type: 'reset',
          revoked: false,
          expires_at: expiresAt,
        },
      });
      return this.emailService.sendEmail(
        user.email,
        'Reset your password',
        `Your password reset token is: ${token}`,
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashtoken(token);

    const resetToken = await this.prismaService.auth_tokens.findFirst({
      where: {
        token_hash: tokenHash,
        type: 'reset',
        expires_at: { gt: new Date() },
        revoked: false,
      },
    });
    if (resetToken === null) {
      throw new UnauthorizedException('invalid/expired/already-revoked token');
    }

    const password_hash = await this.hashPassword(newPassword);

    await this.prismaService.auth_tokens.update({
      where: {
        token_hash: tokenHash,
        user_id: resetToken.user_id,
      },
      data: { revoked: true },
    });
    const updateUser = await this.prismaService.users.update({
      where: {
        user_id: resetToken.user_id,
      },
      data: { password_hash: password_hash },
    });

    // If the password was compromised, any existing session using the old
    // password should be kicked out too, not just the reset token itself.
    await this.prismaService.auth_tokens.updateMany({
      where: {
        user_id: resetToken.user_id,
        type: 'refresh',
        revoked: false,
      },
      data: { revoked: true },
    });

    await this.emailService.sendEmail(
      updateUser.email,
      'Your password was changed',
      'Your password was succesfully changed',
    );
  }
}
