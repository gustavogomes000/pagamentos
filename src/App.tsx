import { useState, useCallback, lazy, Suspense } from "react";
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

// ─── Lazy-loaded pages ─────────────────────────────────────────────────
const Login = lazy(() => import("./pages/Login"));
const Cadastro = lazy(() => import("./pages/Cadastro"));
const Cadastros = lazy(() => import("./pages/Cadastros"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Pagamentos = lazy(() => import("./pages/Pagamentos"));
const ListaLiderancas = lazy(() => import("./pages/ListaLiderancas"));
const CadastroLideranca = lazy(() => import("./pages/CadastroLideranca"));
const ListaAdmin = lazy(() => import("./pages/ListaAdmin"));
const CadastroAdmin = lazy(() => import("./pages/CadastroAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ─── QueryClient com suporte offline ───────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "offlineFirst",
      staleTime: 0,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: (failureCount, error: unknown) => {
        const msg = (error as Error)?.message || "";
        if (msg.includes("JWT") || msg.includes("401")) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

// ─── Persiste o cache do React Query no localStorage ────────────────────
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "rq_cache_v2",
  throttleTime: 1000,
});

// ─── Fallback de carregamento leve ──────────────────────────────────────
function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

// ─── Rotas protegidas ────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3 bg-muted">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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

// ─── App ─────────────────────────────────────────────────────────────────

import VersionMonitor from "./components/VersionMonitor";
import InstallPWA from "./components/InstallPWA";
import { useOfflineSync } from "./hooks/useOfflineSync";

function GlobalOfflineSync() {
  useOfflineSync();
  return null;
}

function Index() {
  return <Navigate to="/pagamentos" replace />;
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
        buster: "rq_cache_v2_real_data",
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
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/cadastros" element={<ProtectedRoute><Cadastros /></ProtectedRoute>} />
              <Route path="/cadastros/novo" element={<ProtectedRoute><Cadastro /></ProtectedRoute>} />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
};

export default App;
