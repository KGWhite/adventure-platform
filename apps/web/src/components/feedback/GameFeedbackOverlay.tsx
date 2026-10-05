import React, { useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import StarsOutlinedIcon from '@mui/icons-material/StarsOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { keyframes } from '@emotion/react';
import type { FeedbackEvent } from '../../types/feedback.js';
import { FEEDBACK_EVENT_TYPES, FEEDBACK_ANIMATION_KEYS } from '../../types/feedback.js';

// Sequence 1: Overlay appears
const questOverlayAppear = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.92);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

// Sequence 2: Badge / icon scales in with elastic bounce
const questBadgeScaleIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.18);
  }
  65% {
    opacity: 1;
    transform: scale(1.18);
  }
  85% {
    transform: scale(0.94);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

// Ambient pulsing ring after badge entrance
const badgePulseGlow = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 38px rgba(245, 158, 11, 0.75);
  }
`;

// Sequence 3: Title fades in
const questTitleFadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(14px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Sequence 3.5: Message fades in
const questMessageFadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Sequence 4: Merit value appears with celebratory pop
const questMeritAppear = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.65) translateY(12px);
  }
  68% {
    opacity: 1;
    transform: scale(1.1) translateY(-2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

// Sequence 5: Action button ready
const questActionFadeIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const sparkleFloatKeyframes = keyframes`
  0% {
    transform: rotate(0deg) scale(0.85);
    opacity: 0.5;
  }
  50% {
    transform: rotate(180deg) scale(1.15);
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) scale(0.85);
    opacity: 0.5;
  }
