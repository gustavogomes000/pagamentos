import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Municipio {
  id: string;
  nome: string;
  uf: string;
  ativo: boolean;
  criado_em: string;
}

interface CidadeContextType {
  municipios: Municipio[];
  cidadeAtiva: string | null; // null = "Todas as Cidades"
  cidadeAtivaNome: string;
  setCidadeAtiva: (id: string | null) => void;
  isAdmin: boolean;
  loading: boolean;
  refetchMunicipios: () => Promise<void>;
}

const CidadeContext = createContext<CidadeContextType>({
  municipios: [],
  cidadeAtiva: null,
  cidadeAtivaNome: "Todas as Cidades",
  setCidadeAtiva: () => {},
  isAdmin: false,
  loading: true,
  refetchMunicipios: async () => {},
});

export const useCidade = () => useContext(CidadeContext);

const STORAGE_KEY = "cidade_ativa";

export function CidadeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [cidadeAtiva, setCidadeAtivaState] = useState<string | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored || null;
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMunicipios = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("municipios")
      .select("*")
      .eq("ativo", true)
      .order("nome");
    if (!error && data) {
      setMunicipios(data);
      // Se só tem uma cidade e nenhuma selecionada, selecionar automaticamente
      if (data.length === 1 && !localStorage.getItem(STORAGE_KEY)) {
        setCidadeAtivaState(data[0].id);
        localStorage.setItem(STORAGE_KEY, data[0].id);
      }
      // Se a cidade salva não existe mais, resetar
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== "todas" && !data.find((m: Municipio) => m.id === stored)) {
        if (data.length > 0) {
          setCidadeAtivaState(data[0].id);
          localStorage.setItem(STORAGE_KEY, data[0].id);
        }
      }
    }
    setLoading(false);
  }, []);

  const checkAdmin = useCallback(async () => {
    if (!user) { setIsAdmin(false); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    setIsAdmin(!!data);
  }, [user]);

  useEffect(() => {
    fetchMunicipios();
    checkAdmin();
  }, [fetchMunicipios, checkAdmin]);

  const setCidadeAtiva = useCallback((id: string | null) => {
    setCidadeAtivaState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.setItem(STORAGE_KEY, "todas");
    }
  }, []);

  // Restaurar "todas" do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "todas") {
      setCidadeAtivaState(null);
    }
  }, []);

  const cidadeAtivaNome = useMemo(() => {
    if (!cidadeAtiva) return "Todas as Cidades";
    const m = municipios.find(m => m.id === cidadeAtiva);
    return m ? `${m.nome}` : "Todas as Cidades";
  }, [cidadeAtiva, municipios]);

  const value = useMemo(() => ({
    municipios,
    cidadeAtiva,
    cidadeAtivaNome,
    setCidadeAtiva,
    isAdmin,
    loading,
    refetchMunicipios: fetchMunicipios,
  }), [municipios, cidadeAtiva, cidadeAtivaNome, setCidadeAtiva, isAdmin, loading, fetchMunicipios]);

  return (
    <CidadeContext.Provider value={value}>
      {children}
    </CidadeContext.Provider>
  );
}
