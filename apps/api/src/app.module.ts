import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AdventurersModule } from './adventurers/adventurers.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CredentialsModule } from './credentials/credentials.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { QuestsModule } from './quests/quests.module.js';
import { RanksModule } from './ranks/ranks.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    UsersModule,
    AdventurersModule,
    RanksModule,
    CredentialsModule,
    QuestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
