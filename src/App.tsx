import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import ChatList from "./pages/ChatList";
import ChatView from "./pages/ChatView";
import GhostMode from "./pages/GhostMode";
import AISummary from "./pages/AISummary";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import ProtocolZeroPage from "./pages/ProtocolZeroPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const AppRoutes = () => {
  const [ghostMode, setGhostMode] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/chats" replace /> : <Login />} />
      <Route path="/chats" element={<ProtectedRoute><ChatList ghostMode={ghostMode} /></ProtectedRoute>} />
      <Route path="/chat/:id" element={<ProtectedRoute><ChatView ghostMode={ghostMode} /></ProtectedRoute>} />
      <Route path="/ghost" element={<ProtectedRoute><GhostMode ghostMode={ghostMode} setGhostMode={setGhostMode} /></ProtectedRoute>} />
      <Route path="/ai-summary" element={<ProtectedRoute><AISummary ghostMode={ghostMode} /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><SearchPage ghostMode={ghostMode} /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage ghostMode={ghostMode} /></ProtectedRoute>} />
      <Route path="/protocol-zero" element={<ProtectedRoute><ProtocolZeroPage ghostMode={ghostMode} /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
