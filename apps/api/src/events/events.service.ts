import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type {
  BattleAttackData,
  BattleDamageData,
  BattleDefeatData,
  BattleStartedData,
  BattleVictoryData,
  GameEvent,
  GameEventType,
  PlayerScannedData,
  QuestAcceptedData,
  QuestCompletedData,
  QuestProgressUpdatedData,
  QuestRewardClaimedData,
  RewardReceivedData,
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
}
