import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from './roles.decorator.js';

// World node operations that change game state: only staff (or admins)
// operating a station may call them.
export const StaffOnly = () =>
  applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(Role.STAFF, Role.ADMIN));
