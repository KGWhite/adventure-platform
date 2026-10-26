import { Module } from '@nestjs/common';
import { ActionCardsModule } from './action-cards/action-cards.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AdventurersModule } from './adventurers/adventurers.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { BattlesModule } from './battles/battles.module.js';
import { BossesModule } from './bosses/bosses.module.js';
import { CredentialsModule } from './credentials/credentials.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProgressionModule } from './progression/progression.module.js';
import { QuestsModule } from './quests/quests.module.js';
import { RanksModule } from './ranks/ranks.module.js';
import { ShopsModule } from './shops/shops.module.js';
import { StageModule } from './stage/stage.module.js';
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
    EventsModule,
    BossesModule,
    BattlesModule,
    InventoryModule,
    ShopsModule,
    ActionCardsModule,
    ProgressionModule,
    StageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
