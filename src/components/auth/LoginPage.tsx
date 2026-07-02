import { useState } from 'react';

type LoginPageProps = {
  onLogin: (userName: string, sessionCode: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [userName, setUserName] = useState('Mohamad');
  const [sessionCode, setSessionCode] = useState('streamix-demo-session');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = userName.trim() || 'Reviewer';
    const cleanSession = sessionCode.trim();

    onLogin(cleanName, cleanSession);
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Streamix Secure Review</p>
        <h1>Secure video access</h1>

        <p className="login-help">
          Enter your reviewer name and session code to request a temporary access token.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Reviewer name
            <input
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Mohamad"
            />
          </label>

          <label>
            Session code
            <input
              value={sessionCode}
              onChange={(event) => setSessionCode(event.target.value)}
              placeholder="streamix-demo-session"
            />
          </label>

          <button type="submit">Start secure review</button>
        </form>

        <p className="login-note">
          Demo valid session: <strong>streamix-demo-session</strong>
        </p>
      </section>
    </main>
  );
}
