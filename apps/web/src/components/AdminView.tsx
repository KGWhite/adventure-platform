import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { useAuth } from '../context/AuthContext.js';
import { useNavigation } from '../router/Router.js';
import type { AdventurerProfile, Credential, Rank } from '../types/auth.js';
import { AdminLayout, type AdminTab } from '../layouts/AdminLayout.js';
import { LoadingState, ErrorState } from './common/index.js';
import {
  AdminDashboard,
  AdminAdventurersView,
  AdminRanksView,
  AdminCredentialsView,
  AdminComingSoonView,
  type AdminSummaryMetrics,
} from './admin/index.js';

export function AdminView() {
  const { token, apiUrl } = useAuth();
  const { path, navigate } = useNavigation();

  // Resolve initial tab from path
  const resolveTabFromPath = (p: string): AdminTab => {
    if (p.includes('/adventurers')) return 'adventurers';
    if (p.includes('/ranks')) return 'ranks';
    if (p.includes('/credentials')) return 'credentials';
    if (p.includes('/quests')) return 'quests';
    if (p.includes('/promotions')) return 'promotions';
    if (p.includes('/rewards')) return 'rewards';
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<AdminTab>(() => resolveTabFromPath(path));

  // Sync tab with navigation path changes
  useEffect(() => {
    setCurrentTab(resolveTabFromPath(path));
  }, [path]);

  const handleTabChange = (tab: AdminTab) => {
    setCurrentTab(tab);
    const targetPath = tab === 'dashboard' ? '/admin' : `/admin/${tab}`;
    navigate(targetPath);
  };

  // Data states
  const [metrics, setMetrics] = useState<AdminSummaryMetrics | null>(null);
  const [adventurers, setAdventurers] = useState<AdventurerProfile[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      // Parallel fetch of all available admin domain data
      const [summaryRes, advRes, ranksRes, credsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/v1/adventurers`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/v1/ranks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/v1/credentials`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!summaryRes.ok) {
        throw new Error(`無法載入總覽指標 (HTTP ${summaryRes.status})`);
      }

      const summaryData = await summaryRes.json();
      setMetrics(summaryData.metrics);

      if (advRes.ok) {
        const advData = await advRes.json();
        setAdventurers(advData);
      }

      if (ranksRes.ok) {
        const ranksData = await ranksRes.json();
        setRanks(ranksData);
      }

      if (credsRes.ok) {
        const credsData = await credsRes.json();
        setCredentials(credsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入管理後台資料時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderContent = () => {
    if (isLoading && !metrics) {
      return <LoadingState message="載入公會管理控制台資料中..." minHeight={360} />;
    }

    if (error) {
      return (
        <ErrorState
          title="管理資料載入失敗"
          message={error}
          onRetry={loadData}
          retryText="重新整理"
        />
      );
    }

    switch (currentTab) {
      case 'adventurers':
        return (
          <AdminAdventurersView
            adventurers={adventurers}
            ranks={ranks}
            onRefresh={loadData}
            apiUrl={apiUrl}
            token={token}
          />
        );
      case 'ranks':
        return <AdminRanksView ranks={ranks} />;
      case 'credentials':
        return (
          <AdminCredentialsView
            credentials={credentials}
            adventurers={adventurers}
            onRefresh={loadData}
            apiUrl={apiUrl}
            token={token}
          />
        );
      case 'quests':
        return (
          <AdminComingSoonView
            title="任務管理系統 (Quests)"
            subtitle="管理公會任務委託、設定階級接取門檻與功績獎勵。"
            featureName="任務管理"
            onBackToDashboard={() => handleTabChange('dashboard')}
          />
        );
      case 'promotions':
        return (
          <AdminComingSoonView
            title="晉升審核系統 (Promotions)"
            subtitle="審核冒險者階級晉升申請、查驗累積功績與結算審批。"
            featureName="晉升審核"
            onBackToDashboard={() => handleTabChange('dashboard')}
          />
        );
      case 'rewards':
        return (
          <AdminComingSoonView
            title="獎勵發放管理 (Rewards)"
            subtitle="維護公會榮譽獎勵庫與功績兌換項目。"
            featureName="獎勵發放"
            onBackToDashboard={() => handleTabChange('dashboard')}
          />
        );
      case 'dashboard':
      default:
        return <AdminDashboard metrics={metrics} />;
    }
  };

  return (
    <AdminLayout currentTab={currentTab} onTabChange={handleTabChange}>
      <Box sx={{ width: '100%' }}>{renderContent()}</Box>
    </AdminLayout>
  );
}
