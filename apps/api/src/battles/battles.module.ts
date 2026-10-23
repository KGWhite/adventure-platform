import { Module } from '@nestjs/common';
import { BossesModule } from '../bosses/bosses.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { BattlesController } from './battles.controller.js';
import { BattlesService } from './battles.service.js';

@Module({
  imports: [CredentialsModule, BossesModule, QuestsModule, InventoryModule],
  controllers: [BattlesController],
  providers: [BattlesService],
  exports: [BattlesService],
})
export class BattlesModule {}
