import type { FeedbackEvent } from '../../types/feedback.js';
import { FEEDBACK_EVENT_TYPES, FEEDBACK_ANIMATION_KEYS } from '../../types/feedback.js';

/**
 * Domain-oriented response payload returned by the backend upon quest completion.
 * The backend strictly describes domain facts (what happened, IDs, merit change),
 * remaining free of UI/CSS/animation coupling.
 */
export interface QuestCompletionResponse {
  success: boolean;
  quest?: {
    id: string;
    title: string;
  };
  questCompletion?: {
    id: string;
    status: string;
    completedAt?: string;
  };
  meritGranted?: number;
}

/**
 * Transforms a backend QuestCompletion domain response into a frontend FeedbackEvent.
 *
 * Extension Point:
 * This transformer cleanly isolates the domain response from the presentation layer.
 * Future event sources (such as WebSocket messages, SSE streams, or message brokers)
 * can pass their domain payloads through this same transformer, allowing the
 * GameFeedbackOverlay to react consistently regardless of whether the event
 * originated from a local REST API response or a future real-time event stream.
 */
export function questCompletionToFeedbackEvent(
  data: QuestCompletionResponse,
): FeedbackEvent {
  const questTitle = data.quest?.title;
  return {
    type: FEEDBACK_EVENT_TYPES.QUEST_COMPLETED,
    title: '任務完成！',
    message: questTitle ? `完成「${questTitle}」` : '成功完成公會委託任務',
    value: data.meritGranted !== undefined ? `+${data.meritGranted} 公會功績` : undefined,
    animationKey: FEEDBACK_ANIMATION_KEYS.QUEST_COMPLETE,
  };
}
