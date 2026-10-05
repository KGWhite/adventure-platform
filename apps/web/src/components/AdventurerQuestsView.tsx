import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { useNavigation } from '../router/Router.js';
import { useAuth, API_BASE_URL } from '../context/AuthContext.js';
import { PageHeader } from './common/index.js';
import { GameFeedbackOverlay, questCompletionToFeedbackEvent } from './feedback/index.js';
import type { FeedbackEvent } from '../types/feedback.js';
import type { QuestCompletionResponse } from './feedback/index.js';

interface QuestItem {
  id: string;
  title: string;
  description: string;
  meritReward: number;
  enabled: boolean;
  requiredRank?: {
    code: string;
    name: string;
  };
}

export function AdventurerQuestsView() {
  const { navigate } = useNavigation();
  const { token } = useAuth();

  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingQuestId, setSubmittingQuestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackEvent, setFeedbackEvent] = useState<FeedbackEvent | null>(null);

  // Fetch quests from backend API
  const loadQuests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/quests`);
      if (res.ok) {
        const data: QuestItem[] = await res.json();
        setQuests(data);
      } else {
        // Fallback default quest item if backend list is empty or seeding starter
        setQuests([
          {
            id: 'quest-starter-001',
            title: '公會登錄與資格確認',
            description: '前往冒險者公會櫃檯完成新人登記，確認資格證與基礎配備。',
            meritReward: 50,
            enabled: true,
            requiredRank: { code: 'F', name: 'Rank F' },
          },
        ]);
      }
    } catch {
      // Fallback starter quest for development/offline inspection
      setQuests([
        {
          id: 'quest-starter-001',
          title: '公會登錄與資格確認',
          description: '前往冒險者公會櫃檯完成新人登記，確認資格證與基礎配備。',
          meritReward: 50,
          enabled: true,
          requiredRank: { code: 'F', name: 'Rank F' },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  /**
   * Action handler connected directly to the backend API:
   * Flow: User action -> API request -> Backend validation -> DB update -> API success -> Frontend FeedbackEvent -> Animation.
   * On API failure: Do NOT play success animation; display error message instead.
   */
  const handleCompleteQuest = async (questId: string) => {
    if (submittingQuestId) return; // Prevent repeated double triggering

    setError(null);
    setSubmittingQuestId(questId);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/quests/${questId}/complete`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.message || `任務回報失敗 (HTTP ${res.status})。請確認身分驗證或重試。`;
        // Strictly avoid playing success animation on API failure
        setError(msg);
        return;
      }

      // API confirms success
      const result: QuestCompletionResponse = await res.json();

      // Transform backend domain result into frontend FeedbackEvent
      const event = questCompletionToFeedbackEvent(result);

      // Trigger local visual feedback overlay
      setFeedbackEvent(event);
    } catch (err: unknown) {
      // Network or execution failure: never trigger animation
      const msg = err instanceof Error ? err.message : '連線逾時或網路錯誤，請稍後再試。';
      setError(msg);
    } finally {
      setSubmittingQuestId(null);
    }
  };

  /**
   * Test action to explicitly verify API failure handling:
   * Intentionally calls an invalid endpoint to verify that error UI displays
   * and NO success animation is played.
   */
  const handleTestApiFailure = async () => {
    if (submittingQuestId) return;
    setError(null);
    setSubmittingQuestId('test-failure');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/quests/non-existent-quest-999/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.message || `預期的 API 錯誤回應 (HTTP ${res.status})：系統正確拒絕，未觸發成功動效。`;
        setError(msg);
      }
    } catch {
      setError('模擬 API 請求失敗：連線錯誤，未觸發成功動效。');
    } finally {
      setSubmittingQuestId(null);
    }
  };

  return (
    <Box sx={{ width: '100%', py: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="公會任務告示欄"
        subtitle="承接公會委託任務，完成後可累積公會功績以爭取晉升。"
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackOutlinedIcon />}
            onClick={() => navigate('/user')}
            sx={{ borderRadius: 2 }}
          >
            返回總覽
          </Button>
        }
      />

      {/* Error Feedback Banner (Displayed on API failure) */}
      {error && (
        <Alert
          severity="error"
          variant="filled"
          icon={<ErrorOutlineRoundedIcon />}
          onClose={() => setError(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Loading Indicator */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {quests.map((quest) => {
            const isSubmitting = submittingQuestId === quest.id;
            return (
              <Card
                key={quest.id}
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  p: { xs: 1, sm: 1.5 },
                  transition: 'border-color 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700 }}>
                      {quest.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {quest.requiredRank && (
                        <Chip
                          label={quest.requiredRank.name}
                          size="small"
                          color="default"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        icon={<MilitaryTechOutlinedIcon />}
                        label={`+${quest.meritReward} 功績`}
                        size="small"
                        color="warning"
                        variant="filled"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {quest.description}
                  </Typography>

                  {/* Actions for Mobile / Desktop */}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ justifyContent: 'flex-end' }}
                  >
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting || Boolean(submittingQuestId)}
                      onClick={() => handleCompleteQuest(quest.id)}
                      startIcon={
                        isSubmitting ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <CheckCircleOutlineRoundedIcon />
                        )
                      }
                      sx={{
                        py: 1.25,
                        px: 3,
                        borderRadius: 2.5,
                        fontWeight: 700,
                        minHeight: 44, // Touch target friendly for mobile/PWA
                      }}
                    >
                      {isSubmitting ? '回報審核中...' : '回報完成任務'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}

          {/* Test API Failure Button to validate that failure DOES NOT play animation */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              ⚙️ 驗證工具：測試 API 失敗情境（確認失敗時絕不觸發成功動效，僅顯示錯誤提示）
            </Typography>
            <Button
              variant="outlined"
              color="error"
              size="small"
              disabled={Boolean(submittingQuestId)}
              onClick={handleTestApiFailure}
              sx={{ borderRadius: 2 }}
            >
              測試 API 失敗情境 (驗證不播放動畫)
            </Button>
          </Box>
        </Stack>
      )}

      {/* Game Feedback Overlay triggered ONLY on API success */}
      <GameFeedbackOverlay
        event={feedbackEvent}
        onClose={() => setFeedbackEvent(null)}
      />
    </Box>
  );
}
