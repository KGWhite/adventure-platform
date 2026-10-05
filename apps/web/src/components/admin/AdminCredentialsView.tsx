import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import AddCardOutlinedIcon from '@mui/icons-material/AddCardOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import ContactlessOutlinedIcon from '@mui/icons-material/ContactlessOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { AdventurerProfile, Credential, CredentialType } from '../../types/auth.js';
import { PageHeader, EmptyState, ErrorState } from '../common/index.js';

export interface AdminCredentialsViewProps {
  credentials: Credential[];
  adventurers: AdventurerProfile[];
  onRefresh: () => void;
  apiUrl: string;
  token: string | null;
}

function getCredentialIcon(type: CredentialType) {
  switch (type) {
    case 'QRCODE':
      return <QrCode2OutlinedIcon fontSize="small" />;
    case 'NFC':
    case 'RFID':
      return <ContactlessOutlinedIcon fontSize="small" />;
    default:
      return <BadgeOutlinedIcon fontSize="small" />;
  }
}

export function AdminCredentialsView({
  credentials,
  adventurers,
  onRefresh,
  apiUrl,
  token,
}: AdminCredentialsViewProps) {
  // Create Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [adventurerIdInput, setAdventurerIdInput] = useState('');
  const [typeInput, setTypeInput] = useState<CredentialType>('QRCODE');
  const [valueInput, setValueInput] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map adventurer ID to display name
  const adventurerMap = new Map<string, string>();
  adventurers.forEach((adv) => {
    adventurerMap.set(adv.id, adv.displayName);
  });

  const handleOpenCreate = () => {
    setAdventurerIdInput(adventurers.length > 0 ? adventurers[0].id : '');
    setTypeInput('QRCODE');
    setValueInput('');
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (!adventurerIdInput || !valueInput.trim()) {
      setCreateError('請選擇冒險者並輸入憑證識別碼');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch(`${apiUrl}/api/v1/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adventurerId: adventurerIdInput,
          type: typeInput,
          value: valueInput.trim(),
          enabled: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `登記失敗 (HTTP ${res.status})`);
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
        title="實體／數位憑證管理 (Credentials)"
        subtitle="通用身分識別載體管理。支援 QR Code、RFID、NFC 等多元媒介之登記與狀態管理。"
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCardOutlinedIcon />}
            onClick={handleOpenCreate}
            disabled={adventurers.length === 0}
            sx={{ borderRadius: 2 }}
          >
            登記新憑證
          </Button>
        }
      />

      {credentials.length === 0 ? (
        <EmptyState
          title="尚無已登記之憑證"
          description="目前系統中尚未登記任何冒險者實體或數位憑證。"
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
            <TableHead sx={{ bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>所屬冒險者</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>憑證載體類型</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>識別碼 (Credential Value)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>啟用狀態</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>登記時間</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {credentials.map((cred) => {
                const advName = adventurerMap.get(cred.adventurerId) || '未知冒險者';
                return (
                  <TableRow
                    key={cred.id}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {advName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                        ID: {cred.adventurerId.slice(-8)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ color: 'primary.light', display: 'flex' }}>
                          {getCredentialIcon(cred.type)}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {cred.type}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'rgba(255, 255, 255, 0.04)',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        {cred.value}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={cred.enabled ? '已啟用 (Active)' : '已停用'}
                        color={cred.enabled ? 'success' : 'default'}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                        {cred.createdAt ? new Date(cred.createdAt).toLocaleDateString() : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Register New Credential Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>登記新憑證載體</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {createError && <ErrorState message={createError} />}

            <TextField
              select
              label="所屬冒險者"
              fullWidth
              value={adventurerIdInput}
              onChange={(e) => setAdventurerIdInput(e.target.value)}
              required
            >
              {adventurers.map((adv) => (
                <MenuItem key={adv.id} value={adv.id}>
                  {adv.displayName} ({adv.currentRank?.code || 'F'})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="憑證載體類型 (Credential Type)"
              fullWidth
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value as CredentialType)}
              required
              helperText="通用憑證抽象，不預設單一特定硬體"
            >
              <MenuItem value="QRCODE">QRCODE (二維條碼 / 數位證照)</MenuItem>
              <MenuItem value="NFC">NFC (近場通訊感應卡)</MenuItem>
              <MenuItem value="RFID">RFID (射頻識別標籤)</MenuItem>
            </TextField>

            <TextField
              label="憑證識別碼 (Credential Value / Token)"
              fullWidth
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              placeholder="例如: ADV-2026-QR01 或卡片 UID"
              required
              helperText="唯一識別碼，不得與現有憑證重複"
            />
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
