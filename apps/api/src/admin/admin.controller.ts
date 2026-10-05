import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  async getSummary() {
    const [totalUsers, totalAdventurers, totalRanks, totalCredentials] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.adventurerProfile.count(),
      this.prisma.rank.count(),
      this.prisma.credential.count(),
    ]);

    return {
      status: 'ok',
      metrics: {
        totalUsers,
        totalAdventurers,
        totalRanks,
        totalCredentials,
      },
    };
  }
}
