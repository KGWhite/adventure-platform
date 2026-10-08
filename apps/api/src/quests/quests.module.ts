import { Module } from '@nestjs/common';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { EventsModule } from '../events/events.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { QuestsController } from './quests.controller.js';
import { QuestsService } from './quests.service.js';

@Module({
  imports: [PrismaModule, CredentialsModule, EventsModule],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
