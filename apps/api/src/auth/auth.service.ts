import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcryptjs from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { sanitizeUser } from '../users/users.service.js';

export class LoginDto {
  username!: string;
  password!: string;
}


@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isMatch = await bcryptjs.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return sanitizeUser(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adventurerProfile: {
          include: {
            currentRank: true,
            credentials: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return sanitizeUser(user);
  }
}
