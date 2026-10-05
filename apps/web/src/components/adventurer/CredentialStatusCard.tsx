import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import ContactlessOutlinedIcon from '@mui/icons-material/ContactlessOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { Credential, CredentialType } from '../../types/auth.js';

export interface CredentialStatusCardProps {
  credentials?: Credential[];
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

export function CredentialStatusCard({ credentials = [] }: CredentialStatusCardProps) {
  const hasCredentials = credentials.length > 0;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BadgeOutlinedIcon sx={{ color: 'secondary.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              冒險者資格證 (Adventure License)
            </Typography>
          </Box>
          <Chip
            label={hasCredentials ? '已綁定' : '尚未綁定'}
            color={hasCredentials ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        {hasCredentials ? (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {credentials.map((cred) => (
              <Box
                key={cred.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: 'primary.light', display: 'flex', alignItems: 'center' }}>
                    {getCredentialIcon(cred.type)}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {cred.type}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontFamily: 'monospace',
                      ml: 0.5,
                    }}
                  >
                    {cred.value}
                  </Typography>
                </Box>
                <Chip
                  label={cred.enabled ? '啟用中' : '已停用'}
                  color={cred.enabled ? 'success' : 'default'}
                  variant="outlined"
                  size="small"
                  sx={{ height: 22, fontSize: '0.75rem' }}
                />
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            目前尚未綁定任何實體或數位憑證。如需領取公會證，請洽管理員櫃檯登記。
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
