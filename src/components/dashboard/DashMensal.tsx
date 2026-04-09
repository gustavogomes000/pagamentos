import { memo } from "react";
import { TrendingUp, Calendar } from "lucide-react";
import { StatusBadge, EmptyState } from "./DashShared";
import { fmt, fmtK, MESES_LABEL, MESES_FULL, type FluxoMes } from "./types";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  fluxoMensal: FluxoMes[];
  cumulativeData: { label: string; previsto: number; pago: number }[];
  mesAtual: number;
}

function DashMensalInner({ fluxoMensal, cumulativeData, mesAtual }: Props) {
  const tooltipFmt = (value: number) => fmt(value);
  const filtered = fluxoMensal.filter(m => m.mes >= 2);

  if (filtered.length === 0) {
    return <EmptyState message="Nenhum fluxo mensal disponível." />;
  }

  const mesAtualLabel = MESES_LABEL[mesAtual] || "";

  return (
    <div className="space-y-4">
      {/* Gráfico acumulado */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <TrendingUp size={14} /> Previsto vs Pago (Acumulado)
        </h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={cumulativeData}>
            <defs>
              <linearGradient id="gradPrevisto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPago" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--status-success))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--status-success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} width={40} />
            <Tooltip formatter={tooltipFmt} />
            {mesAtualLabel && (
              <ReferenceLine
                x={mesAtualLabel}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{ value: "Hoje", position: "top", fontSize: 9, fill: "hsl(var(--primary))" }}
              />
            )}
            <Area type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(var(--primary))" fill="url(#gradPrevisto)" strokeWidth={2} />
            <Area type="monotone" dataKey="pago" name="Pago" stroke="hsl(var(--status-success))" fill="url(#gradPago)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-6 mt-1">
          <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-0.5 rounded bg-primary" /> Previsto</span>
          <span className="flex items-center gap-1.5 text-[10px]"><span className="w-3 h-0.5 rounded bg-status-success" /> Pago</span>
        </div>
      </div>

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
