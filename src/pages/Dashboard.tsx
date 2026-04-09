import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, FileDown, FileSpreadsheet, Search, Filter, X,
  Calendar, BarChart3, List, Building2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportAllPDF, exportExcel } from "@/lib/exports";
import { calcTotaisFinanceiros } from "@/lib/finance";
import { getMesInicioComHistorico } from "@/lib/paymentEligibility";
import { PageTransition } from "@/components/PageTransition";
import { SectionSkeleton } from "@/components/dashboard/DashShared";
import { DashResumo } from "@/components/dashboard/DashResumo";
import { DashMensal } from "@/components/dashboard/DashMensal";
import { DashDetalhes } from "@/components/dashboard/DashDetalhes";
import { DashCidades } from "@/components/dashboard/DashCidades";
import { useCidade } from "@/contexts/CidadeContext";
import {
  type Lideranca, type AdminPessoa, type Pagamento, type CidadeData,
  MESES_LABEL, MES_INICIO_LID, MES_INICIO_SUP, MES_INICIO_ADM, MES_FIM,
  COLORS_CAT, COLORS_CITY,
} from "@/components/dashboard/types";

const STALE_TIME = 60_000; // 1 min cache

export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filtroRegiao, setFiltroRegiao] = useState("");
  const [filtroPartido, setFiltroPartido] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [activeView, setActiveView] = useState<"resumo" | "mensal" | "detalhes" | "cidades">("resumo");
  const { cidadeAtiva, municipios, isAdmin } = useCidade();

  // ─── QUERIES (staleTime 1min) ─────────────────────────────────────
  const { data: suplentes, isLoading: loadS } = useQuery({
    queryKey: ["suplentes", cidadeAtiva],
    queryFn: async () => {
      let query = (supabase as any).from("suplentes").select("id, nome, numero_urna, bairro, regiao_atuacao, partido, situacao, telefone, cargo_disputado, ano_eleicao, total_votos, expectativa_votos, base_politica, retirada_mensal_valor, retirada_mensal_meses, plotagem_qtd, plotagem_valor_unit, liderancas_qtd, liderancas_valor_unit, fiscais_qtd, fiscais_valor_unit, total_campanha, municipio_id, created_at").order("nome");
      if (cidadeAtiva) query = query.eq("municipio_id", cidadeAtiva);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: STALE_TIME,
  });

  const { data: liderancas, isLoading: loadL } = useQuery({
    queryKey: ["liderancas", cidadeAtiva],
    queryFn: async () => {
      let query = (supabase as any).from("liderancas").select("id, nome, regiao, retirada_mensal_valor, retirada_ate_mes, municipio_id, chave_pix, whatsapp, ligacao_politica, retirada_mensal_meses, created_at").order("nome");
      if (cidadeAtiva) query = query.eq("municipio_id", cidadeAtiva);
      const { data, error } = await query;
      if (error) throw error;
      return data as Lideranca[];
    },
    staleTime: STALE_TIME,
  });

  const { data: administrativo, isLoading: loadA } = useQuery({
    queryKey: ["administrativo", cidadeAtiva],
    queryFn: async () => {
      let query = (supabase as any).from("administrativo").select("id, nome, valor_contrato, contrato_ate_mes, municipio_id, whatsapp, created_at").order("nome");
      if (cidadeAtiva) query = query.eq("municipio_id", cidadeAtiva);
      const { data, error } = await query;
      if (error) throw error;
      return data as AdminPessoa[];
    },
    staleTime: STALE_TIME,
  });

  const { data: pagamentos, isLoading: loadP } = useQuery({
    queryKey: ["pagamentos-dash", cidadeAtiva],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagamentos").select("id, suplente_id, lideranca_id, admin_id, tipo_pessoa, mes, ano, categoria, valor, observacao, created_at");
      if (error) throw error;
      return data as Pagamento[];
    },
    staleTime: STALE_TIME,
  });

  // ─── FILTERED IDS ─────────────────────────────────────────────────
  const supIds = useMemo(() => new Set((suplentes ?? []).map((s: any) => s.id)), [suplentes]);
  const lidIds = useMemo(() => new Set((liderancas ?? []).map((l: any) => l.id)), [liderancas]);
  const admIds = useMemo(() => new Set((administrativo ?? []).map((a: any) => a.id)), [administrativo]);

  const pagamentosFiltrados = useMemo(() => {
    if (!pagamentos) return [];
    if (!cidadeAtiva) return pagamentos;
    return pagamentos.filter(p => {
      if (p.suplente_id && supIds.has(p.suplente_id)) return true;
      if (p.lideranca_id && lidIds.has(p.lideranca_id)) return true;
      if (p.admin_id && admIds.has(p.admin_id)) return true;
      if (!p.suplente_id && !p.lideranca_id && !p.admin_id) return true;
      return false;
    });
  }, [pagamentos, cidadeAtiva, supIds, lidIds, admIds]);

  const isLoading = loadS || loadL || loadA;
  const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // ─── FILTER OPTIONS ──────────────────────────────────────────────
  const regioes = useMemo(() => {
    const set = new Set<string>();
    (suplentes ?? []).forEach((s: any) => { if (s.regiao_atuacao) set.add(s.regiao_atuacao); if (s.bairro) set.add(s.bairro); });
    (liderancas ?? []).forEach((l: any) => { if (l.regiao) set.add(l.regiao); });
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

  // ─── FILTERED LISTS ──────────────────────────────────────────────
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
      all = all.filter((l: any) => normalizeStr(l.nome || "").includes(q) || normalizeStr(l.regiao || "").includes(q));
    }
    if (filtroRegiao) all = all.filter((l: any) => l.regiao === filtroRegiao);
    return all;
  }, [liderancas, search, filtroRegiao]);

  const admList = useMemo(() => {
    const all = administrativo ?? [];
    if (!search.trim()) return all;
    const q = normalizeStr(search);
    return all.filter((a: any) => normalizeStr(a.nome || "").includes(q));
  }, [administrativo, search]);

  // ─── FINANCIAL CALCULATIONS (memoized) ────────────────────────────
  const financials = useMemo(() => {
    const totalCampanhaSup = supList.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
    const totalRetiradaMensalSup = supList.reduce((a: number, s: any) => a + (s.retirada_mensal_valor || 0), 0);
    const totalLiderancasQtd = supList.reduce((a: number, s: any) => a + (s.liderancas_qtd || 0), 0);
    const totalFiscais = supList.reduce((a: number, s: any) => a + (s.fiscais_qtd || 0), 0);
    // #9: totalPessoas inclui lideranças contratadas reais + campo dos suplentes
    const totalPessoas = totalLiderancasQtd + totalFiscais + lidList.length;
    const totalVotos = supList.reduce((a: number, s: any) => a + (s.total_votos || 0), 0);
    const totalExpectativa = supList.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0);
    const totalRetiradaSup = supList.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
    const totalLiderancasVal = supList.reduce((a: number, s: any) => a + ((s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0)), 0);
    const totalFiscaisVal = supList.reduce((a: number, s: any) => a + ((s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0)), 0);
    const totalPlotagemVal = supList.reduce((a: number, s: any) => a + ((s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0)), 0);
    const totalPlotagem = supList.reduce((a: number, s: any) => a + (s.plotagem_qtd || 0), 0);
    const totalLidMensal = lidList.reduce((a: number, l: any) => a + (l.retirada_mensal_valor || 0), 0);
    const totalAdmMensal = admList.reduce((a: number, p: any) => a + (p.valor_contrato || 0), 0);

    return {
      totalCampanhaSup, totalRetiradaMensalSup, totalLiderancasQtd,
      totalFiscais, totalPessoas, totalVotos, totalExpectativa,
      totalRetiradaSup, totalLiderancasVal, totalFiscaisVal,
      totalPlotagemVal, totalPlotagem, totalLidMensal, totalAdmMensal,
    };
  }, [supList, lidList, admList]);

  const fluxoMensal = useMemo(() => {
    const meses = [];
    for (let m = 1; m <= MES_FIM; m++) {
      let supMes = 0, lidMes = 0, admMes = 0;
      if (m >= MES_INICIO_SUP) {
        supMes = supList.reduce((a: number, s: any) => {
          const inicio = getMesInicioComHistorico({
            tipo: "suplente",
            pessoaId: s.id,
            createdAt: s.created_at,
            mesInicioGlobal: MES_INICIO_SUP,
            pagamentos: pagamentosFiltrados,
            categoria: "retirada",
          });
          const numMeses = s.retirada_mensal_meses || 0;
          const mesFim = inicio + numMeses - 1;
          return (m >= inicio && m <= mesFim) ? a + (s.retirada_mensal_valor || 0) : a;
        }, 0);
      }
      if (m >= MES_INICIO_LID) {
        lidMes = lidList.reduce((a: number, l: any) => {
          const inicio = getMesInicioComHistorico({
            tipo: "lideranca",
            pessoaId: l.id,
            createdAt: l.created_at,
            mesInicioGlobal: MES_INICIO_LID,
            pagamentos: pagamentosFiltrados,
            categoria: "retirada",
          });
          const ateMes = l.retirada_ate_mes || MES_FIM;
          return (m >= inicio && m <= ateMes) ? a + (l.retirada_mensal_valor || 0) : a;
        }, 0);
      }
      if (m >= MES_INICIO_ADM) {
        admMes = admList.reduce((a: number, ad: any) => {
          const inicio = getMesInicioComHistorico({
            tipo: "admin",
            pessoaId: ad.id,
            createdAt: ad.created_at,
            mesInicioGlobal: MES_INICIO_ADM,
            pagamentos: pagamentosFiltrados,
            categoria: "salario",
          });
          const ateMes = ad.contrato_ate_mes || MES_FIM;
          return (m >= inicio && m <= ateMes) ? a + (ad.valor_contrato || 0) : a;
        }, 0);
      }
      const pagoMes = pagamentosFiltrados
        .filter(p => p.mes === m && p.ano === 2026)
        .reduce((a, p) => a + (p.valor || 0), 0);

      meses.push({
        mes: m, label: MESES_LABEL[m],
        suplentes: supMes, liderancas: lidMes, admin: admMes,
        total: supMes + lidMes + admMes, pago: pagoMes,
      });
    }
    return meses;
  }, [supList, lidList, admList, pagamentosFiltrados]);

  const totalPrevistoAno = fluxoMensal.reduce((a, m) => a + m.total, 0);
  const custosPontuais = financials.totalPlotagemVal + financials.totalLiderancasVal + financials.totalFiscaisVal;
  const orcamentoTotal = totalPrevistoAno + custosPontuais;
  const totalPagoAno = pagamentosFiltrados.filter(p => p.ano === 2026).reduce((a, p) => a + (p.valor || 0), 0);
  const saldoRestante = orcamentoTotal - totalPagoAno;

  const cumulativeData = useMemo(() => {
    let acumPrevisto = 0, acumPago = 0;
    return fluxoMensal.filter(m => m.mes >= MES_INICIO_SUP).map(m => {
      acumPrevisto += m.total;
      acumPago += m.pago;
      return { label: MESES_LABEL[m.mes], previsto: acumPrevisto, pago: acumPago };
    });
  }, [fluxoMensal]);

  const totalSupFluxo = fluxoMensal.reduce((a, m) => a + m.suplentes, 0);
  const totalLidFluxo = fluxoMensal.reduce((a, m) => a + m.liderancas, 0);
  const totalAdmFluxo = fluxoMensal.reduce((a, m) => a + m.admin, 0);

  const pieData = useMemo(() => [
    { name: "Suplentes", value: totalSupFluxo + custosPontuais, fill: COLORS_CAT.suplentes },
    { name: "Lideranças", value: totalLidFluxo, fill: COLORS_CAT.liderancas },
    { name: "Administrativo", value: totalAdmFluxo, fill: COLORS_CAT.admin },
  ].filter(d => d.value > 0), [totalSupFluxo, totalLidFluxo, totalAdmFluxo, custosPontuais]);

  // ─── DADOS POR CIDADE ─────────────────────────────────────────────
  const dadosPorCidade = useMemo<CidadeData[]>(() => {
    if (municipios.length === 0) return [];
    const allSup = suplentes ?? [];
    const allLid = liderancas ?? [];
    const allAdm = administrativo ?? [];

    return municipios.map((mun, idx) => {
      const supCidade = cidadeAtiva
        ? (cidadeAtiva === mun.id ? allSup : [])
        : allSup.filter((s: any) => s.municipio_id === mun.id);
      const lidCidade = cidadeAtiva
        ? (cidadeAtiva === mun.id ? allLid : [])
        : allLid.filter((l: any) => l.municipio_id === mun.id);
      const admCidade = cidadeAtiva
        ? (cidadeAtiva === mun.id ? allAdm : [])
        : allAdm.filter((a: any) => a.municipio_id === mun.id);

      const retiradaSup = supCidade.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
      const liderancasVal = supCidade.reduce((a: number, s: any) => a + ((s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0)), 0);
      const fiscaisVal = supCidade.reduce((a: number, s: any) => a + ((s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0)), 0);
      const plotagemVal = supCidade.reduce((a: number, s: any) => a + ((s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0)), 0);
      const orcSup = supCidade.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
      const retiradaMensalSup = supCidade.reduce((a: number, s: any) => a + (s.retirada_mensal_valor || 0), 0);
      const liderancasQtd = supCidade.reduce((a: number, s: any) => a + (s.liderancas_qtd || 0), 0);
      const fiscaisQtd = supCidade.reduce((a: number, s: any) => a + (s.fiscais_qtd || 0), 0);
      const plotagemQtd = supCidade.reduce((a: number, s: any) => a + (s.plotagem_qtd || 0), 0);
      const lidMensal = lidCidade.reduce((a: number, l: any) => a + (l.retirada_mensal_valor || 0), 0);
      const orcLid = lidMensal * (MES_FIM - MES_INICIO_LID + 1);
      const admMensal = admCidade.reduce((a: number, ad: any) => a + (ad.valor_contrato || 0), 0);
      const orcAdm = admMensal * (MES_FIM - MES_INICIO_ADM + 1);
      const orcTotal = orcSup + orcLid + orcAdm;

      const supIdsCity = new Set(supCidade.map((s: any) => s.id));
      const lidIdsCity = new Set(lidCidade.map((l: any) => l.id));
      const admIdsCity = new Set(admCidade.map((a: any) => a.id));
      const pagoCity = (pagamentos ?? []).filter(p =>
        p.ano === 2026 && (
          (p.suplente_id && supIdsCity.has(p.suplente_id)) ||
          (p.lideranca_id && lidIdsCity.has(p.lideranca_id)) ||
          (p.admin_id && admIdsCity.has(p.admin_id))
        )
      ).reduce((a, p) => a + (p.valor || 0), 0);

      return {
        id: mun.id, nome: mun.nome, uf: mun.uf,
        color: COLORS_CITY[idx % COLORS_CITY.length],
        suplentes: supCidade.length, liderancasCount: lidCidade.length, admin: admCidade.length,
        orcSup, retiradaSup, liderancasVal, fiscaisVal, plotagemVal,
        retiradaMensalSup, liderancasQtd, fiscaisQtd, plotagemQtd,
        lidMensal, orcLid, admMensal, orcAdm,
        orcamento: orcTotal, pago: pagoCity,
        votos2024: supCidade.reduce((a: number, s: any) => a + (s.total_votos || 0), 0),
        expectativa2026: supCidade.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0),
        lidCidade: lidCidade as Lideranca[],
        admCidade: admCidade as AdminPessoa[],
      };
    }).filter(c => c.orcamento > 0 || c.suplentes > 0 || c.liderancasCount > 0 || c.admin > 0);
  }, [municipios, suplentes, liderancas, administrativo, pagamentos, cidadeAtiva]);

  const mesAtual = new Date().getMonth() + 1;

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
            <div className="grid grid-cols-2 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2 shadow-sm animate-pulse">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-12" />
                </div>
              ))}
            </div>
            <SectionSkeleton />
            <SectionSkeleton />
          </div>
        ) : (
          <>
            {/* View Tabs */}
            <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
              {viewTabs.map(([key, label, Icon]) => (
                <button key={key} onClick={() => setActiveView(key as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeView === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {activeView === "resumo" && (
              <DashResumo
                supList={supList}
                lidList={lidList}
                admList={admList}
                orcamentoTotal={orcamentoTotal}
                totalPagoAno={totalPagoAno}
                saldoRestante={saldoRestante}
                totalVotos={financials.totalVotos}
                totalExpectativa={financials.totalExpectativa}
                totalPessoas={financials.totalPessoas}
                totalLiderancasQtd={financials.totalLiderancasQtd}
                totalFiscais={financials.totalFiscais}
                totalPlotagem={financials.totalPlotagem}
                totalPlotagemVal={financials.totalPlotagemVal}
                totalCampanhaSup={financials.totalCampanhaSup}
                totalRetiradaSup={financials.totalRetiradaSup}
                totalLiderancasVal={financials.totalLiderancasVal}
                totalFiscaisVal={financials.totalFiscaisVal}
                totalRetiradaMensalSup={financials.totalRetiradaMensalSup}
                totalLidMensal={financials.totalLidMensal}
                totalAdmMensal={financials.totalAdmMensal}
                pieData={pieData}
              />
            )}

            {activeView === "mensal" && (
              <DashMensal
                fluxoMensal={fluxoMensal}
                cumulativeData={cumulativeData}
                mesAtual={mesAtual}
              />
            )}

            {activeView === "detalhes" && (
              <DashDetalhes
                orcamentoTotal={orcamentoTotal}
                totalPagoAno={totalPagoAno}
                saldoRestante={saldoRestante}
                totalCampanhaSup={financials.totalCampanhaSup}
                totalLidMensal={financials.totalLidMensal}
                totalAdmMensal={financials.totalAdmMensal}
                dadosPorCidade={dadosPorCidade}
              />
            )}

            {activeView === "cidades" && isAdmin && (
              <DashCidades dadosPorCidade={dadosPorCidade} />
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
