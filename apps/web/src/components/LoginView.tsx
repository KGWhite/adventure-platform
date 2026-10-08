import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigation } from '../router/Router.js';

export function LoginView() {
  const { login } = useAuth();
  const { navigate } = useNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('請輸入使用者名稱與密碼');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await login(username.trim(), password);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗，請確認帳號密碼');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="login-card-container">
      <div className="login-card">
        <div className="login-header">
          <div className="guild-badge">⚔️ Adventurer Guild</div>
          <h1 className="login-title">公會身分驗證</h1>
          <p className="login-subtitle">請登入冒險者帳號或管理員公會證</p>
        </div>

        {error && <div className="alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">使用者名稱 / Username</label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="例如: adventurer 或 admin"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密碼 / Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? '驗證中...' : '登入公會系統'}
          </button>
        </form>

        <div className="demo-accounts-box">
          <p className="demo-title">💡 開發測試帳號快速填入：</p>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickAccount('adventurer', 'adventurer123')}
            >
              冒險者 (adventurer)
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fillQuickAccount('admin', 'admin123')}
            >
              公會管理員 (admin)
            </button>
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <p className="demo-title" style={{ color: '#f59e0b' }}>⚔️ Physical RPG 實體節點直達：</p>
            <div className="demo-buttons" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#7c3aed', color: '#fff' }}
                onClick={() => navigate('/actor/boss')}
              >
                📱 Boss Actor Web (/actor/boss)
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#0284c7', color: '#fff' }}
                onClick={() => navigate('/display/boss-01')}
              >
                📺 Boss Display (/display/boss-01)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
