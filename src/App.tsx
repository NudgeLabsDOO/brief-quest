import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useProgressStore } from './store/progressStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthScreen } from './screens/AuthScreen';
import { LevelSelectScreen } from './screens/LevelSelectScreen';
import { LevelIntroScreen } from './screens/LevelIntroScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';

function AppContent() {
  const { initializeAuth, user } = useAuthStore();
  const { setUserId } = useProgressStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (user) {
      setUserId(user.id);
    }
  }, [user, setUserId]);

  return (
    <Routes>
      <Route path="/auth" element={<AuthScreen />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LevelSelectScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:scenarioId"
        element={
          <ProtectedRoute>
            <LevelIntroScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:scenarioId/play"
        element={
          <ProtectedRoute>
            <GameScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/:scenarioId/result"
        element={
          <ProtectedRoute>
            <ResultScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
