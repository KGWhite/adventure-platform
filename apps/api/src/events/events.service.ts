import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type {
  AdventurerLevelUpData,
  BattleAttackData,
  BattleDamageData,
  BattleDefeatData,
  BattleStartedData,
  BattleVictoryData,
  CardScannedData,
  EquipmentChangedData,
  GameEvent,
  GameEventType,
  PlayerScannedData,
  QuestAcceptedData,
  QuestCompletedData,
  QuestProgressUpdatedData,
  QuestRewardClaimedData,
  RewardReceivedData,
  ShopPurchaseCompletedData,
  SkillCastData,
  ShopItemPreviewedData,
  SkillFizzledData,
  StageChangedData,
  StationClearedData,
} from './events.types.js';
import { PureWebSocketServer } from './websocket.server.js';

interface SseClient {
  id: string;
  displayId: string;
  res: Response;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly wsServer = new PureWebSocketServer();
  private readonly sseClients = new Map<string, SseClient>();

  getWsServer(): PureWebSocketServer {
    return this.wsServer;
  }

  addSseClient(id: string, displayId: string, res: Response) {
    this.sseClients.set(id, { id, displayId, res });
    this.logger.log(`SSE client connected: ${id} (display: ${displayId})`);

    // Send connection greeting
    res.write(
      `data: ${JSON.stringify({
        type: 'connection.established',
        timestamp: new Date().toISOString(),
        displayId,
        data: { message: 'SSE connection established', displayId },
      })}\n\n`,
    );

    res.on('close', () => {
      this.sseClients.delete(id);
      this.logger.log(`SSE client disconnected: ${id}`);
    });
  }

  emit<T>(type: GameEventType, displayId: string, data: T): GameEvent<T> {
    const event: GameEvent<T> = {
      type,
      timestamp: new Date().toISOString(),
      displayId,
      data,
    };

    // 1. Dispatch to WebSocket
    this.wsServer.broadcast(event);

    // 2. Dispatch to SSE
    const ssePayload = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of this.sseClients.values()) {
      if (client.displayId === displayId || displayId === 'all') {
        client.res.write(ssePayload);
      }
    }

    this.logger.log(`[Event ${type}] -> ${displayId} (${JSON.stringify(data)})`);
    return event;
  }

  emitPlayerScanned(displayId: string, data: PlayerScannedData) {
    return this.emit('player.scanned', displayId, data);
  }

  emitBattleStarted(displayId: string, data: BattleStartedData) {
    return this.emit('battle.started', displayId, data);
  }

  emitBattleAttack(displayId: string, data: BattleAttackData) {
    return this.emit('battle.attack', displayId, data);
  }

  emitBattleDamage(displayId: string, data: BattleDamageData) {
    return this.emit('battle.damage', displayId, data);
  }

  emitBattleVictory(displayId: string, data: BattleVictoryData) {
    return this.emit('battle.victory', displayId, data);
  }

  emitBattleDefeat(displayId: string, data: BattleDefeatData) {
    return this.emit('battle.defeat', displayId, data);
  }

  emitRewardReceived(displayId: string, data: RewardReceivedData) {
    return this.emit('reward.received', displayId, data);
  }

  emitQuestAccepted(displayId: string, data: QuestAcceptedData) {
    return this.emit('quest.accepted', displayId, data);
  }

  emitQuestProgressUpdated(displayId: string, data: QuestProgressUpdatedData) {
    return this.emit('quest.progress_updated', displayId, data);
  }

  emitQuestCompleted(displayId: string, data: QuestCompletedData) {
    return this.emit('quest.completed', displayId, data);
  }

  emitQuestRewardClaimed(displayId: string, data: QuestRewardClaimedData) {
    return this.emit('quest.reward_claimed', displayId, data);
  }

  emitShopPurchaseCompleted(displayId: string, data: ShopPurchaseCompletedData) {
    return this.emit('shop.purchase_completed', displayId, data);
  }

  emitEquipmentChanged(displayId: string, data: EquipmentChangedData) {
    return this.emit('equipment.changed', displayId, data);
  }

  emitCardScanned(displayId: string, data: CardScannedData) {
    return this.emit('card.scanned', displayId, data);
  }

  emitSkillCast(displayId: string, data: SkillCastData) {
    return this.emit('skill.cast', displayId, data);
  }

  emitSkillFizzled(displayId: string, data: SkillFizzledData) {
    return this.emit('skill.fizzled', displayId, data);
  }

  emitAdventurerLevelUp(displayId: string, data: AdventurerLevelUpData) {
    return this.emit('adventurer.level_up', displayId, data);
  }

  emitStageChanged(data: StageChangedData) {
    return this.emit('stage.changed', 'all', data);
  }

  emitStatusViewed<T>(displayId: string, data: T) {
    return this.emit('status.viewed', displayId, data);
  }

  // Scan results mirrored to big screens, so adventurers see what the
  // staff phone shows (shop offers, guild quests and equipment)
  emitShopScanned<T>(displayId: string, data: T) {
    return this.emit('shop.scanned', displayId, data);
  }

  emitShopItemPreviewed(displayId: string, data: ShopItemPreviewedData) {
    return this.emit('shop.item_previewed', displayId, data);
  }

  emitGuildScanned<T>(displayId: string, data: T) {
    return this.emit('guild.scanned', displayId, data);
  }

  emitStationCleared(data: StationClearedData) {
    return this.emit('station.cleared', data.nodeId, data);
  }
}
