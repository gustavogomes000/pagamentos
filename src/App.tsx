import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Pessoas from "@/pages/Pessoas";
import Visitas from "@/pages/Visitas";
import Suplentes from "@/pages/Suplentes";
import Pagamentos from "@/pages/Pagamentos";
import Usuarios from "@/pages/Usuarios";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Carregando...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AppRoutes = () => {
  const { session, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Carregando...</div>;

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/pessoas" element={<ProtectedRoute><Pessoas /></ProtectedRoute>} />
      <Route path="/visitas" element={<ProtectedRoute><Visitas /></ProtectedRoute>} />
      <Route path="/suplentes" element={<ProtectedRoute><Suplentes /></ProtectedRoute>} />
      <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
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
