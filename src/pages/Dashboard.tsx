import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, DollarSign, Vote, TrendingUp, MapPin, ChevronDown, ChevronUp,
  FileDown, FileSpreadsheet, Search, Briefcase, List, Wallet, Filter, X,
  Calendar, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
  Building2, CheckCircle2, AlertTriangle, XCircle, TrendingDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportAllPDF, exportExcel } from "@/lib/exports";
import { calcTotaisFinanceiros } from "@/lib/finance";
import { PageTransition } from "@/components/PageTransition";
import { CardSkeletonList } from "@/components/CardSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import { useCidade } from "@/contexts/CidadeContext";

type Lideranca = {
  id: string; nome: string; regiao: string | null;
  retirada_mensal_valor: number | null; retirada_mensal_meses: number | null;
  retirada_ate_mes: number | null; chave_pix: string | null;
  municipio_id?: string | null;
};

type AdminPessoa = {
  id: string; nome: string; whatsapp: string | null;
  valor_contrato: number | null; valor_contrato_meses: number | null;
  contrato_ate_mes: number | null;
  municipio_id?: string | null;
};

type Pagamento = {
  id: string; mes: number; ano: number; valor: number;
  categoria: string; tipo_pessoa: string | null;
  suplente_id: string | null; lideranca_id: string | null; admin_id: string | null;
};

const MESES_LABEL = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_FULL = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro"];

// Start months per category
const MES_INICIO_LID = 2;
const MES_INICIO_SUP = 2;
const MES_INICIO_ADM = 3;
const MES_FIM = 9;

const COLORS_CAT = {
  suplentes: "hsl(330, 81%, 60%)",
  liderancas: "hsl(263, 70%, 58%)",
  admin: "hsl(217, 91%, 60%)",
};

const COLORS_CITY = [
  "hsl(330, 81%, 60%)", "hsl(263, 70%, 58%)", "hsl(217, 91%, 60%)",
  "hsl(160, 60%, 45%)", "hsl(30, 90%, 55%)", "hsl(0, 70%, 55%)",
];

function MiniBar({ pago, total, cor = "bg-primary" }: { pago: number; total: number; cor?: string }) {
  const pct = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ pago, previsto }: { pago: number; previsto: number }) {
  if (previsto <= 0) return null;
  const pct = (pago / previsto) * 100;
  if (pct >= 100) return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
      <CheckCircle2 size={9} /> Quitado
    </span>
  );
  if (pct >= 50) return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 rounded-full">
      <AlertTriangle size={9} /> {pct.toFixed(0)}%
    </span>
  );
  if (pct > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-full">
      <AlertTriangle size={9} /> {pct.toFixed(0)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
      <XCircle size={9} /> Pendente
    </span>
  );
}

