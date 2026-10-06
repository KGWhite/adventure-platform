import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';

import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import type { AdventurerProfile, Rank } from '../../types/auth.js';
import { RankBadge } from '../adventurer/RankBadge.js';
import { PageHeader, EmptyState, ErrorState } from '../common/index.js';

export interface AdminAdventurersViewProps {
  adventurers: AdventurerProfile[];
  ranks: Rank[];
  onRefresh: () => void;
  apiUrl: string;
  token: string | null;
}

export function AdminAdventurersView({
  adventurers,
  ranks,
  onRefresh,
  apiUrl,
  token,
}: AdminAdventurersViewProps) {
  // Detail Dialog State
  const [selectedAdventurer, setSelectedAdventurer] = useState<AdventurerProfile | null>(null);

  // Create Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [rankIdInput, setRankIdInput] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setUserIdInput('');
    setDisplayNameInput('');
    setRankIdInput(ranks.length > 0 ? ranks[0].id : '');
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!userIdInput.trim() || !displayNameInput.trim()) {
      setCreateError('請填寫完整的使用者 ID 與冒險者稱號');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/adventurers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: userIdInput.trim(),
          displayName: displayNameInput.trim(),
          rankId: rankIdInput || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `建立失敗 (HTTP ${res.status})`);
      }

      setCreateOpen(false);
      onRefresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '登記失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="冒險者名冊管理 (Adventurers)"
        subtitle="檢視公會所有已登錄之冒險者檔案、所屬階級與已登記實體／數位憑證。"
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddOutlinedIcon />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: 2 }}
          >
            登記新冒險者
          </Button>
        }
      />

      {adventurers.length === 0 ? (
        <EmptyState
          title="尚無冒險者資料"
          description="目前公會中尚未登錄任何冒險者檔案。"
        />
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 3,
            bgcolor: 'background.paper',
            borderColor: 'divider',
            overflowX: 'auto',
          }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: 'rgba(240, 233, 218, 0.6)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>冒險者名稱 / 帳號</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>當前階級</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>資格證憑證狀態</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>建立時間</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>詳細檢視</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adventurers.map((adv) => {
                const creds = adv.credentials || [];
                return (
                  <TableRow
                    key={adv.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {adv.displayName}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        ID: {adv.id.slice(-8)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <RankBadge rank={adv.currentRank} size="small" />
                    </TableCell>

                    <TableCell>
                      {creds.length > 0 ? (
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                          {creds.map((c) => (
                            <Chip
                              key={c.id}
                              label={`${c.type}: ${c.value}`}
                              size="small"
                              variant="outlined"
                              color={c.enabled ? 'success' : 'default'}
                              sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Chip label="尚未綁定" size="small" variant="outlined" sx={{ color: 'text.secondary', fontWeight: 600 }} />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                        {adv.createdAt ? new Date(adv.createdAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => setSelectedAdventurer(adv)}
                        aria-label="檢視冒險者詳細"
                        sx={{ color: 'primary.main' }}
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View Detail Modal Dialog */}
      <Dialog
        open={Boolean(selectedAdventurer)}
        onClose={() => setSelectedAdventurer(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>冒險者詳細檔案</DialogTitle>
        <DialogContent dividers>
          {selectedAdventurer && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>冒險者稱號</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {selectedAdventurer.displayName}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>目前階級</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <RankBadge rank={selectedAdventurer.currentRank} />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>冒險者檔案 ID (UUID)</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  {selectedAdventurer.id}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>關聯使用者 ID (User ID)</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  {selectedAdventurer.userId}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
                  登記之實體／數位憑證 ({selectedAdventurer.credentials?.length || 0})
                </Typography>
                {selectedAdventurer.credentials && selectedAdventurer.credentials.length > 0 ? (
                  <Stack spacing={1}>
                    {selectedAdventurer.credentials.map((cred) => (
                      <Card key={cred.id} variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{cred.type}</Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                              {cred.value}
                            </Typography>
                          </Box>
                          <Chip
                            label={cred.enabled ? '啟用中' : '已停用'}
                            size="small"
                            color={cred.enabled ? 'success' : 'default'}
                          />
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>未綁定任何憑證</Typography>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAdventurer(null)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* Create Adventurer Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>登記新冒險者檔案</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {createError && <ErrorState message={createError} />}

            <TextField
              label="使用者 ID (User ID)"
              fullWidth
              value={userIdInput}
              onChange={(e) => setUserIdInput(e.target.value)}
              placeholder="例如使用者的 UUID"
              required
              helperText="需為系統已存在且未建立冒險者檔案之使用者帳號"
            />

            <TextField
              label="冒險者稱號 (Display Name)"
              fullWidth
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="例如: 哥布林殺手 或 Rookie"
              required
            />

            <TextField
              select
              label="初始階級 (Rank)"
              fullWidth
              value={rankIdInput}
              onChange={(e) => setRankIdInput(e.target.value)}
            >
              {ranks.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.code} ({r.name})
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '登記中...' : '確認登記'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
