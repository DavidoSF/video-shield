import { ReviewPlayer } from './components/review/ReviewPlayer';
import { ReviewProvider } from './state/ReviewContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ReviewProvider>
      <ReviewPlayer />
    </ReviewProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

