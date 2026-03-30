import { useState, useCallback } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index";
import Cadastros from "./pages/Cadastros";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Usuarios from "./pages/Usuarios";
import Pagamentos from "./pages/Pagamentos";
import ListaLiderancas from "./pages/ListaLiderancas";
import CadastroLideranca from "./pages/CadastroLideranca";
import ListaAdmin from "./pages/ListaAdmin";
import CadastroAdmin from "./pages/CadastroAdmin";

// â”€â”€â”€ QueryClient com suporte offline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // offlineFirst: usa dados em cache sem tentar re-fetch quando offline
      networkMode: "offlineFirst",
      // Dados ficam "frescos" por 5 minutos; em background refetch sempre
      staleTime: 1000 * 60 * 5,
      // Cache de 24h no memory â€” o localStorage persiste alÃ©m disso
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error: unknown) => {
        // NÃ£o tenta novamente se for erro de autenticaÃ§Ã£o; tenta 2x outros erros
        const msg = (error as Error)?.message || "";
        if (msg.includes("JWT") || msg.includes("401")) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Mutations tambÃ©m funcionam offline (vÃ£o para a fila)
      networkMode: "offlineFirst",
    },
  },
});

// â”€â”€â”€ Persiste o cache do React Query no localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Isso permite que o app funcione sem internet: na prÃ³xima abertura,
// os dados do Ãºltimo fetch ficam disponÃ­veis instantaneamente.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "rq_cache_v1",
  // Comprime para nÃ£o usar muito espaÃ§o (limita a 4MB)
  throttleTime: 1000,
});

// â”€â”€â”€ Rotas protegidas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-muted">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20" />
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin absolute inset-0" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: "100dvh", background: "#070510" }} />;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import VersionMonitor from "./components/VersionMonitor";
import InstallPWA from "./components/InstallPWA";
import { useOfflineSync } from "./hooks/useOfflineSync";

function GlobalOfflineSync() {
  useOfflineSync();
  return null;
}

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (sessionStorage.getItem("splash_shown")) return false;
    sessionStorage.setItem("splash_shown", "1");
    return true;
  });

  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success",
        },
      }}
    >
      <TooltipProvider>
        <GlobalOfflineSync />
        <InstallPWA />
      <VersionMonitor />
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/cadastros" element={<ProtectedRoute><Cadastros /></ProtectedRoute>} />
            <Route path="/cadastros/novo" element={<ProtectedRoute><PageTransition><Cadastro /></PageTransition></ProtectedRoute>} />
            <Route path="/cadastros/:id" element={<ProtectedRoute><Cadastros /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
            <Route path="/pagamentos" element={<ProtectedRoute><Pagamentos /></ProtectedRoute>} />
            <Route path="/liderancas" element={<ProtectedRoute><ListaLiderancas /></ProtectedRoute>} />
            <Route path="/liderancas/novo" element={<ProtectedRoute><CadastroLideranca /></ProtectedRoute>} />
            <Route path="/liderancas/:id" element={<ProtectedRoute><CadastroLideranca /></ProtectedRoute>} />
            <Route path="/administrativo" element={<ProtectedRoute><ListaAdmin /></ProtectedRoute>} />
            <Route path="/administrativo/novo" element={<ProtectedRoute><CadastroAdmin /></ProtectedRoute>} />
            <Route path="/administrativo/:id" element={<ProtectedRoute><CadastroAdmin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;

