import { useState } from 'react';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    const ok = login(username.trim(), password);
    if (!ok) {
      setError('Identifiants invalides. Réessayez.');
      setSubmitting(false);
    } else {
      setError('');
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
        <h1 className="login-title">Video&nbsp;Shield</h1>
        <p className="login-subtitle">
          Connectez-vous pour accéder à l’espace de review.
        </p>

        <div className="login-field">
          <label htmlFor="login-username">Nom d’utilisateur</label>
          <input
            id="login-username"
            className="login-input"
            type="text"
            autoComplete="username"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
          disabled={submitting || !username || !password}
        >
          Se connecter
        </button>

        <p className="login-hint">Démo : admin / password</p>
      </div>
    </div>
  );
}
