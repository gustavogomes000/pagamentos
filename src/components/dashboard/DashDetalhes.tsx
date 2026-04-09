import { memo } from "react";
import { Building2 } from "lucide-react";
import { MiniBar, StatusBadge, EmptyState } from "./DashShared";
import { fmt, fmtN, type CidadeData } from "./types";

interface Props {
  orcamentoTotal: number;
  totalPagoAno: number;
  saldoRestante: number;
  totalCampanhaSup: number;
  totalLidFluxo: number;
  totalAdmFluxo: number;
  dadosPorCidade: CidadeData[];
}

function DashDetalhesInner({
  orcamentoTotal, totalPagoAno, saldoRestante,
  totalCampanhaSup, totalLidFluxo, totalAdmFluxo,
  dadosPorCidade,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Orçamento total */}
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
          <span>Pago: <span className="font-bold text-status-success">{fmt(totalPagoAno)}</span></span>
          <span>Falta: <span className="font-bold text-foreground">{fmt(saldoRestante)}</span></span>
        </div>
      </div>

      {/* Por cidade */}
      {dadosPorCidade.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={14} /> 💰 De Onde Vem Cada Gasto — Por Cidade
          </h2>

          {dadosPorCidade.map(c => (
            <div key={c.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
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
                  <p className="text-xs font-bold text-status-success">{fmt(c.pago)}</p>
                </div>
                <div className="py-2 px-1 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase">Falta</p>
                  <p className="text-xs font-bold text-foreground">{fmt(Math.max(0, c.orcamento - c.pago))}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Conferência */}
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
      ) : (
        <EmptyState message="Nenhum dado para exibir." />
      )}
    </div>
  );
}

export const DashDetalhes = memo(DashDetalhesInner);
