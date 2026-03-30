import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, DollarSign, Vote, TrendingUp, MapPin, ChevronDown, ChevronUp, FileDown, FileSpreadsheet, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportAllPDF, exportExcel } from "@/lib/exports";
import { calcTotaisFinanceiros } from "@/lib/finance";
import { PageTransition } from "@/components/PageTransition";
import { CardSkeletonList } from "@/components/CardSkeleton";

export default function Dashboard() {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const { data: suplentes, isLoading } = useQuery({
    queryKey: ["suplentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suplentes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const normalizeStr = (str: string) =>
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const list = useMemo(() => {
    const all = suplentes ?? [];
    if (!search.trim()) return all;
    const q = normalizeStr(search);
    return all.filter((s: any) =>
      normalizeStr(s.nome || "").includes(q) ||
      normalizeStr(s.regiao_atuacao || "").includes(q)
    );
  }, [suplentes, search]);

  const totalCadastros = list.length;
  const totalVotos = list.reduce((a: number, s: any) => a + (s.total_votos || 0), 0);
  const totalExpectativa = list.reduce((a: number, s: any) => a + (s.expectativa_votos || 0), 0);
  const totalLiderancas = list.reduce((a: number, s: any) => a + (s.liderancas_qtd || 0), 0);
  const totalFiscais = list.reduce((a: number, s: any) => a + (s.fiscais_qtd || 0), 0);
  const totalPessoas = totalLiderancas + totalFiscais;
  const totalCampanha = list.reduce((a: number, s: any) => a + calcTotaisFinanceiros(s).totalFinal, 0);
  const totalPlotagem = list.reduce((a: number, s: any) => a + (s.plotagem_qtd || 0), 0);
  const totalRetirada = list.reduce((a: number, s: any) => a + ((s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0)), 0);
  const totalRetiradaMensal = list.reduce((a: number, s: any) => a + (s.retirada_mensal_valor || 0), 0);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtN = (v: number) => v.toLocaleString("pt-BR");

  const visibleList = expanded ? list : list.slice(0, 5);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 active:scale-95 transition-transform" onClick={() => exportAllPDF(list)} disabled={list.length === 0}>
              <FileDown size={14} /> PDF
            </Button>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 active:scale-95 transition-transform" onClick={() => exportExcel(list)} disabled={list.length === 0}>
              <FileSpreadsheet size={14} /> Excel
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar suplente por nome ou região..."
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
            <div className="h-20 bg-muted rounded-2xl animate-pulse" />
            <CardSkeletonList count={3} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">Suplentes</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{totalCadastros}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-sm">
                <div className="flex items-center gap-2">
                  <Vote size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">Votos (passada)</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{fmtN(totalVotos)}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">Expectativa</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{fmtN(totalExpectativa)}</p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 space-y-1 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  <span className="text-xs text-muted-foreground">Pessoas de Campo</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{fmtN(totalPessoas)}</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 text-sm text-white/80 mb-1">
                <DollarSign size={16} /> Valor Total das Campanhas
              </div>
              <p className="text-3xl font-bold text-white">{fmt(totalCampanha)}</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Detalhamento</h2>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total Lideranças</span>
                <span className="text-sm font-semibold text-foreground">{fmtN(totalLiderancas)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total Fiscais</span>
                <span className="text-sm font-semibold text-foreground">{fmtN(totalFiscais)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total Plotagem</span>
                <span className="text-sm font-semibold text-foreground">{fmtN(totalPlotagem)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Total Pessoas de Campo</span>
                <span className="text-sm font-semibold text-foreground">{fmtN(totalPessoas)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Valor das Retiradas por Mês</span>
                <span className="text-sm font-semibold text-foreground">{fmt(totalRetiradaMensal)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-muted-foreground">Valor Total das Retiradas</span>
                <span className="text-sm font-semibold text-foreground">{fmt(totalRetirada)}</span>
              </div>
            </div>

            {/* Resumo por Suplente */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Resumo por Suplente</h2>

              {visibleList.map((s: any) => {
                const liderancas = s.liderancas_qtd || 0;
                const fiscais = s.fiscais_qtd || 0;
                const pessoas = liderancas + fiscais;
                const plotagem = s.plotagem_qtd || 0;
                const retirada = (s.retirada_mensal_valor || 0) * (s.retirada_mensal_meses || 0);
                return (
                  <div key={s.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{s.nome}</p>
                          {s.regiao_atuacao && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className="text-primary" /> {s.regiao_atuacao}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
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
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Fiscais</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(fiscais)}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Plotag.</p>
                        <p className="text-sm font-bold text-foreground">{fmtN(plotagem)}</p>
                      </div>
                      <div className="py-2 px-1 text-center">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Retirada</p>
                        <p className="text-xs font-bold text-foreground">{fmt(retirada)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {list.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary bg-card rounded-2xl border border-border shadow-sm active:scale-[0.98] transition-transform"
                >
                  {expanded ? (
                    <>Mostrar menos <ChevronUp size={16} /></>
                  ) : (
                    <>Ver todos ({list.length}) <ChevronDown size={16} /></>
                  )}
                </button>
              )}

              {/* Total geral */}
              <div className="bg-gradient-to-r from-pink-500/10 to-rose-400/10 rounded-2xl border border-primary/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">Total Geral</p>
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
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Líder.</p>
                    <p className="text-sm font-bold text-foreground">{fmtN(totalLiderancas)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Fiscais</p>
                    <p className="text-sm font-bold text-foreground">{fmtN(totalFiscais)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Retirada</p>
                    <p className="text-sm font-bold text-foreground">{fmt(totalRetirada)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                  <span className="text-sm font-bold text-foreground">TOTAL CAMPANHA</span>
                  <span className="text-lg font-bold text-primary">{fmt(totalCampanha)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
