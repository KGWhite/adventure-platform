import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import type { Rank } from '../../types/auth.js';
import { RankBadge } from '../adventurer/RankBadge.js';
import { PageHeader, EmptyState } from '../common/index.js';

export interface AdminRanksViewProps {
  ranks: Rank[];
}

export function AdminRanksView({ ranks }: AdminRanksViewProps) {
  const sortedRanks = [...ranks].sort((a, b) => a.order - b.order);

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="階級體系配置 (Ranks Configuration)"
        subtitle="公會階級階梯與晉升門檻配置。所有階級皆由資料庫驅動，無任何前端硬編碼。"
      />

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        公會階級定義由系統資料庫統一維護。階級順位 (Order) 與晉升所需功績門檻直接決定冒險者在儀表板所見之晉升進度。
      </Alert>

      {sortedRanks.length === 0 ? (
        <EmptyState
          title="尚無階級資料"
          description="目前系統資料庫中未載入任何階級定義。"
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
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: 'rgba(240, 233, 218, 0.6)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem', width: 110 }}>順位 (Order)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>階級代碼</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>階級名稱</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>晉升所需功績門檻 (Merit Threshold)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.95rem' }}>建立時間</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedRanks.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      第 {r.order} 階
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <RankBadge rank={r} showName={false} size="small" />
                  </TableCell>

                  <TableCell>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {r.name}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 800,
                        color: r.promotionThreshold > 0 ? 'secondary.main' : 'text.secondary',
                      }}
                    >
                      {r.promotionThreshold > 0 ? `${r.promotionThreshold} 功績` : '0 (初始等級)'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                      {/* Read only from DB */}
                      系統內建
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