`;

// Fallback animation for prefers-reduced-motion
const reducedMotionFade = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

export interface GameFeedbackOverlayProps {
  /** The feedback event data to display */
  event?: FeedbackEvent | null;
  /** Controlled open state. If omitted, defaults to whether `event` is truthy. */
  open?: boolean;
  /** Callback triggered when the overlay is dismissed (tap, button, or timer) */
  onClose?: () => void;
  /**
   * Auto-hide duration in milliseconds.
   * If provided, overrides `event.durationMs`. Pass 0 or null to disable.
   */
  autoHideDuration?: number | null;
  /** Label for confirmation button. Defaults to '繼續冒險' */
  confirmText?: string;
  /** Optional custom action elements */
  actions?: React.ReactNode;
}

function getEventVisualConfig(event?: FeedbackEvent | null) {
  const type = event?.type;
  const key = event?.animationKey;

  if (type === FEEDBACK_EVENT_TYPES.QUEST_COMPLETED || key === FEEDBACK_ANIMATION_KEYS.QUEST_COMPLETE) {
    return {
      accentColor: '#f59e0b',
      accentLight: '#fbbf24',
      bgGlow: 'rgba(245, 158, 11, 0.16)',
      Icon: MilitaryTechOutlinedIcon,
      defaultTitle: '任務完成！',
      buttonBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    };
  }

  if (type === FEEDBACK_EVENT_TYPES.REWARD_GRANTED || key === FEEDBACK_ANIMATION_KEYS.REWARD_GRANT) {
    return {
      accentColor: '#10b981',
      accentLight: '#34d399',
      bgGlow: 'rgba(16, 185, 129, 0.16)',
      Icon: CardGiftcardOutlinedIcon,
      defaultTitle: '獲得獎勵！',
      buttonBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    };
  }

  if (type === FEEDBACK_EVENT_TYPES.RANK_PROMOTED || key === FEEDBACK_ANIMATION_KEYS.RANK_PROMOTE) {
    return {
      accentColor: '#818cf8',
      accentLight: '#a5b4fc',
      bgGlow: 'rgba(99, 102, 241, 0.22)',
      Icon: StarsOutlinedIcon,
      defaultTitle: '階級晉升！',
      buttonBg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
    };
  }

  if (type === FEEDBACK_EVENT_TYPES.CREDENTIAL_ACCEPTED || key === FEEDBACK_ANIMATION_KEYS.CREDENTIAL_ACCEPT) {
    return {
      accentColor: '#38bdf8',
      accentLight: '#7dd3fc',
      bgGlow: 'rgba(56, 189, 248, 0.16)',
      Icon: VerifiedUserOutlinedIcon,
      defaultTitle: '憑證辨識成功！',
      buttonBg: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)',
    };
  }

  // SPECIAL_ACHIEVEMENT or default
  return {
    accentColor: '#fbbf24',
    accentLight: '#fde68a',
    bgGlow: 'rgba(251, 191, 36, 0.16)',
    Icon: AutoAwesomeOutlinedIcon,
    defaultTitle: '成就達成！',
    buttonBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    buttonHoverBg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  };
}

export function GameFeedbackOverlay({
  event,
  open,
  onClose,
  autoHideDuration,
  confirmText = '繼續冒險',
  actions,
}: GameFeedbackOverlayProps) {
  const isOpen = open !== undefined ? open : Boolean(event);
  const visualConfig = getEventVisualConfig(event);
  const { Icon } = visualConfig;

  const isQuestComplete =
    event?.animationKey === FEEDBACK_ANIMATION_KEYS.QUEST_COMPLETE ||
    event?.type === FEEDBACK_EVENT_TYPES.QUEST_COMPLETED;

  useEffect(() => {
    if (!isOpen) return;

    // Sequence 5: Auto-close timer (can close automatically or by user action)
    let duration: number | null = null;
    if (autoHideDuration !== undefined) {
      duration = autoHideDuration;
    } else if (event?.durationMs !== undefined) {
      duration = event.durationMs;
    } else if (isQuestComplete) {
      duration = 4500;
    }

    if (duration && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoHideDuration, event?.durationMs, isQuestComplete, onClose]);

  if (!isOpen && !event) {
    return null;
  }

  const title = event?.title || visualConfig.defaultTitle;
  const message = event?.message;
  const value = event?.value;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="game-feedback-title"
      aria-describedby={message ? 'game-feedback-message' : undefined}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(6, 9, 18, 0.85)',
            backdropFilter: 'blur(10px)',
            transition: 'opacity 0.25s ease',
          },
        },
        paper: {
          sx: {
            position: 'relative',
            m: { xs: 2, sm: 3 },
            p: { xs: 3, sm: 4 },
            borderRadius: { xs: 4, sm: 5 },
            border: `1.5px solid ${visualConfig.accentColor}55`,
            background: `radial-gradient(ellipse at top, ${visualConfig.bgGlow} 0%, rgba(17, 23, 38, 0.98) 72%)`,
            boxShadow: `0 0 45px ${visualConfig.accentColor}33, 0 24px 48px rgba(0, 0, 0, 0.75)`,
            // Step 1: Overlay appears
            animation: `${questOverlayAppear} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both`,
            overflow: 'hidden',
            textAlign: 'center',
            '@media (prefers-reduced-motion: reduce)': {
              animation: `${reducedMotionFade} 0.15s ease-out both`,
              transform: 'none',
            },
          },
        },
      }}
    >
      {/* Quick Dismiss Button */}
      <IconButton
        onClick={onClose}
        aria-label="關閉"
        size="small"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          color: 'text.secondary',
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.12)',
            color: 'text.primary',
          },
        }}
      >
        <CloseOutlinedIcon fontSize="small" />
      </IconButton>

      {/* Decorative Sparkle Highlights */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 24,
          color: visualConfig.accentLight,
          animation: `${sparkleFloatKeyframes} 4s ease-in-out infinite`,
          pointerEvents: 'none',
          '@media (prefers-reduced-motion: reduce)': {
            animation: 'none',
            transform: 'none',
          },
        }}
      >
        <AutoAwesomeOutlinedIcon sx={{ fontSize: 20, opacity: 0.75 }} />
      </Box>

      {/* Sequence 2: Icon / Badge scales in with spring */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5, mt: 1 }}>
        <Box
          sx={{
            width: { xs: 80, sm: 96 },
            height: { xs: 80, sm: 96 },
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, ${visualConfig.accentColor}33 0%, ${visualConfig.bgGlow} 100%)`,
            border: `2px solid ${visualConfig.accentColor}`,
            color: visualConfig.accentLight,
            animation: isQuestComplete
              ? `${questBadgeScaleIn} 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.12s both, ${badgePulseGlow} 2.5s ease-in-out 0.6s infinite`
              : `${questBadgeScaleIn} 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both, ${badgePulseGlow} 2.5s ease-in-out 0.5s infinite`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: `${reducedMotionFade} 0.15s ease-out both`,
              transform: 'none',
              boxShadow: 'none',
            },
          }}
        >
          <Icon sx={{ fontSize: { xs: 44, sm: 54 } }} />
        </Box>
      </Box>

      {/* Sequence 3: Title fades in */}
      <Typography
        id="game-feedback-title"
        variant="h5"
        component="h2"
        sx={{
          fontWeight: 800,
          letterSpacing: 0.5,
          color: '#ffffff',
          textShadow: `0 2px 14px ${visualConfig.accentColor}88`,
          mb: message || value ? 1 : 2.5,
          fontSize: { xs: '1.35rem', sm: '1.6rem' },
          animation: isQuestComplete ? `${questTitleFadeIn} 0.35s ease-out 0.35s both` : undefined,
          '@media (prefers-reduced-motion: reduce)': {
            animation: `${reducedMotionFade} 0.15s ease-out both`,
            transform: 'none',
          },
        }}
      >
        ✨ {title} ✨
      </Typography>

      {/* Sequence 3.5: Message fades in */}
      {message && (
        <Typography
          id="game-feedback-message"
          variant="body1"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.5,
            mb: value ? 2 : 2.5,
            px: 1,
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            animation: isQuestComplete ? `${questMessageFadeIn} 0.3s ease-out 0.48s both` : undefined,
            '@media (prefers-reduced-motion: reduce)': {
              animation: `${reducedMotionFade} 0.15s ease-out both`,
              transform: 'none',
            },
          }}
        >
          {message}
        </Typography>
      )}

      {/* Sequence 4: Merit / value appears with pop-in */}
      {value && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            mx: 'auto',
            mb: 3,
            px: 2.5,
            py: 1,
            borderRadius: 99,
            backgroundColor: `${visualConfig.accentColor}18`,
            border: `1px solid ${visualConfig.accentColor}55`,
            boxShadow: `0 0 16px ${visualConfig.accentColor}25`,
            animation: isQuestComplete ? `${questMeritAppear} 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.62s both` : undefined,
            '@media (prefers-reduced-motion: reduce)': {
              animation: `${reducedMotionFade} 0.15s ease-out both`,
              transform: 'none',
            },
          }}
        >
          <AutoAwesomeOutlinedIcon
            sx={{
              fontSize: 18,
              color: visualConfig.accentLight,
            }}
          />
          <Typography
            variant="subtitle1"
            component="span"
            sx={{
              fontWeight: 800,
              color: visualConfig.accentLight,
              letterSpacing: 0.5,
              fontSize: { xs: '1rem', sm: '1.15rem' },
            }}
          >
            {value}
          </Typography>
        </Box>
      )}

      {/* Sequence 5: Actions fade in */}
      <Box
        sx={{
          mt: 1,
          width: '100%',
          animation: isQuestComplete ? `${questActionFadeIn} 0.3s ease-out 0.78s both` : undefined,
          '@media (prefers-reduced-motion: reduce)': {
            animation: `${reducedMotionFade} 0.15s ease-out both`,
            transform: 'none',
          },
        }}
      >
        {actions ? (
          actions
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={onClose}
            sx={{
              py: 1.25,
              borderRadius: 3,
              fontWeight: 700,
              fontSize: { xs: '0.95rem', sm: '1rem' },
              color: '#0f172a',
              background: visualConfig.buttonBg,
              boxShadow: `0 4px 16px ${visualConfig.accentColor}55`,
              '&:hover': {
                background: visualConfig.buttonHoverBg,
                boxShadow: `0 6px 22px ${visualConfig.accentColor}88`,
              },
              '&:active': {
                transform: 'scale(0.98)',
              },
              transition: 'transform 0.12s ease-in-out, box-shadow 0.2s ease',
            }}
          >
            {confirmText}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
