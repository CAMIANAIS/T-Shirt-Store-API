import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { users } from '../../generated/prisma/client';
@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  async userByEmail(email: string) {
    const user = await this.prismaService.users.findUnique({
      where: { email },
    });
    return user;
  }

  async createUser(
    email: string,
    username: string,
    password_hash: string,
    role_id: number,
    birthdate?: string,
  ): Promise<users> {
    const user = await this.prismaService.users.create({
      data: {
        email,
        username,
        password_hash,
        role_id,
        birthdate,
      },
    });

    return user;
  }
}
