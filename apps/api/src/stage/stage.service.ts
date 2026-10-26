import { Injectable } from '@nestjs/common';
import { EventsService } from '../events/events.service.js';
import type { StageState } from './stage.types.js';
import type { StationNodeId } from './stations.js';

// Holds the station the single staff phone is currently operating, so the
// follow-mode /display can switch with it. Kept in memory: an API restart
// returns the display to its idle screen.
@Injectable()
export class StageService {
  private state: StageState = { nodeId: null, updatedAt: new Date().toISOString() };

  constructor(private readonly eventsService: EventsService) {}

  getStage(): StageState {
    return this.state;
  }

  setStage(nodeId: StationNodeId | null): StageState {
    const previousNodeId = this.state.nodeId;
    if (previousNodeId === nodeId) {
      return this.state;
    }

    this.state = { nodeId, updatedAt: new Date().toISOString() };
    this.eventsService.emitStageChanged({ nodeId, previousNodeId });
    return this.state;
  }

  // The staff member finished with an adventurer ("下一位" / "換卡"); the
  // station's big screen goes back to its idle view
  clearStation(nodeId: StationNodeId): void {
    this.eventsService.emitStationCleared({ nodeId });
  }
}
