import { EventsService } from '../events/events.service.js';
import { StageService } from './stage.service.js';

describe('StageService', () => {
  let service: StageService;
  let emitStageChanged: ReturnType<typeof vi.fn>;
  let emitStationCleared: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emitStageChanged = vi.fn();
    emitStationCleared = vi.fn();
    service = new StageService({ emitStageChanged, emitStationCleared } as unknown as EventsService);
  });

  it('starts with no station selected', () => {
    expect(service.getStage().nodeId).toBeNull();
  });

  it('switches station and announces the previous one', () => {
    service.setStage('guild-01');
    const state = service.setStage('shop-01');

    expect(state.nodeId).toBe('shop-01');
    expect(service.getStage()).toEqual(state);
    expect(emitStageChanged).toHaveBeenLastCalledWith({
      nodeId: 'shop-01',
      previousNodeId: 'guild-01',
    });
  });

  it('does not re-announce the current station', () => {
    service.setStage('boss-01');
    const before = service.getStage();
    const after = service.setStage('boss-01');

    expect(after).toBe(before);
    expect(emitStageChanged).toHaveBeenCalledTimes(1);
  });

  it('returns to the idle screen with null', () => {
    service.setStage('status-01');
    service.setStage(null);

    expect(service.getStage().nodeId).toBeNull();
    expect(emitStageChanged).toHaveBeenLastCalledWith({ nodeId: null, previousNodeId: 'status-01' });
  });

  it('clears a station without changing the current one', () => {
    service.setStage('shop-01');
    service.clearStation('shop-01');

    expect(emitStationCleared).toHaveBeenCalledWith({ nodeId: 'shop-01' });
    expect(service.getStage().nodeId).toBe('shop-01');
    expect(emitStageChanged).toHaveBeenCalledTimes(1);
  });
});
