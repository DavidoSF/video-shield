import { useState } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { ReviewPlayer } from './components/review/ReviewPlayer';
import { ReviewProvider } from './state/ReviewContext';

type AuthSession = {
  userName: string;
  streamixSession: string;
};

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  function handleLogin(userName: string, streamixSession: string) {
    window.localStorage.setItem('video-shield-author', userName);
    setAuthSession({ userName, streamixSession });
  }

  function handleLogout() {
    setAuthSession(null);
  }

  if (!authSession) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <ReviewProvider>
      <ReviewPlayer
        userName={authSession.userName}
        streamixSession={authSession.streamixSession}
        onLogout={handleLogout}
      />
    </ReviewProvider>
  );
}
