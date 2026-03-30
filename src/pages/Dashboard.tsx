import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Vote, TrendingUp, MapPin, ChevronDown, ChevronUp, FileDown, FileSpreadsheet, Search, Briefcase, List, Wallet } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportAllPDF, exportExcel } from "@/lib/exports";
import { calcTotaisFinanceiros } from "@/lib/finance";
import { PageTransition } from "@/components/PageTransition";
import { CardSkeletonList } from "@/components/CardSkeleton";

type Lideranca = {
  id: string; nome: string; regiao: string | null;
  retirada_mensal_valor: number | null; chave_pix: string | null;
};

type AdminPessoa = {
  id: string; nome: string; whatsapp: string | null; valor_contrato: number | null;
};

function Bar({ pago, total, cor = "bg-primary" }: { pago: number; total: number; cor?: string }) {
  const pct = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Dashboard() {
  const [expandedSup, setExpandedSup] = useState(false);
  const [expandedLid, setExpandedLid] = useState(false);
  const [expandedAdm, setExpandedAdm] = useState(false);
  const [search, setSearch] = useState("");

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
  });

  const { data: administrativo, isLoading: loadA } = useQuery({
    queryKey: ["administrativo"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("administrativo").select("*").order("nome");
      if (error) throw error;
      return data as AdminPessoa[];
    },
  });

  const isLoading = loadS || loadL || loadA;

  const normalizeStr = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const supList = useMemo(() => {
    const all = suplentes ?? [];
    if (!search.trim()) return all;
    const q = normalizeStr(search);
    return all.filter((s: any) =>
      normalizeStr(s.nome || "").includes(q) ||
      normalizeStr(s.regiao_atuacao || "").includes(q)
    );
  }, [suplentes, search]);

  const lidList = useMemo(() => {
    const all = liderancas ?? [];
    if (!search.trim()) return all;
    const q = normalizeStr(search);
    return all.filter(l => normalizeStr(l.nome || "").includes(q) || normalizeStr(l.regiao || "").includes(q));
  }, [liderancas, search]);

  const admList = useMemo(() => {
    const all = administrativo ?? [];
    if (!search.trim()) return all;
    const q = normalizeStr(search);
    return all.filter(a => normalizeStr(a.nome || "").includes(q));
  }, [administrativo, search]);

  // Suplentes totais
  const totalSupCadastros = supList.length;
  const totalVotos = supList.reduce((a: number, s: any) => a + (s.total_votos || 0), 0);
  const totalExpectativa = supList.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0);
  const totalLiderancasQtd = supList.reduce((a: number, s: any) => a + (s.liderancas_qtd || 0), 0);
  const totalFiscais = supList.reduce((a: number, s: any) => a + (s.fiscais_qtd || 0), 0);
  const totalPessoas = totalLiderancasQtd + totalFiscais;
  const totalCampanhaSup = supList.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
  const totalPlotagem = supList.reduce((a: number, s: any) => a + (s.plotagem_qtd || 0), 0);
  const totalRetiradaSup = supList.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
  const totalRetiradaMensalSup = supList.reduce((a: number, s: any) => a + (s.retirada_mensal_valor || 0), 0);
  const totalLiderancasVal = supList.reduce((a: number, s: any) => a + ((s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0)), 0);
  const totalFiscaisVal = supList.reduce((a: number, s: any) => a + ((s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0)), 0);
  const totalPlotagemVal = supList.reduce((a: number, s: any) => a + ((s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0)), 0);

  // Lideranças totais
  const totalLidCadastros = lidList.length;
  const totalLidMensal = lidList.reduce((a, l) => a + (l.retirada_mensal_valor || 0), 0);

  // Admin totais
  const totalAdmCadastros = admList.length;
  const totalAdmMensal = admList.reduce((a, p) => a + (p.valor_contrato || 0), 0);

  // VALOR TOTAL GERAL (suplentes campanha + lideranças mensal + admin mensal)
  const valorTotalGeral = totalCampanhaSup + totalLidMensal + totalAdmMensal;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtN = (v: number) => v.toLocaleString("pt-BR");

  const visibleSup = expandedSup ? supList : supList.slice(0, 5);
  const visibleLid = expandedLid ? lidList : lidList.slice(0, 5);
  const visibleAdm = expandedAdm ? admList : admList.slice(0, 5);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 active:scale-95 transition-transform" onClick={() => exportAllPDF(supList)} disabled={supList.length === 0}>
              <FileDown size={14} /> PDF
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 active:scale-95 transition-transform" onClick={() => exportExcel(supList)} disabled={supList.length === 0}>
              <FileSpreadsheet size={14} /> Excel
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou região..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
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
            <CardSkeletonList count={3} />
          </div>
        ) : (
          <>
            {/* Cards resumo geral */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <List size={14} className="text-pink-500" />
                  <span className="text-[10px] text-muted-foreground">Suplentes</span>
                </div>
                <p className="text-xl font-bold text-foreground">{totalSupCadastros}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-violet-500" />
                  <span className="text-[10px] text-muted-foreground">Lideranças</span>
                </div>
                <p className="text-xl font-bold text-foreground">{totalLidCadastros}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Briefcase size={14} className="text-blue-500" />
                  <span className="text-[10px] text-muted-foreground">Admin</span>
                </div>
                <p className="text-xl font-bold text-foreground">{totalAdmCadastros}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl border border-border p-3 space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <Vote size={14} className="text-primary" />
                  <span className="text-[10px] text-muted-foreground">Votos (passada)</span>
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

            {/* ─── VALOR TOTAL GERAL ───────────────────────────────────── */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                <DollarSign size={16} /> Valor Total Geral
              </div>
              <p className="text-3xl font-bold text-white">{fmt(valorTotalGeral)}</p>
              <p className="text-[10px] text-white/60 mt-1">Suplentes + Lideranças + Administrativo</p>
            </div>

            {/* ─── DETALHAMENTO DO VALOR TOTAL ──────────────────────── */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Composição do Valor Total</h2>
              
              {/* Suplentes breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-pink-500 bg-pink-500/10 flex items-center gap-1"><List size={9} />Suplentes</span>
                  <span className="text-xs font-bold text-foreground ml-auto">{fmt(totalCampanhaSup)}</span>
                </div>
                <Bar pago={totalCampanhaSup} total={valorTotalGeral} cor="bg-pink-500" />
                <div className="pl-3 space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Retirada Mensal ({fmtN(supList.length)} × mensal)</span>
                    <span className="font-medium text-foreground">{fmt(totalRetiradaSup)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Lideranças ({fmtN(totalLiderancasQtd)} pessoas)</span>
                    <span className="font-medium text-foreground">{fmt(totalLiderancasVal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Fiscais ({fmtN(totalFiscais)} pessoas)</span>
                    <span className="font-medium text-foreground">{fmt(totalFiscaisVal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Plotagem ({fmtN(totalPlotagem)} un.)</span>
                    <span className="font-medium text-foreground">{fmt(totalPlotagemVal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] pt-0.5 border-t border-border/30">
                    <span className="text-muted-foreground font-medium">Retirada mensal (todos)</span>
                    <span className="font-bold text-foreground">{fmt(totalRetiradaMensalSup)}/mês</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Lideranças breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-violet-500 bg-violet-500/10 flex items-center gap-1"><Users size={9} />Lideranças</span>
                  <span className="text-xs font-bold text-foreground ml-auto">{fmt(totalLidMensal)}/mês</span>
                </div>
                <Bar pago={totalLidMensal} total={valorTotalGeral} cor="bg-violet-500" />
                <div className="pl-3 space-y-0.5">
                  {lidList.map(l => (
                    <div key={l.id} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground truncate mr-2">{l.nome} {l.regiao ? `(${l.regiao})` : ""}</span>
                      <span className="font-medium text-foreground shrink-0">{fmt(l.retirada_mensal_valor || 0)}</span>
                    </div>
                  ))}
                  {lidList.length === 0 && <p className="text-[11px] text-muted-foreground italic">Nenhuma liderança cadastrada</p>}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Admin breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-blue-500 bg-blue-500/10 flex items-center gap-1"><Briefcase size={9} />Administrativo</span>
                  <span className="text-xs font-bold text-foreground ml-auto">{fmt(totalAdmMensal)}/mês</span>
                </div>
                <Bar pago={totalAdmMensal} total={valorTotalGeral} cor="bg-blue-500" />
                <div className="pl-3 space-y-0.5">
                  {admList.map(a => (
                    <div key={a.id} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground truncate mr-2">{a.nome}</span>
                      <span className="font-medium text-foreground shrink-0">{fmt(a.valor_contrato || 0)}</span>
                    </div>
                  ))}
                  {admList.length === 0 && <p className="text-[11px] text-muted-foreground italic">Nenhum administrativo cadastrado</p>}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Resumo pessoas */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pessoas de Campo</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center bg-muted/50 rounded-lg py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Líderes</p>
                    <p className="text-sm font-bold text-foreground">{fmtN(totalLiderancasQtd)}</p>
                  </div>
                  <div className="text-center bg-muted/50 rounded-lg py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Fiscais</p>
                    <p className="text-sm font-bold text-foreground">{fmtN(totalFiscais)}</p>
                  </div>
                  <div className="text-center bg-muted/50 rounded-lg py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase">Total</p>
                    <p className="text-sm font-bold text-foreground">{fmtN(totalPessoas)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SUPLENTES ────────────────────────────────────────── */}
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
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          {fmt(calcTotaisFinanceiros(s).totalFinal)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 border-t border-border divide-x divide-border bg-muted/40">
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Votos</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(s.total_votos || 0)}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Expect.</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(s.expectativa_votos || 0)}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Pessoas</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(pessoas)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 border-t border-border divide-x divide-border bg-muted/40">
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Líder.</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(liderancas)}</p>
                        <p className="text-[9px] text-muted-foreground">{fmt(liderancas * (s.liderancas_valor_unit || 0))}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Fiscais</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(fiscais)}</p>
                        <p className="text-[9px] text-muted-foreground">{fmt(fiscais * (s.fiscais_valor_unit || 0))}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Plotag.</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(plotagem)}</p>
                        <p className="text-[9px] text-muted-foreground">{fmt(plotagem * (s.plotagem_valor_unit || 0))}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Retirada</p>
                        <p className="text-xs font-bold text-foreground">{fmt(retirada)}</p>
                        <p className="text-[9px] text-muted-foreground">{s.retirada_mensal_meses || 0}× {fmt(s.retirada_mensal_valor || 0)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {supList.length > 5 && (
                <button onClick={() => setExpandedSup(!expandedSup)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                  {expandedSup ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({supList.length}) <ChevronDown size={16} /></>}
                </button>
              )}
            </div>

            {/* ─── LIDERANÇAS ───────────────────────────────────────── */}
            {lidList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} /> Lideranças ({lidList.length})
                </h2>

                {visibleLid.map(l => (
                  <div key={l.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{l.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {l.regiao && <span className="text-[11px] text-muted-foreground flex items-center gap-0.5"><MapPin size={9} className="text-violet-500" />{l.regiao}</span>}
                          {l.chave_pix && <span className="text-[10px] text-muted-foreground">PIX: {l.chave_pix}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{fmt(l.retirada_mensal_valor || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">por mês</p>
                      </div>
                    </div>
                  </div>
                ))}

                {lidList.length > 5 && (
                  <button onClick={() => setExpandedLid(!expandedLid)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                    {expandedLid ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({lidList.length}) <ChevronDown size={16} /></>}
                  </button>
                )}
              </div>
            )}

            {/* ─── ADMINISTRATIVO ──────────────────────────────────── */}
            {admList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={14} /> Administrativo ({admList.length})
                </h2>

                {visibleAdm.map(a => (
                  <div key={a.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{a.nome}</p>
                        {a.whatsapp && <p className="text-[11px] text-muted-foreground mt-0.5">{a.whatsapp}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{fmt(a.valor_contrato || 0)}</p>
                        <p className="text-[10px] text-muted-foreground">por mês</p>
                      </div>
                    </div>
                  </div>
                ))}

                {admList.length > 5 && (
                  <button onClick={() => setExpandedAdm(!expandedAdm)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform">
                    {expandedAdm ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todos ({admList.length}) <ChevronDown size={16} /></>}
                  </button>
                )}
              </div>
            )}

            {/* ─── TOTAL GERAL FINAL ───────────────────────────────── */}
            <div className="bg-gradient-to-r from-pink-500/10 to-rose-400/10 rounded-2xl border border-primary/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Resumo Geral</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Votos</p>
                  <p className="text-sm font-bold text-foreground">{fmtN(totalVotos)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Expect.</p>
                  <p className="text-sm font-bold text-foreground">{fmtN(totalExpectativa)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Pessoas</p>
                  <p className="text-sm font-bold text-foreground">{fmtN(totalPessoas)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase">Plotag.</p>
                  <p className="text-sm font-bold text-foreground">{fmtN(totalPlotagem)}</p>
                </div>
              </div>
              <div className="space-y-1 pt-1 border-t border-primary/20">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Suplentes (campanha)</span>
                  <span className="font-bold text-foreground">{fmt(totalCampanhaSup)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Lideranças (mensal)</span>
                  <span className="font-bold text-foreground">{fmt(totalLidMensal)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Administrativo (mensal)</span>
                  <span className="font-bold text-foreground">{fmt(totalAdmMensal)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                <span className="text-sm font-bold text-foreground">TOTAL GERAL</span>
                <span className="text-lg font-bold text-primary">{fmt(valorTotalGeral)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
