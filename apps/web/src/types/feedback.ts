export const FEEDBACK_EVENT_TYPES = {
  QUEST_COMPLETED: 'QUEST_COMPLETED',
  REWARD_GRANTED: 'REWARD_GRANTED',
  RANK_PROMOTED: 'RANK_PROMOTED',
  CREDENTIAL_ACCEPTED: 'CREDENTIAL_ACCEPTED',
  SPECIAL_ACHIEVEMENT: 'SPECIAL_ACHIEVEMENT',
} as const;

export type KnownFeedbackEventType =
  (typeof FEEDBACK_EVENT_TYPES)[keyof typeof FEEDBACK_EVENT_TYPES];

export type FeedbackEventType = KnownFeedbackEventType | (string & {});

export const FEEDBACK_ANIMATION_KEYS = {
  QUEST_COMPLETE: 'quest-complete',
  REWARD_GRANT: 'reward-grant',
  RANK_PROMOTE: 'rank-promote',
  CREDENTIAL_ACCEPT: 'credential-accept',
  SPECIAL_ACHIEVEMENT: 'special-achievement',
} as const;

export type KnownFeedbackAnimationKey =
  (typeof FEEDBACK_ANIMATION_KEYS)[keyof typeof FEEDBACK_ANIMATION_KEYS];

export type FeedbackAnimationKey = KnownFeedbackAnimationKey | (string & {});

export interface FeedbackEvent {
  id?: string;
  type: FeedbackEventType;
  title: string;
  message?: string;
  value?: string;
  animationKey?: FeedbackAnimationKey;
  durationMs?: number;
}
