import { memo } from "react";
import { Calendar } from "lucide-react";
import { StatusBadge, EmptyState } from "./DashShared";
import { fmt, MESES_FULL, type FluxoMes } from "./types";

interface Props {
  fluxoMensal: FluxoMes[];
  mesAtual: number;
}

function DashMensalInner({ fluxoMensal, mesAtual }: Props) {
  const filtered = fluxoMensal.filter(m => m.mes >= 2);

  if (filtered.length === 0) {
    return <EmptyState message="Nenhum fluxo mensal disponível." />;
  }

  return (
    <div className="space-y-4">
      {/* Tabela mensal */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={14} /> Mês a Mês
          </h2>
        </div>
        <div className="divide-y divide-border">
          {filtered.map(m => {
            const isCurrent = m.mes === mesAtual;
            return (
              <div key={m.mes} className={`p-3 space-y-1.5 ${isCurrent ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isCurrent ? "text-primary" : "text-foreground"}`}>
                      {MESES_FULL[m.mes] || m.label}
                    </span>
                    {isCurrent && <span className="text-[8px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold uppercase animate-pulse">Atual</span>}
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
                    <span className="font-bold text-status-success">{fmt(m.pago)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Falta pagar</span>
                    <span className="font-medium text-foreground">{fmt(Math.max(0, m.total - m.pago))}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-status-success transition-all duration-700" style={{ width: `${m.total > 0 ? Math.min(100, (m.pago / m.total) * 100) : 0}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground text-right">{m.total > 0 ? ((m.pago / m.total) * 100).toFixed(0) : 0}% pago</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const DashMensal = memo(DashMensalInner);
