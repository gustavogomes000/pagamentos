import { memo } from "react";
import { Building2, BarChart3 } from "lucide-react";
import { StatusBadge, EmptyState } from "./DashShared";
import { fmt, fmtN, fmtK, type CidadeData } from "./types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  dadosPorCidade: CidadeData[];
}

function DashCidadesInner({ dadosPorCidade }: Props) {
  const tooltipFmt = (value: number) => fmt(value);

  if (dadosPorCidade.length === 0) {
    return <EmptyState message="Selecione 'Todas as Cidades' para ver o comparativo." />;
  }

  return (
    <div className="space-y-4">
      {/* Cards por cidade */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3">
          <Building2 size={14} /> Comparativo por Cidade
        </h2>

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

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Pago: <span className="font-bold text-status-success">{fmt(c.pago)}</span></span>
                <span className="text-muted-foreground">Falta: <span className="font-medium text-foreground">{fmt(Math.max(0, c.orcamento - c.pago))}</span></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.orcamento > 0 ? Math.min(100, (c.pago / c.orcamento) * 100) : 0}%`, backgroundColor: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico comparativo */}
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

      {/* Totais consolidados */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-4 space-y-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Totais Consolidados</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Orçamento Total</p>
            <p className="text-lg font-bold text-foreground">{fmt(dadosPorCidade.reduce((a, c) => a + c.orcamento, 0))}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase">Total Pago</p>
            <p className="text-lg font-bold text-status-success">{fmt(dadosPorCidade.reduce((a, c) => a + c.pago, 0))}</p>
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
    </div>
  );
}

export const DashCidades = memo(DashCidadesInner);
