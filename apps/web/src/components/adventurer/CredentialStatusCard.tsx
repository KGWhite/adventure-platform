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
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <BadgeOutlinedIcon sx={{ color: 'secondary.main', fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              冒險者資格證 (Adventurer License)
            </Typography>
          </Box>
          <Chip
            label={hasCredentials ? '已綁定' : '尚未綁定'}
            color={hasCredentials ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.8125rem', px: 0.5 }}
          />
        </Stack>

        {hasCredentials ? (
          <Stack spacing={1.25} sx={{ mt: 1 }}>
            {credentials.map((cred) => (
              <Box
                key={cred.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: '#f7f3e8',
                  border: '1px solid #e5dac4',
                  boxShadow: '0 1px 4px rgba(90, 68, 40, 0.04)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
                    {getCredentialIcon(cred.type)}
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {cred.type}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'secondary.main',
                      fontFamily: 'monospace',
                      fontSize: '0.9375rem',
                      fontWeight: 700,
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
                  sx={{ height: 26, fontSize: '0.8125rem', fontWeight: 600 }}
                />
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.75, lineHeight: 1.6 }}>
            目前尚未綁定任何實體或數位憑證。如需領取公會證，請洽管理員櫃檯登記。
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
