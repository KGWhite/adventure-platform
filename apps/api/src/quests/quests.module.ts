import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EventsModule } from '../events/events.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { ProgressionModule } from '../progression/progression.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [PrismaModule, CredentialsModule, EventsModule, InventoryModule, ProgressionModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
