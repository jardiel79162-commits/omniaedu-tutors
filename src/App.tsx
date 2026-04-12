import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import React, { useEffect } from "react"; // Import React and useEffect for snowfall

import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import HomePage from "@/pages/HomePage";
import TaskPage from "@/pages/TaskPage";
import TeacherRoom from "@/pages/TeacherRoom";
import ProgressPage from "@/pages/ProgressPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Component for falling snow
const Snowfall = () => {
  useEffect(() => {
    const createSnowflake = () => {
      const snowflake = document.createElement('div');
      snowflake.classList.add('snowflake');
      snowflake.style.left = `${Math.random() * 100}vw`;
      snowflake.style.animationDuration = `${Math.random() * 5 + 5}s`; // 5-10 seconds
      snowflake.style.animationDelay = `${Math.random() * 5}s`; // delay for staggered effect
      const size = `${Math.random() * 3 + 2}px`; // 2-5px
      snowflake.style.width = size;
      snowflake.style.height = size;
      const snowContainer = document.querySelector('.snow');
      if (snowContainer) {
        snowContainer.appendChild(snowflake);
        snowflake.addEventListener('animationend', () => {
          snowflake.remove();
        });
      }
    };

    const interval = setInterval(createSnowflake, 200); // Create a flake every 200ms

    return () => clearInterval(interval);
  }, []);

  return <div className="snow fixed inset-0 z-[9999] overflow-hidden pointer-events-none"></div>;
};

// Component for floating math elements
const MathElements = () => {
  const elements = ['x²', '∑', 'π', '∫', '∝', 'δ', 'Δ', '∇', '∞'];
  // Generate a bunch of math elements at random positions
  return (
    <>
      {Array.from({ length: 20 }).map((_, i) => {
        const char = elements[Math.floor(Math.random() * elements.length)];
        return (
          <span
            key={i}
            className="math-element"
            style={{
              top: `${Math.random() * 100}vh`,
              left: `${Math.random() * 100}vw`,
              animationDelay: `${Math.random() * 10}s`,
              fontSize: `${Math.random() * 1.5 + 1}rem`, // 1 to 2.5rem
              animationDuration: `${Math.random() * 10 + 10}s`, // 10-20s
            }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
};

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
          <div className="relative min-h-screen w-full overflow-hidden"> {/* Wrapper for theme elements */}
            <Snowfall />
             <MathElements />
            <AppRoutes />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;