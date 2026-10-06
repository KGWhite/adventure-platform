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
      accentColor: '#b45309',
      accentLight: '#d97706',
      bgGlow: 'rgba(180, 83, 9, 0.12)',
      Icon: MilitaryTechOutlinedIcon,
      defaultTitle: '任務完成！',
      buttonBg: 'linear-gradient(135deg, #be123c 0%, #c2410c 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #e11d48 0%, #ea580c 100%)',
      buttonTextColor: '#ffffff',
    };
  }

  if (type === FEEDBACK_EVENT_TYPES.REWARD_GRANTED || key === FEEDBACK_ANIMATION_KEYS.REWARD_GRANT) {
    return {
      accentColor: '#c2410c',
      accentLight: '#ea580c',
      bgGlow: 'rgba(194, 65, 12, 0.12)',
      Icon: CardGiftcardOutlinedIcon,
      defaultTitle: '獲得獎勵！',
      buttonBg: 'linear-gradient(135deg, #be123c 0%, #c2410c 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #e11d48 0%, #ea580c 100%)',
      buttonTextColor: '#ffffff',
    };
  }

  if (type === FEEDBACK_EVENT_TYPES.RANK_PROMOTED || key === FEEDBACK_ANIMATION_KEYS.RANK_PROMOTE) {
    return {
      accentColor: '#be123c',
      accentLight: '#e11d48',
      bgGlow: 'rgba(190, 18, 60, 0.12)',
      Icon: StarsOutlinedIcon,
      defaultTitle: '階級晉升！',
      buttonBg: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
      buttonTextColor: '#ffffff',
    };
  }

  if (type === FEEDBACK_EVENT_TYPES.CREDENTIAL_ACCEPTED || key === FEEDBACK_ANIMATION_KEYS.CREDENTIAL_ACCEPT) {
    return {
      accentColor: '#1d4ed8',
      accentLight: '#2563eb',
      bgGlow: 'rgba(29, 78, 216, 0.12)',
      Icon: VerifiedUserOutlinedIcon,
      defaultTitle: '憑證辨識成功！',
      buttonBg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
      buttonHoverBg: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
      buttonTextColor: '#ffffff',
    };
  }

  // SPECIAL_ACHIEVEMENT or default
  return {
    accentColor: '#b45309',
    accentLight: '#d97706',
    bgGlow: 'rgba(180, 83, 9, 0.12)',
    Icon: AutoAwesomeOutlinedIcon,
    defaultTitle: '成就達成！',
    buttonBg: 'linear-gradient(135deg, #be123c 0%, #c2410c 100%)',
    buttonHoverBg: 'linear-gradient(135deg, #e11d48 0%, #ea580c 100%)',
    buttonTextColor: '#ffffff',
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
            backgroundColor: 'rgba(45, 36, 30, 0.65)',
            backdropFilter: 'blur(8px)',
            transition: 'opacity 0.25s ease',
          },
        },
        paper: {
          sx: {
            position: 'relative',
            m: { xs: 2, sm: 3 },
            p: { xs: 3, sm: 4 },
            borderRadius: { xs: 4, sm: 5 },
            border: '2px solid #d5c4a6',
            background: 'linear-gradient(180deg, #fffdf9 0%, #f7f2e5 100%)',
            boxShadow: '0 16px 48px rgba(78, 52, 28, 0.22), 0 4px 16px rgba(78, 52, 28, 0.12)',
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
            background: 'linear-gradient(135deg, #fffdf9 0%, #f3ebd9 100%)',
            border: `2.5px solid ${visualConfig.accentColor}`,
            color: visualConfig.accentColor,
            boxShadow: '0 4px 16px rgba(180, 83, 9, 0.2)',
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
        variant="h4"
        component="h2"
        sx={{
          fontWeight: 900,
          letterSpacing: 0.5,
          color: '#be123c',
          mb: message || value ? 1.25 : 2.5,
          fontSize: { xs: '1.55rem', sm: '1.85rem' },
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
            lineHeight: 1.6,
            mb: value ? 2.25 : 3,
            px: 1,
            fontSize: { xs: '1.05rem', sm: '1.15rem' },
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
            gap: 1.25,
            mx: 'auto',
            mb: 3.5,
            px: 3,
            py: 1.25,
            borderRadius: 99,
            backgroundColor: 'rgba(180, 83, 9, 0.10)',
            border: '1.5px solid rgba(180, 83, 9, 0.35)',
            boxShadow: '0 2px 8px rgba(180, 83, 9, 0.10)',
            animation: isQuestComplete ? `${questMeritAppear} 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.62s both` : undefined,
            '@media (prefers-reduced-motion: reduce)': {
              animation: `${reducedMotionFade} 0.15s ease-out both`,
              transform: 'none',
            },
          }}
        >
          <AutoAwesomeOutlinedIcon
            sx={{
              fontSize: 22,
              color: visualConfig.accentColor,
            }}
          />
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontWeight: 900,
              color: visualConfig.accentColor,
              letterSpacing: 0.5,
              fontSize: { xs: '1.15rem', sm: '1.35rem' },
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
              py: 1.6,
              borderRadius: 3,
              fontWeight: 800,
              fontSize: { xs: '1.05rem', sm: '1.125rem' },
              color: visualConfig.buttonTextColor || '#ffffff',
              background: visualConfig.buttonBg,
              boxShadow: '0 3px 14px rgba(190, 18, 60, 0.3)',
              '&:hover': {
                background: visualConfig.buttonHoverBg,
                boxShadow: '0 5px 20px rgba(190, 18, 60, 0.4)',
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
