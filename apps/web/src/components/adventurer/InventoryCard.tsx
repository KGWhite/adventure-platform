import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import BackpackOutlinedIcon from '@mui/icons-material/BackpackOutlined';
import { useEffect, useState } from 'react';
import type { EquipmentSlot, Inventory } from '../../types/shop.js';
import { SLOT_LABELS, itemIcon, itemStatLabel } from '../../utils/itemIcons.js';

interface InventoryCardProps {
  apiUrl: string;
  playerId?: string;
}

const SLOTS: EquipmentSlot[] = ['WEAPON', 'ARMOR'];

export function InventoryCard({ apiUrl, playerId }: InventoryCardProps) {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!playerId) return;
    fetch(`${apiUrl}/api/v1/players/${playerId}/inventory`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: Inventory) => setInventory(data))
      .catch(() => setFailed(true));
  }, [apiUrl, playerId]);

  return (
    <Card
      variant="outlined"
      sx={{ mb: 3, borderRadius: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
          <BackpackOutlinedIcon sx={{ color: 'secondary.main', fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', flex: 1 }}>
            裝備與背包
          </Typography>
          {inventory && (
            <Chip
              size="small"
              variant="outlined"
              label={`ATK ${inventory.attack} · DEF ${inventory.defense}`}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>

        {!inventory ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {failed || !playerId ? '目前無法載入裝備資料。' : '載入中...'}
          </Typography>
        ) : (
          <>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {SLOTS.map((slot) => {
                const entry = inventory.equipment[slot];
                return (
                  <Grid key={slot} size={{ xs: 6 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px dashed',
                        borderColor: entry ? 'secondary.main' : 'divider',
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {SLOT_LABELS[slot]}
                      </Typography>
                      <Typography variant="h5" component="div">
                        {entry ? itemIcon(entry.item.iconKey, slot) : '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {entry ? entry.item.name : '未裝備'}
                      </Typography>
                      {entry && (
                        <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 600 }}>
                          {itemStatLabel(entry.item)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
              背包（{inventory.items.length} 件）
            </Typography>
            {inventory.items.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                還沒有任何裝備，帶著金幣去商店看看吧！
              </Typography>
            ) : (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                {inventory.items.map((entry) => (
                  <Chip
                    key={entry.playerItemId}
                    label={`${itemIcon(entry.item.iconKey, entry.item.type)} ${entry.item.name}${
                      entry.equipped ? '（裝備中）' : ''
                    }`}
                    color={entry.equipped ? 'secondary' : 'default'}
                    variant={entry.equipped ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            )}
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 1.5 }}>
              更換裝備請至公會終端機辦理。
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
