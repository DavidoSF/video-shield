import { useState } from 'react';
import { useAuth } from './AuthContext';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Identifiants invalides. Réessayez.',
  rate_limited: 'Trop de tentatives. Réessayez dans un instant.',
  login_failed: 'Connexion impossible. Réessayez.',
};

export function LoginPage() {
  const { login, submitting } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'login_failed';
      setError(ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.login_failed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="login-page">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-card">
        <p className="login-eyebrow">Accès sécurisé</p>
        <h1 className="login-title">VideoShield</h1>
        <p className="login-subtitle">
          Connectez-vous pour accéder à l’espace de review.
        </p>

        <div className="login-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="login-input"
            type="email"
            autoComplete="username"
            placeholder="demo@streamix.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">Mot de passe</label>
          <input
            id="login-password"
            className="login-input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button
          className="login-button"
          onClick={handleSubmit}
          disabled={submitting || !email || !password}
        >
          {submitting ? 'Connexion...' : 'Se connecter'}
        </button>

        <p className="login-hint">Démo : demo@streamix.local / StreamixDemo123!</p>
      </div>
    </div>
  );
}
