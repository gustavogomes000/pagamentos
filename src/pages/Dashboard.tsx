import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, DollarSign, Vote, TrendingUp, MapPin, ChevronDown, ChevronUp,
  FileDown, FileSpreadsheet, Search, Briefcase, List, Wallet, Filter, X,
  Calendar, BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
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

type Lideranca = {
  id: string; nome: string; regiao: string | null;
  retirada_mensal_valor: number | null; retirada_mensal_meses: number | null;
  retirada_ate_mes: number | null; chave_pix: string | null;
};

type AdminPessoa = {
  id: string; nome: string; whatsapp: string | null;
  valor_contrato: number | null; valor_contrato_meses: number | null;
  contrato_ate_mes: number | null;
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
const MES_INICIO_SUP = 3;
const MES_INICIO_ADM = 3;
const MES_FIM = 10;

const COLORS_CAT = {
  suplentes: "hsl(330, 81%, 60%)",
  liderancas: "hsl(263, 70%, 58%)",
  admin: "hsl(217, 91%, 60%)",
};

function MiniBar({ pago, total, cor = "bg-primary" }: { pago: number; total: number; cor?: string }) {
  const pct = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${cor}`} style={{ width: `${pct}%` }} />
    </div>
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
  const [activeView, setActiveView] = useState<"resumo" | "mensal" | "detalhes">("resumo");

  const { data: suplentes, isLoading: loadS } = useQuery({
    queryKey: ["suplentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suplentes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: liderancas, isLoading: loadL } = useQuery({
    queryKey: ["liderancas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("liderancas").select("*").order("nome");
      if (error) throw error;
      return data as Lideranca[];
    },
    staleTime: 0, refetchOnMount: "always",
  });

  const { data: administrativo, isLoading: loadA } = useQuery({
    queryKey: ["administrativo"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("administrativo").select("*").order("nome");
      if (error) throw error;
      return data as AdminPessoa[];
    },
    staleTime: 0, refetchOnMount: "always",
  });

  const { data: pagamentos } = useQuery({
    queryKey: ["pagamentos-dash"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagamentos").select("*");
      if (error) throw error;
      return data as Pagamento[];
    },
    staleTime: 0, refetchOnMount: "always",
  });

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
      all = all.filter((s: any) => normalizeStr(s.nome || "").includes(q) || normalizeStr(s.regiao_atuacao || "").includes(q));
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

  // ─── FLUXO MENSAL (Fev–Out) ───────────────────────────────────────────
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

      const pagoMes = (pagamentos ?? [])
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
  }, [supList, lidList, admList, pagamentos]);

  const totalPrevistoAno = fluxoMensal.reduce((a, m) => a + m.total, 0);
  // Add one-time costs (plotagem, lideranças campanha, fiscais)
  const custosPontuais = totalPlotagemVal + totalLiderancasVal + totalFiscaisVal;
  const orcamentoTotal = totalPrevistoAno + custosPontuais;

  const totalPagoAno = (pagamentos ?? [])
    .filter(p => p.ano === 2026)
    .reduce((a, p) => a + (p.valor || 0), 0);

  const saldoRestante = orcamentoTotal - totalPagoAno;

  // Pie chart data
  const pieData = useMemo(() => [
    { name: "Suplentes", value: totalCampanhaSup, fill: COLORS_CAT.suplentes },
    { name: "Lideranças", value: totalLidMensal * (MES_FIM - MES_INICIO_LID + 1), fill: COLORS_CAT.liderancas },
    { name: "Administrativo", value: totalAdmMensal * (MES_FIM - MES_INICIO_ADM + 1), fill: COLORS_CAT.admin },
  ].filter(d => d.value > 0), [totalCampanhaSup, totalLidMensal, totalAdmMensal]);

  const mesAtual = new Date().getMonth() + 1;
  const gastoAteMesAtual = fluxoMensal.filter(m => m.mes <= mesAtual).reduce((a, m) => a + m.total, 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtN = (v: number) => v.toLocaleString("pt-BR");
  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0);

  const visibleSup = expandedSup ? supList : supList.slice(0, 5);
  const visibleLid = expandedLid ? lidList : lidList.slice(0, 5);
  const visibleAdm = expandedAdm ? admList : admList.slice(0, 5);

  const tooltipFmt = (value: number) => fmt(value);

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
              <Input placeholder="Buscar por nome ou região..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-border" />
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
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Região / Bairro</p>
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
              {([["resumo", "Resumo", BarChart3], ["mensal", "Mensal", Calendar], ["detalhes", "Detalhes", List]] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveView(key)}
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
                {/* Big hero card */}
                <div className="bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 rounded-2xl p-5 shadow-lg text-white">
                  <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                    <DollarSign size={16} /> Orçamento Total da Operação
                  </div>
                  <p className="text-3xl font-bold">{fmt(orcamentoTotal)}</p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/70">Pago</p>
                      <p className="text-sm font-bold">{fmt(totalPagoAno)}</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/70">Restante</p>
                      <p className="text-sm font-bold">{fmt(saldoRestante)}</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/70">% Pago</p>
                      <p className="text-sm font-bold">{orcamentoTotal > 0 ? ((totalPagoAno / orcamentoTotal) * 100).toFixed(1) : 0}%</p>
                    </div>
                  </div>
                  <MiniBar pago={totalPagoAno} total={orcamentoTotal} cor="bg-white" />
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <List size={14} className="text-primary" />
                      <span className="text-[10px] text-muted-foreground">Suplentes</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{supList.length}</p>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-primary" />
                      <span className="text-[10px] text-muted-foreground">Lideranças</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{lidList.length}</p>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={14} className="text-primary" />
                      <span className="text-[10px] text-muted-foreground">Admin</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{admList.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <Vote size={14} className="text-primary" />
                      <span className="text-[10px] text-muted-foreground">Votos (2024)</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{fmtN(totalVotos)}</p>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-primary" />
                      <span className="text-[10px] text-muted-foreground">Expectativa</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{fmtN(totalExpectativa)}</p>
                  </div>
                </div>

                {/* Distribuição por Categoria — Pie */}
                {pieData.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <PieChartIcon size={14} /> Distribuição por Categoria
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

                {/* Composição detalhada */}
                <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Composição do Orçamento</h2>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-primary bg-primary/10 flex items-center gap-1"><List size={9} />Suplentes (Campanha)</span>
                      <span className="text-xs font-bold text-foreground ml-auto">{fmt(totalCampanhaSup)}</span>
                    </div>
                    <MiniBar pago={totalCampanhaSup} total={orcamentoTotal} cor="bg-primary" />
                    <div className="pl-3 space-y-0.5">
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Retirada ({supList.length} sup.)</span><span className="font-medium text-foreground">{fmt(totalRetiradaSup)}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Lideranças ({fmtN(totalLiderancasQtd)} pess.)</span><span className="font-medium text-foreground">{fmt(totalLiderancasVal)}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Fiscais ({fmtN(totalFiscais)} pess.)</span><span className="font-medium text-foreground">{fmt(totalFiscaisVal)}</span></div>
                      <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Plotagem ({fmtN(totalPlotagem)} un.)</span><span className="font-medium text-foreground">{fmt(totalPlotagemVal)}</span></div>
                      <div className="flex justify-between text-[11px] pt-0.5 border-t border-border/30"><span className="text-muted-foreground font-medium">Retirada mensal (todos)</span><span className="font-bold text-foreground">{fmt(totalRetiradaMensalSup)}/mês</span></div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-primary bg-primary/10 flex items-center gap-1"><Users size={9} />Lideranças</span>
                      <span className="text-xs font-bold text-foreground ml-auto">{fmt(totalLidMensal)}/mês</span>
                    </div>
                    <MiniBar pago={totalLidMensal * (MES_FIM - MES_INICIO_LID + 1)} total={orcamentoTotal} cor="bg-primary" />
                    <div className="pl-3 space-y-0.5">
                      {lidList.map(l => (
                        <div key={l.id} className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground truncate mr-2">{l.nome} {l.regiao ? `(${l.regiao})` : ""}</span>
                          <span className="font-medium text-foreground shrink-0">{fmt(l.retirada_mensal_valor || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-primary bg-primary/10 flex items-center gap-1"><Briefcase size={9} />Administrativo</span>
                      <span className="text-xs font-bold text-foreground ml-auto">{fmt(totalAdmMensal)}/mês</span>
                    </div>
                    <MiniBar pago={totalAdmMensal * (MES_FIM - MES_INICIO_ADM + 1)} total={orcamentoTotal} cor="bg-primary" />
                    <div className="pl-3 space-y-0.5">
                      {admList.map(a => (
                        <div key={a.id} className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground truncate mr-2">{a.nome}</span>
                          <span className="font-medium text-foreground shrink-0">{fmt(a.valor_contrato || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm font-bold text-foreground">ORÇAMENTO TOTAL</span>
                    <span className="text-lg font-bold text-primary">{fmt(orcamentoTotal)}</span>
                  </div>
                </div>

                {/* Pessoas de campo */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Pessoas de Campo</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center bg-muted/50 rounded-lg py-1.5"><p className="text-[9px] text-muted-foreground uppercase">Líderes</p><p className="text-sm font-bold text-foreground">{fmtN(totalLiderancasQtd)}</p></div>
                    <div className="text-center bg-muted/50 rounded-lg py-1.5"><p className="text-[9px] text-muted-foreground uppercase">Fiscais</p><p className="text-sm font-bold text-foreground">{fmtN(totalFiscais)}</p></div>
                    <div className="text-center bg-muted/50 rounded-lg py-1.5"><p className="text-[9px] text-muted-foreground uppercase">Total</p><p className="text-sm font-bold text-foreground">{fmtN(totalPessoas)}</p></div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* ─── FLUXO MENSAL ──────────────────────────── */}
            {/* ═══════════════════════════════════════════════ */}
            {activeView === "mensal" && (
              <div className="space-y-4">
                {/* Gráfico de barras empilhadas */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <BarChart3 size={14} /> Gastos Mensais (Fev–Out 2026)
                  </h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={fluxoMensal.filter(m => m.mes >= 2)} barSize={22}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} width={40} />
                      <Tooltip formatter={tooltipFmt} labelFormatter={(l) => `Mês: ${l}`} />
                      <Bar dataKey="suplentes" name="Suplentes" stackId="a" fill={COLORS_CAT.suplentes} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="liderancas" name="Lideranças" stackId="a" fill={COLORS_CAT.liderancas} />
                      <Bar dataKey="admin" name="Administrativo" stackId="a" fill={COLORS_CAT.admin} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS_CAT.suplentes }} /><span className="text-muted-foreground">Suplentes</span></div>
                    <div className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS_CAT.liderancas }} /><span className="text-muted-foreground">Lideranças</span></div>
                    <div className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS_CAT.admin }} /><span className="text-muted-foreground">Admin</span></div>
                  </div>
                </div>

                {/* Evolução acumulada */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <TrendingUp size={14} /> Acumulado no Ano
                  </h2>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={fluxoMensal.filter(m => m.mes >= 2).map((m, i, arr) => ({
                      ...m,
                      acumulado: arr.slice(0, i + 1).reduce((a, x) => a + x.total, 0),
                      pagoAcum: arr.slice(0, i + 1).reduce((a, x) => a + x.pago, 0),
                    }))}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} width={40} />
                      <Tooltip formatter={tooltipFmt} />
                      <Area type="monotone" dataKey="acumulado" name="Previsto" stroke="hsl(330, 81%, 60%)" fill="hsl(330, 81%, 60%)" fillOpacity={0.15} strokeWidth={2} />
                      <Area type="monotone" dataKey="pagoAcum" name="Pago" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-1">
                    <div className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(330, 81%, 60%)" }} /><span className="text-muted-foreground">Previsto</span></div>
                    <div className="flex items-center gap-1 text-[10px]"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(142, 71%, 45%)" }} /><span className="text-muted-foreground">Pago</span></div>
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
                          {m.pago > 0 && (
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">Pago neste mês</span>
                              <span className="font-bold text-green-600 dark:text-green-400">{fmt(m.pago)}</span>
                            </div>
                          )}
                          <MiniBar pago={m.pago} total={m.total} cor="bg-green-500" />
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
                {/* Suplentes */}
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <List size={14} /> Suplentes ({supList.length})
                  </h2>
                  {visibleSup.map((s: any) => {
                    const liderancas = s.liderancas_qtd || 0;
                    const fiscais = s.fiscais_qtd || 0;
                    const pessoas = liderancas + fiscais;
                    const plotagem = s.plotagem_qtd || 0;
                    const retirada = (s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0);
                    return (
                      <div key={s.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground text-sm truncate">{s.nome}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                {s.numero_urna && <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">#{s.numero_urna}</span>}
                                {s.bairro && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin size={9} className="text-primary" />{s.bairro}</span>}
                                {s.partido && <span className="text-[10px] text-muted-foreground">{s.partido}</span>}
                                {s.situacao && <span className="text-[10px] font-medium text-primary uppercase">{s.situacao}</span>}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-primary whitespace-nowrap">{fmt(calcTotaisFinanceiros(s).totalFinal)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 border-t border-border divide-x divide-border bg-muted/40">
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Votos</p><p className="text-sm font-bold text-foreground">{fmtN(s.total_votos || 0)}</p></div>
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Expect.</p><p className="text-sm font-bold text-foreground">{fmtN(s.expectativa_votos || 0)}</p></div>
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Pessoas</p><p className="text-sm font-bold text-foreground">{fmtN(pessoas)}</p></div>
                        </div>
                        <div className="grid grid-cols-4 border-t border-border divide-x divide-border bg-muted/40">
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Líder.</p><p className="text-sm font-bold text-foreground">{fmtN(liderancas)}</p><p className="text-[9px] text-muted-foreground">{fmt(liderancas * (s.liderancas_valor_unit || 0))}</p></div>
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Fiscais</p><p className="text-sm font-bold text-foreground">{fmtN(fiscais)}</p><p className="text-[9px] text-muted-foreground">{fmt(fiscais * (s.fiscais_valor_unit || 0))}</p></div>
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Plotag.</p><p className="text-sm font-bold text-foreground">{fmtN(plotagem)}</p><p className="text-[9px] text-muted-foreground">{fmt(plotagem * (s.plotagem_valor_unit || 0))}</p></div>
                          <div className="py-2 px-1 text-center"><p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Retirada</p><p className="text-xs font-bold text-foreground">{fmt(retirada)}</p><p className="text-[9px] text-muted-foreground">{s.retirada_mensal_meses || 0}× {fmt(s.retirada_mensal_valor || 0)}</p></div>
                        </div>
                      </div>
                    );
                  })}
                  {supList.length > 5 && (
                    <button onClick={() => setExpandedSup(!expandedSup)} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                      {expandedSup ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({supList.length}) <ChevronDown size={16} /></>}
                    </button>
                  )}
                </div>

                {/* Lideranças */}
                {lidList.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5"><Users size={14} /> Lideranças ({lidList.length})</h2>
                    {visibleLid.map(l => (
                      <div key={l.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{l.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {l.regiao && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin size={9} className="text-primary" />{l.regiao}</span>}
                              {l.chave_pix && <span className="text-[10px] text-muted-foreground">PIX: {l.chave_pix}</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-primary">{fmt(l.retirada_mensal_valor || 0)}</p>
                            <p className="text-[10px] text-muted-foreground">por mês</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {lidList.length > 5 && (
                      <button onClick={() => setExpandedLid(!expandedLid)} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                        {expandedLid ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({lidList.length}) <ChevronDown size={16} /></>}
                      </button>
                    )}
                  </div>
                )}

                {/* Administrativo */}
                {admList.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5"><Briefcase size={14} /> Administrativo ({admList.length})</h2>
                    {visibleAdm.map(a => (
                      <div key={a.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{a.nome}</p>
                            {a.whatsapp && <p className="text-[11px] text-muted-foreground mt-0.5">{a.whatsapp}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-primary">{fmt(a.valor_contrato || 0)}</p>
                            <p className="text-[10px] text-muted-foreground">por mês</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {admList.length > 5 && (
                      <button onClick={() => setExpandedAdm(!expandedAdm)} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                        {expandedAdm ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({admList.length}) <ChevronDown size={16} /></>}
                      </button>
                    )}
                  </div>
                )}

                {/* Resumo final */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 space-y-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resumo Geral</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase">Votos</p><p className="text-sm font-bold text-foreground">{fmtN(totalVotos)}</p></div>
                    <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase">Expect.</p><p className="text-sm font-bold text-foreground">{fmtN(totalExpectativa)}</p></div>
                    <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase">Pessoas</p><p className="text-sm font-bold text-foreground">{fmtN(totalPessoas)}</p></div>
                    <div className="text-center"><p className="text-[10px] text-muted-foreground uppercase">Plotag.</p><p className="text-sm font-bold text-foreground">{fmtN(totalPlotagem)}</p></div>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-primary/20">
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Suplentes (campanha)</span><span className="font-bold text-foreground">{fmt(totalCampanhaSup)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Lideranças (mensal)</span><span className="font-bold text-foreground">{fmt(totalLidMensal)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Administrativo (mensal)</span><span className="font-bold text-foreground">{fmt(totalAdmMensal)}</span></div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                    <span className="text-sm font-bold text-foreground">ORÇAMENTO TOTAL</span>
                    <span className="text-lg font-bold text-primary">{fmt(orcamentoTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