export default function Dashboard() {
  const [expandedSup, setExpandedSup] = useState(false);
  const [expandedLid, setExpandedLid] = useState(false);
  const [expandedAdm, setExpandedAdm] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filtroRegiao, setFiltroRegiao] = useState("");
  const [filtroPartido, setFiltroPartido] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [activeView, setActiveView] = useState<"resumo" | "mensal" | "detalhes" | "cidades">("resumo");
  const { cidadeAtiva, municipios, isAdmin } = useCidade();

  const { data: suplentes, isLoading: loadS } = useQuery({
    queryKey: ["suplentes", cidadeAtiva],
    queryFn: async () => {
      let query = (supabase as any).from("suplentes").select("*").order("nome");
      if (cidadeAtiva) query = query.eq("municipio_id", cidadeAtiva);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: liderancas, isLoading: loadL } = useQuery({
    queryKey: ["liderancas", cidadeAtiva],
    queryFn: async () => {
      let query = (supabase as any).from("liderancas").select("*").order("nome");
      if (cidadeAtiva) query = query.eq("municipio_id", cidadeAtiva);
      const { data, error } = await query;
      if (error) throw error;
      return data as Lideranca[];
    },
    staleTime: 0, refetchOnMount: "always",
  });

  const { data: administrativo, isLoading: loadA } = useQuery({
    queryKey: ["administrativo", cidadeAtiva],
    queryFn: async () => {
      let query = (supabase as any).from("administrativo").select("*").order("nome");
      if (cidadeAtiva) query = query.eq("municipio_id", cidadeAtiva);
      const { data, error } = await query;
      if (error) throw error;
      return data as AdminPessoa[];
    },
    staleTime: 0, refetchOnMount: "always",
  });

  // Pagamentos agora filtrados por cidade
  const { data: pagamentos } = useQuery({
    queryKey: ["pagamentos-dash", cidadeAtiva],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagamentos").select("*");
      if (error) throw error;
      return data as Pagamento[];
    },
    staleTime: 0, refetchOnMount: "always",
  });

  // IDs de suplentes/lideranças/admin da cidade ativa para filtrar pagamentos
  const supIds = useMemo(() => new Set((suplentes ?? []).map((s: any) => s.id)), [suplentes]);
  const lidIds = useMemo(() => new Set((liderancas ?? []).map((l: any) => l.id)), [liderancas]);
  const admIds = useMemo(() => new Set((administrativo ?? []).map((a: any) => a.id)), [administrativo]);

  const pagamentosFiltrados = useMemo(() => {
    if (!pagamentos) return [];
    if (!cidadeAtiva) return pagamentos; // "Todas" = todos os pagamentos
    return pagamentos.filter(p => {
      if (p.suplente_id && supIds.has(p.suplente_id)) return true;
      if (p.lideranca_id && lidIds.has(p.lideranca_id)) return true;
      if (p.admin_id && admIds.has(p.admin_id)) return true;
      // Se não tem nenhum ID vinculado, incluir (pagamento avulso)
      if (!p.suplente_id && !p.lideranca_id && !p.admin_id) return true;
      return false;
    });
  }, [pagamentos, cidadeAtiva, supIds, lidIds, admIds]);

  const isLoading = loadS || loadL || loadA;
  const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Filter options
  const regioes = useMemo(() => {
    const set = new Set<string>();
    (suplentes ?? []).forEach((s: any) => { if (s.regiao_atuacao) set.add(s.regiao_atuacao); if (s.bairro) set.add(s.bairro); });
    (liderancas ?? []).forEach(l => { if (l.regiao) set.add(l.regiao); });
    return Array.from(set).sort();
  }, [suplentes, liderancas]);

  const partidos = useMemo(() => {
    const set = new Set<string>();
    (suplentes ?? []).forEach((s: any) => { if (s.partido) set.add(s.partido); });
    return Array.from(set).sort();
  }, [suplentes]);

  const situacoes = useMemo(() => {
    const set = new Set<string>();
    (suplentes ?? []).forEach((s: any) => { if (s.situacao) set.add(s.situacao); });
    return Array.from(set).sort();
  }, [suplentes]);

  const activeFiltersCount = [filtroRegiao, filtroPartido, filtroSituacao].filter(Boolean).length;
  const clearFilters = () => { setFiltroRegiao(""); setFiltroPartido(""); setFiltroSituacao(""); };

  // Filtered lists
  const supList = useMemo(() => {
    let all = suplentes ?? [];
    if (search.trim()) {
      const q = normalizeStr(search);
      all = all.filter((s: any) => normalizeStr(s.nome || "").includes(q) || normalizeStr(s.numero_urna || "").includes(q) || normalizeStr(s.regiao_atuacao || "").includes(q));
    }
    if (filtroRegiao) all = all.filter((s: any) => s.regiao_atuacao === filtroRegiao || s.bairro === filtroRegiao);
    if (filtroPartido) all = all.filter((s: any) => s.partido === filtroPartido);
    if (filtroSituacao) all = all.filter((s: any) => s.situacao === filtroSituacao);
    return all;
  }, [suplentes, search, filtroRegiao, filtroPartido, filtroSituacao]);

  const lidList = useMemo(() => {
    let all = liderancas ?? [];
    if (search.trim()) {
      const q = normalizeStr(search);
      all = all.filter(l => normalizeStr(l.nome || "").includes(q) || normalizeStr(l.regiao || "").includes(q));
    }
    if (filtroRegiao) all = all.filter(l => l.regiao === filtroRegiao);
    return all;
  }, [liderancas, search, filtroRegiao]);

  const admList = useMemo(() => {
    const all = administrativo ?? [];
    if (!search.trim()) return all;
    const q = normalizeStr(search);
    return all.filter(a => normalizeStr(a.nome || "").includes(q));
  }, [administrativo, search]);

  // ─── CÁLCULOS FINANCEIROS ─────────────────────────────────────────────
  const totalCampanhaSup = supList.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
  const totalRetiradaMensalSup = supList.reduce((a: number, s: any) => a + (s.retirada_mensal_valor || 0), 0);
  const totalLiderancasQtd = supList.reduce((a: number, s: any) => a + (s.liderancas_qtd || 0), 0);
  const totalFiscais = supList.reduce((a: number, s: any) => a + (s.fiscais_qtd || 0), 0);
  const totalPessoas = totalLiderancasQtd + totalFiscais;
  const totalVotos = supList.reduce((a: number, s: any) => a + (s.total_votos || 0), 0);
  const totalExpectativa = supList.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0);
  const totalRetiradaSup = supList.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
  const totalLiderancasVal = supList.reduce((a: number, s: any) => a + ((s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0)), 0);
  const totalFiscaisVal = supList.reduce((a: number, s: any) => a + ((s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0)), 0);
  const totalPlotagemVal = supList.reduce((a: number, s: any) => a + ((s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0)), 0);
  const totalPlotagem = supList.reduce((a: number, s: any) => a + (s.plotagem_qtd || 0), 0);

  const totalLidMensal = lidList.reduce((a, l) => a + (l.retirada_mensal_valor || 0), 0);
  const totalAdmMensal = admList.reduce((a, p) => a + (p.valor_contrato || 0), 0);

  // ─── FLUXO MENSAL (Fev–Set) ───────────────────────────────────────────
  const fluxoMensal = useMemo(() => {
    const meses: { mes: number; label: string; suplentes: number; liderancas: number; admin: number; total: number; pago: number }[] = [];
    for (let m = 1; m <= MES_FIM; m++) {
      let supMes = 0;
      let lidMes = 0;
      let admMes = 0;

      if (m >= MES_INICIO_SUP) {
        supMes = supList.reduce((a: number, s: any) => {
          const meses = s.retirada_mensal_meses || 0;
          const mesInicio = MES_INICIO_SUP;
          const mesFim = mesInicio + meses - 1;
          if (m >= mesInicio && m <= mesFim) return a + (s.retirada_mensal_valor || 0);
          return a;
        }, 0);
      }

      if (m >= MES_INICIO_LID) {
        lidMes = lidList.reduce((a, l) => {
          const ateMes = l.retirada_ate_mes || MES_FIM;
          if (m <= ateMes) return a + (l.retirada_mensal_valor || 0);
          return a;
        }, 0);
      }

      if (m >= MES_INICIO_ADM) {
        admMes = admList.reduce((a, ad) => {
          const ateMes = ad.contrato_ate_mes || MES_FIM;
          if (m <= ateMes) return a + (ad.valor_contrato || 0);
          return a;
        }, 0);
      }

      const pagoMes = pagamentosFiltrados
        .filter(p => p.mes === m && p.ano === 2026)
        .reduce((a, p) => a + (p.valor || 0), 0);

      meses.push({
        mes: m,
        label: MESES_LABEL[m],
        suplentes: supMes,
        liderancas: lidMes,
        admin: admMes,
        total: supMes + lidMes + admMes,
        pago: pagoMes,
      });
    }
    return meses;
  }, [supList, lidList, admList, pagamentosFiltrados]);

  const totalPrevistoAno = fluxoMensal.reduce((a, m) => a + m.total, 0);
  // Add one-time costs (plotagem, lideranças campanha, fiscais)
  const custosPontuais = totalPlotagemVal + totalLiderancasVal + totalFiscaisVal;
  const orcamentoTotal = totalPrevistoAno + custosPontuais;

  const totalPagoAno = pagamentosFiltrados
    .filter(p => p.ano === 2026)
    .reduce((a, p) => a + (p.valor || 0), 0);

  const saldoRestante = orcamentoTotal - totalPagoAno;

  // Cumulative area chart data
  const cumulativeData = useMemo(() => {
    let acumPrevisto = 0;
    let acumPago = 0;
    return fluxoMensal.filter(m => m.mes >= 2).map(m => {
      acumPrevisto += m.total;
      acumPago += m.pago;
      return {
        label: MESES_LABEL[m.mes],
        previsto: acumPrevisto,
        pago: acumPago,
      };
    });
  }, [fluxoMensal]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: "Suplentes", value: totalCampanhaSup, fill: COLORS_CAT.suplentes },
    { name: "Lideranças", value: totalLidMensal * (MES_FIM - MES_INICIO_LID + 1), fill: COLORS_CAT.liderancas },
    { name: "Administrativo", value: totalAdmMensal * (MES_FIM - MES_INICIO_ADM + 1), fill: COLORS_CAT.admin },
  ].filter(d => d.value > 0), [totalCampanhaSup, totalLidMensal, totalAdmMensal]);

  // ─── DADOS POR CIDADE (para aba Cidades) ──────────────────────────────
  // ─── DADOS POR CIDADE (detalhado) ──────────────────────────────
  const dadosPorCidade = useMemo(() => {
    if (municipios.length === 0) return [];
    // When filtered by city, use all data (queries already filter)
    // When "Todas", need to split by municipio_id
    const allSup = suplentes ?? [];
    const allLid = liderancas ?? [];
    const allAdm = administrativo ?? [];

    return municipios.map((mun, idx) => {
      const supCidade = cidadeAtiva
        ? (cidadeAtiva === mun.id ? allSup : [])
        : allSup.filter((s: any) => s.municipio_id === mun.id);
      const lidCidade = cidadeAtiva
        ? (cidadeAtiva === mun.id ? allLid : [])
        : allLid.filter(l => l.municipio_id === mun.id);
      const admCidade = cidadeAtiva
        ? (cidadeAtiva === mun.id ? allAdm : [])
        : allAdm.filter(a => a.municipio_id === mun.id);

      const retiradaSup = supCidade.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
      const liderancasVal = supCidade.reduce((a: number, s: any) => a + ((s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0)), 0);
      const fiscaisVal = supCidade.reduce((a: number, s: any) => a + ((s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0)), 0);
      const plotagemVal = supCidade.reduce((a: number, s: any) => a + ((s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0)), 0);
      const orcSup = supCidade.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);

      const retiradaMensalSup = supCidade.reduce((a: number, s: any) => a + (s.retirada_mensal_valor || 0), 0);
      const liderancasQtd = supCidade.reduce((a: number, s: any) => a + (s.liderancas_qtd || 0), 0);
      const fiscaisQtd = supCidade.reduce((a: number, s: any) => a + (s.fiscais_qtd || 0), 0);
      const plotagemQtd = supCidade.reduce((a: number, s: any) => a + (s.plotagem_qtd || 0), 0);

      const lidMensal = lidCidade.reduce((a, l) => a + (l.retirada_mensal_valor || 0), 0);
      const orcLid = lidMensal * (MES_FIM - MES_INICIO_LID + 1);
      const admMensal = admCidade.reduce((a, ad) => a + (ad.valor_contrato || 0), 0);
      const orcAdm = admMensal * (MES_FIM - MES_INICIO_ADM + 1);
      const orcTotal = orcSup + orcLid + orcAdm;

      const supIdsCity = new Set(supCidade.map((s: any) => s.id));
      const lidIdsCity = new Set(lidCidade.map(l => l.id));
      const admIdsCity = new Set(admCidade.map(a => a.id));

      const pagoCity = (pagamentos ?? []).filter(p =>
        p.ano === 2026 && (
          (p.suplente_id && supIdsCity.has(p.suplente_id)) ||
          (p.lideranca_id && lidIdsCity.has(p.lideranca_id)) ||
          (p.admin_id && admIdsCity.has(p.admin_id))
        )
      ).reduce((a, p) => a + (p.valor || 0), 0);

      const totalVotosCidade = supCidade.reduce((a: number, s: any) => a + (s.total_votos || 0), 0);
      const totalExpCidade = supCidade.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0);

      return {
        id: mun.id,
        nome: mun.nome,
        uf: mun.uf,
        color: COLORS_CITY[idx % COLORS_CITY.length],
        suplentes: supCidade.length,
        liderancasCount: lidCidade.length,
        admin: admCidade.length,
        orcSup, retiradaSup, liderancasVal, fiscaisVal, plotagemVal,
        retiradaMensalSup, liderancasQtd, fiscaisQtd, plotagemQtd,
        lidMensal, orcLid, admMensal, orcAdm,
        orcamento: orcTotal,
        pago: pagoCity,
        votos2024: totalVotosCidade,
        expectativa2026: totalExpCidade,
        lidCidade,
        admCidade,
      };
    }).filter(c => c.orcamento > 0 || c.suplentes > 0 || c.liderancasCount > 0 || c.admin > 0);
  }, [municipios, suplentes, liderancas, administrativo, pagamentos, cidadeAtiva]);

  const mesAtual = new Date().getMonth() + 1;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtN = (v: number) => v.toLocaleString("pt-BR");
  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0);

  const visibleSup = expandedSup ? supList : supList.slice(0, 5);
  const visibleLid = expandedLid ? lidList : lidList.slice(0, 5);
  const visibleAdm = expandedAdm ? admList : admList.slice(0, 5);

  const tooltipFmt = (value: number) => fmt(value);

  const viewTabs: [string, string, any][] = [
    ["resumo", "Resumo", BarChart3],
    ["mensal", "Mensal", Calendar],
    ["detalhes", "Detalhes", List],
    ...(isAdmin && municipios.length > 1 ? [["cidades", "Cidades", Building2] as [string, string, any]] : []),
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 active:scale-95 transition-transform" onClick={() => exportAllPDF(supList, { regiao: filtroRegiao, partido: filtroPartido, situacao: filtroSituacao, busca: search })} disabled={supList.length === 0}>
              <FileDown size={14} /> PDF
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 active:scale-95 transition-transform" onClick={() => exportExcel(supList, { regiao: filtroRegiao, partido: filtroPartido, situacao: filtroSituacao, busca: search })} disabled={supList.length === 0}>
              <FileSpreadsheet size={14} /> Excel
            </Button>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, nome de urna ou setor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={14} /></button>}
            </div>
            <Button variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"} size="icon" className="h-10 w-10 shrink-0 relative" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} />
              {activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{activeFiltersCount}</span>}
            </Button>
          </div>

          {showFilters && (
            <div className="bg-card rounded-2xl border border-border p-3 space-y-2.5 shadow-sm animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5"><Filter size={10} /> Filtros</p>
                {activeFiltersCount > 0 && <button onClick={clearFilters} className="text-[10px] text-destructive font-semibold flex items-center gap-1"><X size={10} /> Limpar</button>}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Setor</p>
                <div className="flex flex-wrap gap-1.5">
                  {regioes.map(r => (
                    <button key={r} onClick={() => setFiltroRegiao(filtroRegiao === r ? "" : r)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${filtroRegiao === r ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{r}</button>
                  ))}
                  {regioes.length === 0 && <span className="text-[10px] text-muted-foreground italic">Nenhuma região</span>}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Partido</p>
                <div className="flex flex-wrap gap-1.5">
                  {partidos.map(p => (
                    <button key={p} onClick={() => setFiltroPartido(filtroPartido === p ? "" : p)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${filtroPartido === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{p}</button>
                  ))}
                  {partidos.length === 0 && <span className="text-[10px] text-muted-foreground italic">Nenhum partido</span>}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Situação</p>
                <div className="flex flex-wrap gap-1.5">
                  {situacoes.map(s => (
                    <button key={s} onClick={() => setFiltroSituacao(filtroSituacao === s ? "" : s)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all ${filtroSituacao === s ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{s}</button>
                  ))}
                  {situacoes.length === 0 && <span className="text-[10px] text-muted-foreground italic">Nenhuma situação</span>}
                </div>
              </div>
            </div>
          )}

          {activeFiltersCount > 0 && !showFilters && (
            <div className="flex flex-wrap gap-1.5">
              {filtroRegiao && <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1">{filtroRegiao} <button onClick={() => setFiltroRegiao("")}><X size={10} /></button></span>}
              {filtroPartido && <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1">{filtroPartido} <button onClick={() => setFiltroPartido("")}><X size={10} /></button></span>}
              {filtroSituacao && <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1">{filtroSituacao} <button onClick={() => setFiltroSituacao("")}><X size={10} /></button></span>}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => (<div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2 shadow-sm animate-pulse"><div className="h-3 bg-muted rounded w-16" /><div className="h-6 bg-muted rounded w-12" /></div>))}</div>
            <CardSkeletonList count={3} />
          </div>
        ) : (
          <>
            {/* ─── VIEW TABS ──────────────────────────────── */}
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              {viewTabs.map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveView(key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeView === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── RESUMO ────────────────────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeView === "resumo" && (
              <div className="space-y-4">
                {/* Big hero card with progress bar */}
                <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-2xl p-5 shadow-lg text-white">
                  <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                    <DollarSign size={16} /> Orçamento Total da Operação
                  </div>
                  <p className="text-3xl font-bold">{fmt(orcamentoTotal)}</p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/70">Já Pago</p>
                      <p className="text-sm font-bold">{fmt(totalPagoAno)}</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/70">Falta Pagar</p>
                      <p className="text-sm font-bold">{fmt(saldoRestante)}</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/70">% Pago</p>
                      <p className="text-sm font-bold">{orcamentoTotal > 0 ? ((totalPagoAno / orcamentoTotal) * 100).toFixed(1) : 0}%</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${orcamentoTotal > 0 ? Math.min(100, (totalPagoAno / orcamentoTotal) * 100) : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-white/60">
                      <span>0%</span>
                      <span>{orcamentoTotal > 0 ? ((totalPagoAno / orcamentoTotal) * 100).toFixed(1) : 0}% pago</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* ─── RESUMO GERAL — claro e descritivo ───────────── */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-4">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Resumo Geral</h2>

                  {/* Números da Eleição */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">📊 Números da Eleição</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Votos recebidos em 2024</p>
                        <p className="text-xl font-bold text-foreground">{fmtN(totalVotos)}</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Expectativa de votos 2026</p>
                        <p className="text-xl font-bold text-foreground">{fmtN(totalExpectativa)}</p>
                        {totalVotos > 0 && (
                          <p className={`text-[9px] font-medium flex items-center gap-0.5 mt-0.5 ${totalExpectativa >= totalVotos ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                            {totalExpectativa >= totalVotos ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                            {totalVotos > 0 ? ((((totalExpectativa - totalVotos) / totalVotos) * 100).toFixed(0)) : 0}% vs 2024
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Equipe */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">👥 Equipe de Campo e Apoio</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Suplentes cadastrados</p>
                        <p className="text-xl font-bold text-foreground">{supList.length}</p>
                        <p className="text-[9px] text-muted-foreground">Candidatos que a operação apoia</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Lideranças contratadas</p>
                        <p className="text-xl font-bold text-foreground">{lidList.length}</p>
                        <p className="text-[9px] text-muted-foreground">Cabos eleitorais e líderes de bairro</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Equipe administrativa</p>
                        <p className="text-xl font-bold text-foreground">{admList.length}</p>
                        <p className="text-[9px] text-muted-foreground">Funcionários e prestadores</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Pessoas de campo (total)</p>
                        <p className="text-xl font-bold text-foreground">{fmtN(totalPessoas)}</p>
                        <p className="text-[9px] text-muted-foreground">{fmtN(totalLiderancasQtd)} lideranças + {fmtN(totalFiscais)} fiscais</p>
                      </div>
                    </div>
                  </div>

                  {/* Plotagem */}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">🚗 Carros Plotados</p>
                    <div className="bg-muted/50 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Carros plotados contratados</p>
                        <p className="text-lg font-bold text-foreground">{fmtN(totalPlotagem)} unidades</p>
                        <p className="text-[9px] text-muted-foreground">Veículos com adesivação e plotagem</p>
                      </div>
                      <p className="text-sm font-bold text-primary">{fmt(totalPlotagemVal)}</p>
                    </div>
                  </div>
                </div>

                {/* ─── CUSTOS DETALHADOS ───────────────────── */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">💰 De Onde Vem Cada Gasto</h2>

                  {/* Suplentes */}
                  <div className="space-y-2 bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">Suplentes (custo de campanha)</p>
                        <p className="text-[10px] text-muted-foreground">Tudo que é gasto com cada suplente: salários, pessoas, material</p>
                      </div>
                      <p className="text-sm font-bold text-primary shrink-0">{fmt(totalCampanhaSup)}</p>
                    </div>
                    <MiniBar pago={totalCampanhaSup} total={orcamentoTotal} cor="bg-primary" />
                    <div className="space-y-1 pl-2 border-l-2 border-primary/20">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Retirada mensal dos suplentes</span>
                        <span className="font-medium text-foreground">{fmt(totalRetiradaSup)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Lideranças de campo ({fmtN(totalLiderancasQtd)} pessoas)</span>
                        <span className="font-medium text-foreground">{fmt(totalLiderancasVal)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Fiscais de urna ({fmtN(totalFiscais)} pessoas)</span>
                        <span className="font-medium text-foreground">{fmt(totalFiscaisVal)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Plotagem / Material ({fmtN(totalPlotagem)} un.)</span>
                        <span className="font-medium text-foreground">{fmt(totalPlotagemVal)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] pt-1 border-t border-border/30">
                        <span className="text-muted-foreground italic">Retirada mensal somada (todos sup.)</span>
                        <span className="font-bold text-foreground">{fmt(totalRetiradaMensalSup)}/mês</span>
                      </div>
                    </div>
                  </div>

                  {/* Lideranças */}
                  <div className="space-y-2 bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">Lideranças (mensal)</p>
                        <p className="text-[10px] text-muted-foreground">Cabos eleitorais e líderes de bairro — pagos todo mês</p>
                      </div>
                      <p className="text-sm font-bold text-primary shrink-0">{fmt(totalLidMensal)}/mês</p>
                    </div>
                    <MiniBar pago={totalLidMensal * (MES_FIM - MES_INICIO_LID + 1)} total={orcamentoTotal} cor="bg-primary" />
                    <div className="space-y-0.5 pl-2 border-l-2 border-primary/20">
                      {lidList.map(l => (
                        <div key={l.id} className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground truncate mr-2">{l.nome} {l.regiao ? `(${l.regiao})` : ""}</span>
                          <span className="font-medium text-foreground shrink-0">{fmt(l.retirada_mensal_valor || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admin */}
                  <div className="space-y-2 bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">Administrativo (mensal)</p>
                        <p className="text-[10px] text-muted-foreground">Funcionários e prestadores de serviço</p>
                      </div>
                      <p className="text-sm font-bold text-primary shrink-0">{fmt(totalAdmMensal)}/mês</p>
                    </div>
                    <MiniBar pago={totalAdmMensal * (MES_FIM - MES_INICIO_ADM + 1)} total={orcamentoTotal} cor="bg-primary" />
                    <div className="space-y-0.5 pl-2 border-l-2 border-primary/20">
                      {admList.map(a => (
                        <div key={a.id} className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground truncate mr-2">{a.nome}</span>
                          <span className="font-medium text-foreground shrink-0">{fmt(a.valor_contrato || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold text-foreground">TOTAL GERAL DA OPERAÇÃO</span>
                    <span className="text-lg font-bold text-primary">{fmt(orcamentoTotal)}</span>
                  </div>
                </div>

                {/* Distribuição por Categoria — Pie */}
                {pieData.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <PieChartIcon size={14} /> Onde vai o dinheiro (%)
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip formatter={tooltipFmt} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {pieData.map(d => (
                        <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                          <span className="text-muted-foreground">{d.name}</span>
                          <span className="font-bold text-foreground">{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── FLUXO MENSAL ──────────────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeView === "mensal" && (
              <div className="space-y-4">

                {/* Gráfico acumulado Previsto vs Pago */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <TrendingUp size={14} /> Previsto vs Pago (Acumulado)
                  </h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={cumulativeData}>
                      <defs>
                        <linearGradient id="gradPrevisto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={40} />
                      <Tooltip formatter={tooltipFmt} />
                      <Area type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(330, 81%, 60%)" fill="url(#gradPrevisto)" strokeWidth={2} />
                      <Area type="monotone" dataKey="pago" name="Pago" stroke="hsl(142, 71%, 45%)" fill="url(#gradPago)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-1">
                    <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(330, 81%, 60%)" }} /> Previsto</span>
                    <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-0.5 rounded" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} /> Pago</span>
                  </div>
                </div>

                {/* Tabela mensal detalhada */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={14} /> Mês a Mês
                    </h2>
                  </div>
                  <div className="divide-y divide-border">
                    {fluxoMensal.filter(m => m.mes >= 2).map(m => {
                      const isCurrent = m.mes === mesAtual;
                      return (
                        <div key={m.mes} className={`p-3 space-y-1.5 ${isCurrent ? "bg-primary/5" : ""}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                                {MESES_FULL[m.mes] || m.label}
                              </span>
                              {isCurrent && <span className="text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold uppercase">Atual</span>}
                              <StatusBadge pago={m.pago} previsto={m.total} />
                            </div>
                            <span className="text-sm font-bold text-foreground">{fmt(m.total)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {m.suplentes > 0 && (
                              <div className="text-center bg-muted/50 rounded-lg py-1">
                                <p className="text-[8px] text-muted-foreground uppercase">Suplentes</p>
                                <p className="text-[11px] font-bold text-foreground">{fmt(m.suplentes)}</p>
                              </div>
                            )}
                            {m.liderancas > 0 && (
                              <div className="text-center bg-muted/50 rounded-lg py-1">
                                <p className="text-[8px] text-muted-foreground uppercase">Lideranças</p>
                                <p className="text-[11px] font-bold text-foreground">{fmt(m.liderancas)}</p>
                              </div>
                            )}
                            {m.admin > 0 && (
                              <div className="text-center bg-muted/50 rounded-lg py-1">
                                <p className="text-[8px] text-muted-foreground uppercase">Admin</p>
                                <p className="text-[11px] font-bold text-foreground">{fmt(m.admin)}</p>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">Pago neste mês</span>
                              <span className="font-bold text-green-600 dark:text-green-400">{fmt(m.pago)}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">Falta pagar</span>
                              <span className="font-medium text-foreground">{fmt(Math.max(0, m.total - m.pago))}</span>
                            </div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-green-500 transition-all duration-700" style={{ width: `${m.total > 0 ? Math.min(100, (m.pago / m.total) * 100) : 0}%` }} />
                            </div>
                            <p className="text-[9px] text-muted-foreground text-right">{m.total > 0 ? ((m.pago / m.total) * 100).toFixed(0) : 0}% pago</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── DETALHES (LISTAS) ─────────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeView === "detalhes" && (
              <div className="space-y-4">
                {/* ORÇAMENTO TOTAL */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">💰 Orçamento Total</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">TOTAL GERAL</span>
                    <span className="text-lg font-bold text-primary">{fmt(orcamentoTotal)}</span>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-primary/20">
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Suplentes (campanha total)</span><span className="font-bold text-foreground">{fmt(totalCampanhaSup)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Lideranças (mensal × {MES_FIM - MES_INICIO_LID + 1} meses)</span><span className="font-bold text-foreground">{fmt(totalLidMensal * (MES_FIM - MES_INICIO_LID + 1))}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Administrativo (mensal × {MES_FIM - MES_INICIO_ADM + 1} meses)</span><span className="font-bold text-foreground">{fmt(totalAdmMensal * (MES_FIM - MES_INICIO_ADM + 1))}</span></div>
                  </div>
                  <MiniBar pago={totalPagoAno} total={orcamentoTotal} cor="bg-primary" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Pago: <span className="font-bold text-green-600 dark:text-green-400">{fmt(totalPagoAno)}</span></span>
                    <span>Falta: <span className="font-bold text-foreground">{fmt(saldoRestante)}</span></span>
                  </div>
                </div>

                {/* ─── COMPOSIÇÃO POR CIDADE ─────────────── */}
                {dadosPorCidade.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={14} /> 💰 De Onde Vem Cada Gasto — Por Cidade
                    </h2>

                    {dadosPorCidade.map(c => (
                      <div key={c.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        {/* Header da cidade */}
                        <div className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              <div>
                                <p className="text-sm font-bold text-foreground">{c.nome} — {c.uf}</p>
                                <p className="text-[10px] text-muted-foreground">{c.suplentes} suplentes · {c.liderancasCount} lideranças · {c.admin} admin</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-bold text-primary">{fmt(c.orcamento)}</p>
                              <StatusBadge pago={c.pago} previsto={c.orcamento} />
                            </div>
                          </div>
                        </div>

                        {/* Suplentes breakdown */}
                        {c.orcSup > 0 && (
                          <div className="mx-4 mb-2 bg-muted/30 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-foreground">Suplentes (custo de campanha)</p>
                                <p className="text-[10px] text-muted-foreground">Salários, pessoas, material</p>
                              </div>
                              <p className="text-sm font-bold text-primary shrink-0">{fmt(c.orcSup)}</p>
                            </div>
                            <MiniBar pago={c.orcSup} total={c.orcamento} cor="bg-primary" />
                            <div className="space-y-1 pl-2 border-l-2 border-primary/20">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Retirada mensal dos suplentes</span>
                                <span className="font-medium text-foreground">{fmt(c.retiradaSup)}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Lideranças de campo ({fmtN(c.liderancasQtd)} pessoas)</span>
                                <span className="font-medium text-foreground">{fmt(c.liderancasVal)}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Fiscais de urna ({fmtN(c.fiscaisQtd)} pessoas)</span>
                                <span className="font-medium text-foreground">{fmt(c.fiscaisVal)}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Plotagem / Material ({fmtN(c.plotagemQtd)} un.)</span>
                                <span className="font-medium text-foreground">{fmt(c.plotagemVal)}</span>
                              </div>
                              <div className="flex justify-between text-[11px] pt-1 border-t border-border/30">
                                <span className="text-muted-foreground italic">Retirada mensal somada (todos sup.)</span>
                                <span className="font-bold text-foreground">{fmt(c.retiradaMensalSup)}/mês</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Lideranças breakdown */}
                        {c.lidMensal > 0 && (
                          <div className="mx-4 mb-2 bg-muted/30 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-foreground">Lideranças (mensal)</p>
                                <p className="text-[10px] text-muted-foreground">Cabos eleitorais e líderes de bairro</p>
                              </div>
                              <p className="text-sm font-bold text-primary shrink-0">{fmt(c.lidMensal)}/mês</p>
                            </div>
                            <MiniBar pago={c.orcLid} total={c.orcamento} cor="bg-primary" />
                            <div className="space-y-0.5 pl-2 border-l-2 border-primary/20">
                              {c.lidCidade.map(l => (
                                <div key={l.id} className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground truncate mr-2">{l.nome} {l.regiao ? `(${l.regiao})` : ""}</span>
                                  <span className="font-medium text-foreground shrink-0">{fmt(l.retirada_mensal_valor || 0)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Administrativo breakdown */}
                        {c.admMensal > 0 && (
                          <div className="mx-4 mb-4 bg-muted/30 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-foreground">Administrativo (mensal)</p>
                                <p className="text-[10px] text-muted-foreground">Funcionários e prestadores</p>
                              </div>
                              <p className="text-sm font-bold text-primary shrink-0">{fmt(c.admMensal)}/mês</p>
                            </div>
                            <MiniBar pago={c.orcAdm} total={c.orcamento} cor="bg-primary" />
                            <div className="space-y-0.5 pl-2 border-l-2 border-primary/20">
                              {c.admCidade.map(a => (
                                <div key={a.id} className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground truncate mr-2">{a.nome}</span>
                                  <span className="font-medium text-foreground shrink-0">{fmt(a.valor_contrato || 0)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Votos + Pago */}
                        <div className="grid grid-cols-4 border-t border-border divide-x divide-border bg-muted/40">
                          <div className="py-2 px-1 text-center">
                            <p className="text-[8px] text-muted-foreground uppercase">Votos 2024</p>
                            <p className="text-xs font-bold text-foreground">{fmtN(c.votos2024)}</p>
                          </div>
                          <div className="py-2 px-1 text-center">
                            <p className="text-[8px] text-muted-foreground uppercase">Expect. 2026</p>
                            <p className="text-xs font-bold text-foreground">{fmtN(c.expectativa2026)}</p>
                          </div>
                          <div className="py-2 px-1 text-center">
                            <p className="text-[8px] text-muted-foreground uppercase">Já Pago</p>
                            <p className="text-xs font-bold text-green-600 dark:text-green-400">{fmt(c.pago)}</p>
                          </div>
                          <div className="py-2 px-1 text-center">
                            <p className="text-[8px] text-muted-foreground uppercase">Falta</p>
                            <p className="text-xs font-bold text-foreground">{fmt(Math.max(0, c.orcamento - c.pago))}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Totais que conferem */}
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 space-y-2">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider">✅ Conferência — Soma das Cidades</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Suplentes</span>
                          <span className="font-bold text-foreground">{fmt(dadosPorCidade.reduce((a, c) => a + c.orcSup, 0))}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Lideranças</span>
                          <span className="font-bold text-foreground">{fmt(dadosPorCidade.reduce((a, c) => a + c.orcLid, 0))}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Administrativo</span>
                          <span className="font-bold text-foreground">{fmt(dadosPorCidade.reduce((a, c) => a + c.orcAdm, 0))}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                        <span className="text-sm font-bold text-foreground">TOTAL (soma das cidades)</span>
                        <span className="text-lg font-bold text-primary">{fmt(dadosPorCidade.reduce((a, c) => a + c.orcamento, 0))}</span>
                      </div>
                    </div>
                  </div>
                )}

                {dadosPorCidade.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado para exibir.</p>
                )}
              </div>
            )}

                {/* Administrativo */}
                {admList.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5"><Briefcase size={14} /> Administrativo ({admList.length})</h2>
                    {visibleAdm.map(a => {
                      const pagoAdm = pagamentosFiltrados.filter(p => p.admin_id === a.id && p.ano === 2026).reduce((a2, p) => a2 + (p.valor || 0), 0);
                      const previstoAdm = (a.valor_contrato || 0) * ((a.contrato_ate_mes || MES_FIM) - MES_INICIO_ADM + 1);
                      return (
                        <div key={a.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground text-sm truncate">{a.nome}</p>
                                <StatusBadge pago={pagoAdm} previsto={previstoAdm} />
                              </div>
                              {a.whatsapp && <p className="text-[11px] text-muted-foreground mt-0.5">{a.whatsapp}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-primary">{fmt(a.valor_contrato || 0)}</p>
                              <p className="text-[10px] text-muted-foreground">por mês</p>
                              {pagoAdm > 0 && <p className="text-[9px] text-green-600 dark:text-green-400 font-medium">Pago: {fmt(pagoAdm)}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {admList.length > 5 && (
                      <button onClick={() => setExpandedAdm(!expandedAdm)} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                        {expandedAdm ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({admList.length}) <ChevronDown size={16} /></>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── CIDADES (admin only) ──────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeView === "cidades" && isAdmin && (
              <div className="space-y-4">
                {/* Total comparativo */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Building2 size={14} /> Comparativo por Cidade
                  </h2>

                  {dadosPorCidade.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Selecione "Todas as Cidades" para ver o comparativo.</p>
                  )}

                  {dadosPorCidade.map(c => (
                    <div key={c.id} className="border-b border-border last:border-0 py-3 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <div>
                            <p className="text-sm font-bold text-foreground">{c.nome}</p>
                            <p className="text-[10px] text-muted-foreground">{c.uf}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{fmt(c.orcamento)}</p>
                          <StatusBadge pago={c.pago} previsto={c.orcamento} />
                        </div>
                      </div>

                      {/* Métricas da cidade */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase">Suplentes</p>
                          <p className="text-sm font-bold text-foreground">{c.suplentes}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase">Lideranças</p>
                          <p className="text-sm font-bold text-foreground">{c.liderancasCount}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase">Admin</p>
                          <p className="text-sm font-bold text-foreground">{c.admin}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase">Votos 2024</p>
                          <p className="text-sm font-bold text-foreground">{fmtN(c.votos2024)}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase">Expect. 2026</p>
                          <p className="text-sm font-bold text-foreground">{fmtN(c.expectativa2026)}</p>
                        </div>
                      </div>

                      {/* Barra pago vs total */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Pago: <span className="font-bold text-green-600 dark:text-green-400">{fmt(c.pago)}</span></span>
                          <span className="text-muted-foreground">Falta: <span className="font-medium text-foreground">{fmt(Math.max(0, c.orcamento - c.pago))}</span></span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.orcamento > 0 ? Math.min(100, (c.pago / c.orcamento) * 100) : 0}%`, backgroundColor: c.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gráfico comparativo de orçamento por cidade */}
                {dadosPorCidade.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <BarChart3 size={14} /> Orçamento por Cidade
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dadosPorCidade} layout="vertical">
                        <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={100} />
                        <Tooltip formatter={tooltipFmt} />
                        <Bar dataKey="orcamento" name="Orçamento" radius={[0, 6, 6, 0]}>
                          {dadosPorCidade.map((c, i) => <Cell key={i} fill={c.color} />)}
                        </Bar>
                        <Bar dataKey="pago" name="Pago" radius={[0, 6, 6, 0]} fillOpacity={0.4}>
                          {dadosPorCidade.map((c, i) => <Cell key={i} fill={c.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Resumo total multi-cidade */}
                {dadosPorCidade.length > 0 && (
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 space-y-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Totais Consolidados</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Orçamento Total</p>
                        <p className="text-lg font-bold text-foreground">{fmt(dadosPorCidade.reduce((a, c) => a + c.orcamento, 0))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Total Pago</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(dadosPorCidade.reduce((a, c) => a + c.pago, 0))}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Suplentes (total)</p>
                        <p className="text-lg font-bold text-foreground">{dadosPorCidade.reduce((a, c) => a + c.suplentes, 0)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[9px] text-muted-foreground uppercase">Lideranças (total)</p>
                        <p className="text-lg font-bold text-foreground">{dadosPorCidade.reduce((a, c) => a + c.liderancasCount, 0)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
