import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useStudentProfile } from "@/hooks/useStudentProfile";

import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import HomePage from "@/pages/HomePage";
import TaskPage from "@/pages/TaskPage";
import TeacherRoom from "@/pages/TeacherRoom";
import ProgressPage from "@/pages/ProgressPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useStudentProfile();

  if (authLoading || profileLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/home" replace /> : <AuthPage />} />
      <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/" replace />} />
      <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/tarefas" element={<ProtectedRoute><TaskPage /></ProtectedRoute>} />
      <Route path="/professor/:subject" element={<ProtectedRoute><TeacherRoom /></ProtectedRoute>} />
      <Route path="/progresso" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
