import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants.js';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AdventurersController } from '../adventurers/adventurers.controller.js';
import { CredentialsController } from '../credentials/credentials.controller.js';
import { CreateUserDto, UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  function validateCreateUser(body: unknown) {
    return pipe.transform(body, { type: 'body', metatype: CreateUserDto });
  }

  it('should reject a client-supplied role', async () => {
    await expect(
      validateCreateUser({ username: 'mallory', password: 'secret', role: Role.ADMIN }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should reject missing credentials', async () => {
    await expect(validateCreateUser({ username: 'mallory' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('should always create users with the USER role', async () => {
    const usersService = { create: vi.fn().mockResolvedValue({ id: 'u1' }) };
    const controller = new UsersController(usersService as unknown as UsersService);

    const dto = await validateCreateUser({ username: 'rookie', password: 'secret' });
    await controller.createUser(dto);

    expect(usersService.create).toHaveBeenCalledWith({
      username: 'rookie',
      password: 'secret',
      role: Role.USER,
    });
  });
});

describe('Admin-only write endpoints', () => {
  it.each([
    ['POST /users', UsersController, 'createUser'],
    ['POST /adventurers', AdventurersController, 'createAdventurer'],
    ['POST /credentials', CredentialsController, 'createCredential'],
  ])('%s should require an authenticated ADMIN', (_route, controller, method) => {
    const handler = Object.getOwnPropertyDescriptor(controller.prototype, method)?.value;
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([Role.ADMIN]);
  });
});
