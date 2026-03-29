import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./components/PublicLayout";
import { ClubLayout } from "./components/ClubLayout";
import { useAuth } from "./context/AuthContext";
import { AboutPage } from "./pages/AboutPage";
import { AuthPage } from "./pages/AuthPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { LobbyPage } from "./pages/LobbyPage";
import { NewSessionPage } from "./pages/NewSessionPage";
import { WatchPage } from "./pages/WatchPage";
import { BoothPage } from "./pages/BoothPage";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="club-bg flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-fuchsia-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<PublicLayout />}>
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
      </Route>
      <Route
        path="/"
        element={
          <Protected>
            <ClubLayout />
          </Protected>
        }
      >
        <Route index element={<LobbyPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="session/new" element={<NewSessionPage />} />
        <Route path="session/:sessionId" element={<WatchPage />} />
        <Route path="session/:sessionId/booth" element={<BoothPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
