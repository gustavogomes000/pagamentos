import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { CardSkeletonList } from "@/components/CardSkeleton";
import {
  ChevronDown, ChevronUp, Trash2, X, Loader2, Wallet,
  ChevronLeft, ChevronRight, Save, Search,
  CheckCircle2, AlertCircle, Users, Briefcase, List, Pencil,
  TrendingDown, Receipt,
} from "lucide-react";
import { calcTotaisFinanceiros } from "@/lib/finance";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type FiltroAba = "todos" | "suplentes" | "liderancas" | "admin";

type Pagamento = {
  id: string;
  suplente_id: string | null; lideranca_id: string | null; admin_id: string | null;
  tipo_pessoa: string; mes: number; ano: number;
  categoria: string; valor: number; observacao: string | null; created_at: string;
};

type Suplente = {
  id: string; nome: string; regiao_atuacao: string | null; partido: string | null;
  retirada_mensal_valor: number; retirada_mensal_meses: number;
  plotagem_qtd: number; plotagem_valor_unit: number;
  liderancas_qtd: number; liderancas_valor_unit: number;
  fiscais_qtd: number; fiscais_valor_unit: number; total_campanha: number;
};

type Lideranca = {
  id: string; nome: string; regiao: string | null;
  retirada_mensal_valor: number | null; chave_pix: string | null;
};

type AdminPessoa = {
  id: string; nome: string; whatsapp: string | null; valor_contrato: number | null;
};

// ─── Barra de progresso ───────────────────────────────────────────────────────
function Bar({ pago, total, cor = "bg-primary" }: { pago: number; total: number; cor?: string }) {
  const pct = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Ficha financeira completa (apenas suplentes) ─────────────────────────────
function FichaFinanceira({ suplente, todosPagamentos }: { suplente: Suplente; todosPagamentos: Pagamento[] }) {
  const pags = todosPagamentos.filter(p => p.suplente_id === suplente.id);
  const catLabel: Record<string, string> = {
    retirada: "Retirada Mensal", plotagem: "Plotagem",
    liderancas: "Lideranças na Campanha", fiscais: "Fiscais no Dia",
  };

  const categorias = [
    {
      key: "retirada",
      planejado: (suplente.retirada_mensal_valor || 0) * (suplente.retirada_mensal_meses || 0),
      detalhe: `${fmt(suplente.retirada_mensal_valor || 0)} × ${suplente.retirada_mensal_meses || 0} meses`,
    },
    {
      key: "plotagem",
      planejado: (suplente.plotagem_qtd || 0) * (suplente.plotagem_valor_unit || 0),
      detalhe: `${suplente.plotagem_qtd || 0} un. × ${fmt(suplente.plotagem_valor_unit || 0)}`,
    },
    {
      key: "liderancas",
      planejado: (suplente.liderancas_qtd || 0) * (suplente.liderancas_valor_unit || 0),
      detalhe: `${suplente.liderancas_qtd || 0} líderes × ${fmt(suplente.liderancas_valor_unit || 0)}`,
    },
    {
      key: "fiscais",
      planejado: (suplente.fiscais_qtd || 0) * (suplente.fiscais_valor_unit || 0),
      detalhe: `${suplente.fiscais_qtd || 0} fiscais × ${fmt(suplente.fiscais_valor_unit || 0)}`,
    },
  ].filter(c => c.planejado > 0);

  const totalCampanha = calcTotaisFinanceiros(suplente).totalFinal;
  const totalPago = pags.reduce((a, p) => a + p.valor, 0);
  const saldo = totalCampanha - totalPago;

  // Histórico por mês
  const historico = pags.reduce<Record<string, { total: number; itens: Pagamento[] }>>((acc, p) => {
    const key = `${String(p.ano)}-${String(p.mes).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = { total: 0, itens: [] };
    acc[key].total += p.valor;
    acc[key].itens.push(p);
    return acc;
  }, {});

  const historicoOrdenado = Object.entries(historico).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="border-t border-border/50 bg-muted/10">
      {/* Por categoria */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
          <Receipt size={10} /> Discriminação Financeira
        </p>
        <div className="space-y-2.5">
          {categorias.map(c => {
            const pago = pags.filter(p => p.categoria === c.key).reduce((a, p) => a + p.valor, 0);
            const falta = Math.max(0, c.planejado - pago);
            const pct = c.planejado > 0 ? Math.min(100, (pago / c.planejado) * 100) : 0;
            return (
              <div key={c.key} className="bg-card rounded-xl p-2.5 border border-border/50">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{catLabel[c.key]}</p>
                    <p className="text-[10px] text-muted-foreground">{c.detalhe}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-foreground">{fmt(c.planejado)}</p>
                    <p className="text-[10px] text-muted-foreground">planejado</p>
                  </div>
                </div>
                <Bar pago={pago} total={c.planejado} cor={pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-amber-500" : "bg-muted-foreground/30"} />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">✓ {fmt(pago)} pago</span>
                  {falta > 0
                    ? <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">⏳ {fmt(falta)} falta</span>
                    : <span className="text-[10px] text-green-600 font-bold">100%</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total geral */}
        <div className={`mt-2.5 rounded-xl p-3 border ${saldo <= 0 ? "bg-green-500/10 border-green-500/30" : "bg-rose-500/10 border-rose-500/30"}`}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-foreground">Total da Campanha</span>
            <span className="text-sm font-bold text-foreground">{fmt(totalCampanha)}</span>
          </div>
          <Bar pago={totalPago} total={totalCampanha} cor={saldo <= 0 ? "bg-green-500" : "bg-primary"} />
          <div className="flex justify-between mt-1.5">
            <span className="text-[11px] text-green-600 dark:text-green-400 font-bold">Pago: {fmt(totalPago)}</span>
            <span className={`text-[11px] font-bold ${saldo > 0 ? "text-rose-500" : "text-green-500"}`}>
              {saldo > 0 ? `Falta: ${fmt(saldo)}` : "Quitado ✓"}
            </span>
          </div>
        </div>
      </div>

      {/* Histórico por mês */}
      {historicoOrdenado.length > 0 && (
        <div className="px-3 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 mt-1 flex items-center gap-1">
            <Receipt size={10} /> Histórico de Pagamentos
          </p>
          <div className="space-y-1.5">
            {historicoOrdenado.map(([key, { total, itens }]) => {
              const [a, m] = key.split("-");
              return (
                <div key={key} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs font-semibold text-foreground">
                      {MESES[parseInt(m) - 1]}/{a}
                    </span>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(total)}</span>
                  </div>
                  <div className="border-t border-border/30 divide-y divide-border/20">
                    {itens.map(p => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-1">
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {p.categoria === "retirada" ? "Retirada Mensal" : p.categoria}
                          {p.observacao && ` — ${p.observacao}`}
                        </span>
                        <span className="text-[11px] font-bold text-foreground">{fmt(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Formulário de pagamento inline ──────────────────────────────────────────
function QuickPayForm({ valorEsperado, onSave, onCancel, saving }: {
  valorEsperado: number;
  onSave: (valor: number, obs: string) => Promise<void>;
  onCancel: () => void; saving: boolean;
}) {
  const [valor, setValor] = useState(valorEsperado > 0 ? String(valorEsperado) : "");
  const [obs, setObs] = useState("");
  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const parcial = valorEsperado > 0 && valorNum > 0 && valorNum < valorEsperado;

  return (
    <div className="border-t border-border/60 bg-muted/30 px-3 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Registrar pagamento</span>
        {valorEsperado > 0 && <span className="text-[10px] text-muted-foreground">Esperado: {fmt(valorEsperado)}</span>}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">R$</span>
          <Input type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)}
            className="pl-8 h-11 text-base font-bold bg-card border-primary/40" placeholder="0,00" autoFocus />
        </div>
        <Button onClick={() => onSave(valorNum, obs)} disabled={saving || valorNum <= 0}
          className="h-11 px-4 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold shrink-0">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        </Button>
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onCancel}><X size={16} /></Button>
      </div>
      <Input value={obs} onChange={e => setObs(e.target.value)} className="h-8 text-xs bg-card" placeholder="Observação (opcional)" />
      {parcial && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={11} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Adiantamento — faltará {fmt(valorEsperado - valorNum)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Item no histórico (editar/excluir) ──────────────────────────────────────
function HistoricoItem({ p, onDelete }: { p: Pagamento; onDelete: (id: string) => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [valor, setValor] = useState(String(p.valor));
  const [obs, setObs] = useState(p.observacao || "");
  const [saving, setSaving] = useState(false);
  const cats: Record<string, string> = { retirada: "Retirada", plotagem: "Plotagem", liderancas: "Lideranças", fiscais: "Fiscais", salario: "Salário", outro: "Outro" };

  const save = async () => {
    const v = parseFloat(valor.replace(",", "."));
    if (!v) return;
    setSaving(true);
    const { error } = await supabase.from("pagamentos").update({ valor: v, observacao: obs || null }).eq("id", p.id);
    setSaving(false);
    if (!error) { toast({ title: "Atualizado!" }); qc.invalidateQueries({ queryKey: ["pagamentos"] }); setEditing(false); }
  };

  if (editing) return (
    <div className="px-3 py-2 space-y-1.5 border-b border-border/40 bg-muted/20">
      <div className="flex gap-1.5">
        <Input type="number" value={valor} onChange={e => setValor(e.target.value)} className="h-7 text-xs flex-1 bg-card" />
        <Input value={obs} onChange={e => setObs(e.target.value)} className="h-7 text-xs flex-1 bg-card" placeholder="Obs" />
        <Button size="sm" className="h-7 px-2 text-[10px] bg-primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={10} className="animate-spin" /> : "✓"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>✕</Button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 last:border-0">
      <div className="min-w-0">
        <span className="text-xs font-medium text-foreground">{cats[p.categoria] || p.categoria}</span>
        {p.observacao && <span className="text-[10px] text-muted-foreground ml-2">{p.observacao}</span>}
        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(p.valor)}</span>
        <button onClick={() => setEditing(true)} className="p-1 text-muted-foreground"><Pencil size={11} /></button>
        <button onClick={() => onDelete(p.id)} className="p-1 text-destructive"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

// ─── Card: pessoa pendente ────────────────────────────────────────────────────
function PendenteCard({
  tipo, id, nome, subtitulo, valorEsperado, totalPagoMes,
  pagamentosMes, todosPagamentos, suplente, mes, ano,
}: {
  tipo: "suplente" | "lideranca" | "admin"; id: string; nome: string; subtitulo?: string;
  valorEsperado: number; totalPagoMes: number; pagamentosMes: Pagamento[];
  todosPagamentos?: Pagamento[]; suplente?: Suplente; mes: number; ano: number;
}) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const faltando = Math.max(0, valorEsperado - totalPagoMes);
  const temAdiantamento = totalPagoMes > 0 && totalPagoMes < valorEsperado;
  const tipoColor: Record<string, string> = { suplente: "text-pink-500 bg-pink-500/10", lideranca: "text-violet-500 bg-violet-500/10", admin: "text-blue-500 bg-blue-500/10" };
  const tipoLabel: Record<string, string> = { suplente: "Suplente", lideranca: "Liderança", admin: "Admin" };
  const catPadrao: Record<string, string> = { suplente: "retirada", lideranca: "retirada", admin: "salario" };

  const handleSave = async (valor: number, obs: string) => {
    setSaving(true);
    const payload: Record<string, unknown> = { tipo_pessoa: tipo, mes, ano, categoria: catPadrao[tipo], valor, observacao: obs || null };
    if (tipo === "suplente") payload.suplente_id = id;
    else if (tipo === "lideranca") payload.lideranca_id = id;
    else payload.admin_id = id;
    const { error } = await supabase.from("pagamentos").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `✅ ${fmt(valor)} registrado!`, description: nome }); qc.invalidateQueries({ queryKey: ["pagamentos"] }); setPaying(false); }
  };

  const handleDelete = async (pagId: string) => {
    if (!confirm("Excluir pagamento?")) return;
    await supabase.from("pagamentos").delete().eq("id", pagId);
    qc.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  return (
    <div className="bg-card rounded-2xl border border-amber-500/30 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${tipoColor[tipo]}`}>{tipoLabel[tipo]}</span>
              {temAdiantamento && <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md">Adiantamento</span>}
            </div>
            <p className="font-bold text-foreground text-sm truncate">{nome}</p>
            {subtitulo && <p className="text-[11px] text-muted-foreground truncate">{subtitulo}</p>}
            {temAdiantamento && (
              <div className="mt-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Pago: {fmt(totalPagoMes)}</span><span>Total: {fmt(valorEsperado)}</span>
                </div>
                <Bar pago={totalPagoMes} total={valorEsperado} cor="bg-amber-500" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Falta pagar</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400 leading-tight">{fmt(faltando)}</p>
            </div>
            {!paying && (
              <Button size="sm" onClick={() => setPaying(true)}
                className="h-7 px-3 text-xs bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold">
                Pagar
              </Button>
            )}
          </div>
        </div>
      </div>

      {paying && <QuickPayForm valorEsperado={faltando} onSave={handleSave} onCancel={() => setPaying(false)} saving={saving} />}

      {/* Ações inferiores */}
      <div className="flex border-t border-border/30 divide-x divide-border/30">
        {tipo === "suplente" && suplente && todosPagamentos && (
          <button onClick={() => { setShowFicha(!showFicha); setShowHist(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-primary font-semibold hover:bg-primary/5">
            <TrendingDown size={12} /> Ficha Completa {showFicha ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
        {pagamentosMes.length > 0 && (
          <button onClick={() => { setShowHist(!showHist); setShowFicha(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:bg-muted/20">
            {pagamentosMes.length} pag. {showHist ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {showFicha && suplente && todosPagamentos && (
        <FichaFinanceira suplente={suplente} todosPagamentos={todosPagamentos} />
      )}
      {showHist && pagamentosMes.length > 0 && (
        <div className="bg-muted/10 border-t border-border/30">
          {pagamentosMes.map(p => <HistoricoItem key={p.id} p={p} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

// ─── Card: pessoa paga ────────────────────────────────────────────────────────
function PagoCard({
  tipo, id, nome, subtitulo, valorEsperado, totalPagoMes,
  pagamentosMes, todosPagamentos, suplente, mes, ano,
}: {
  tipo: "suplente" | "lideranca" | "admin"; id: string; nome: string; subtitulo?: string;
  valorEsperado: number; totalPagoMes: number; pagamentosMes: Pagamento[];
  todosPagamentos?: Pagamento[]; suplente?: Suplente; mes: number; ano: number;
}) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFicha, setShowFicha] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const tipoColor: Record<string, string> = { suplente: "text-pink-500 bg-pink-500/10", lideranca: "text-violet-500 bg-violet-500/10", admin: "text-blue-500 bg-blue-500/10" };
  const tipoLabel: Record<string, string> = { suplente: "Suplente", lideranca: "Liderança", admin: "Admin" };
  const catPadrao: Record<string, string> = { suplente: "retirada", lideranca: "retirada", admin: "salario" };

  const handleSave = async (valor: number, obs: string) => {
    setSaving(true);
    const payload: Record<string, unknown> = { tipo_pessoa: tipo, mes, ano, categoria: catPadrao[tipo], valor, observacao: obs || null };
    if (tipo === "suplente") payload.suplente_id = id;
    else if (tipo === "lideranca") payload.lideranca_id = id;
    else payload.admin_id = id;
    const { error } = await supabase.from("pagamentos").insert(payload);
    setSaving(false);
    if (!error) { toast({ title: "✅ Adicional registrado!" }); qc.invalidateQueries({ queryKey: ["pagamentos"] }); setPaying(false); }
  };

  const handleDelete = async (pagId: string) => {
    if (!confirm("Excluir?")) return;
    await supabase.from("pagamentos").delete().eq("id", pagId);
    qc.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  return (
    <div className="bg-card rounded-2xl border border-green-500/20 shadow-sm overflow-hidden">
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${tipoColor[tipo]}`}>{tipoLabel[tipo]}</span>
              <CheckCircle2 size={11} className="text-green-500" />
            </div>
            <p className="font-bold text-foreground text-sm truncate">{nome}</p>
            {subtitulo && <p className="text-[11px] text-muted-foreground truncate">{subtitulo}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Pago neste mês</p>
            <p className="text-base font-bold text-green-600 dark:text-green-400">{fmt(totalPagoMes)}</p>
            {valorEsperado > 0 && totalPagoMes > valorEsperado &&
              <p className="text-[10px] text-primary">+{fmt(totalPagoMes - valorEsperado)} extra</p>}
          </div>
        </div>
      </div>

      <div className="flex border-t border-border/30 divide-x divide-border/30">
        {tipo === "suplente" && suplente && todosPagamentos && (
          <button onClick={() => { setShowFicha(!showFicha); setShowHist(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-primary font-semibold hover:bg-primary/5">
            <TrendingDown size={12} /> Ficha Completa {showFicha ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
        <button onClick={() => { setShowHist(!showHist); setShowFicha(false); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:bg-muted/20">
          {pagamentosMes.length} pag. {showHist ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        <button onClick={() => setPaying(!paying)}
          className="px-3 py-2 text-[11px] text-primary font-semibold hover:bg-primary/5">
          + Extra
        </button>
      </div>

      {paying && <QuickPayForm valorEsperado={0} onSave={handleSave} onCancel={() => setPaying(false)} saving={saving} />}
      {showFicha && suplente && todosPagamentos && (
        <FichaFinanceira suplente={suplente} todosPagamentos={todosPagamentos} />
      )}
      {showHist && (
        <div className="bg-muted/10 border-t border-border/30">
          {pagamentosMes.map(p => <HistoricoItem key={p.id} p={p} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Pagamentos() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [filtro, setFiltro] = useState<FiltroAba>("todos");
  const [busca, setBusca] = useState("");
  const [showPagos, setShowPagos] = useState(false);
  const qc = useQueryClient();

  const { data: suplentes, isLoading: loadS } = useQuery({
    queryKey: ["suplentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suplentes").select(
        "id,nome,regiao_atuacao,partido,retirada_mensal_valor,retirada_mensal_meses,plotagem_qtd,plotagem_valor_unit,liderancas_qtd,liderancas_valor_unit,fiscais_qtd,fiscais_valor_unit,total_campanha"
      ).order("nome");
      if (error) throw error;
      return data as unknown as Suplente[];
    },
    staleTime: 300000,
  });

  const { data: liderancas, isLoading: loadL } = useQuery({
    queryKey: ["liderancas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("liderancas").select("id,nome,regiao,retirada_mensal_valor,chave_pix").order("nome");
      if (error) throw error;
      return data as unknown as Lideranca[];
    },
    staleTime: 300000,
  });

  const { data: administrativo, isLoading: loadA } = useQuery({
    queryKey: ["administrativo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("administrativo").select("id,nome,whatsapp,valor_contrato").order("nome");
      if (error) throw error;
      return data as unknown as AdminPessoa[];
    },
    staleTime: 300000,
  });

  const { data: pagamentos, isLoading: loadP } = useQuery({
    queryKey: ["pagamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pagamentos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Pagamento[];
    },
    staleTime: 300000,
  });

  const isLoading = loadS || loadL || loadA || loadP;
  const navMes = (dir: -1 | 1) => {
    let m = mes + dir, a = ano;
    if (m < 1) { m = 12; a--; } if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  const pagsMes = (pagamentos || []).filter(p => p.mes === mes && p.ano === ano);
  const supPlanejadoMes = (suplentes || []).reduce((a, s) => a + (s.retirada_mensal_valor || 0), 0);
  const lidPlanejadoMes = (liderancas || []).reduce((a, l) => a + (l.retirada_mensal_valor || 0), 0);
  const admPlanejadoMes = (administrativo || []).reduce((a, p) => a + (p.valor_contrato || 0), 0);
  const totalPlanejadoMes = supPlanejadoMes + lidPlanejadoMes + admPlanejadoMes;
  const supPagoMes = pagsMes.filter(p => p.tipo_pessoa === "suplente").reduce((a, p) => a + p.valor, 0);
  const lidPagoMes = pagsMes.filter(p => p.tipo_pessoa === "lideranca").reduce((a, p) => a + p.valor, 0);
  const admPagoMes = pagsMes.filter(p => p.tipo_pessoa === "admin").reduce((a, p) => a + p.valor, 0);
  const totalPagoMes = supPagoMes + lidPagoMes + admPagoMes;
  const totalFaltaMes = Math.max(0, totalPlanejadoMes - totalPagoMes);

  type PEntry = {
    tipo: "suplente" | "lideranca" | "admin"; id: string; nome: string; subtitulo?: string;
    valorEsperado: number; totalPagoMes: number; pagamentosMes: Pagamento[];
    todosPagamentos?: Pagamento[]; suplente?: Suplente; pago: boolean;
  };

  const todasPessoas: PEntry[] = [];

  (suplentes || []).forEach(s => {
    if ((s.retirada_mensal_valor || 0) <= 0) return;
    const pags = pagsMes.filter(p => p.suplente_id === s.id);
    const total = pags.reduce((a, p) => a + p.valor, 0);
    todasPessoas.push({
      tipo: "suplente", id: s.id, nome: s.nome,
      subtitulo: [s.regiao_atuacao, s.partido].filter(Boolean).join(" · ") || undefined,
      valorEsperado: s.retirada_mensal_valor, totalPagoMes: total,
      pagamentosMes: pags,
      todosPagamentos: (pagamentos || []).filter(p => p.suplente_id === s.id),
      suplente: s,
      pago: total >= s.retirada_mensal_valor,
    });
  });

  (liderancas || []).forEach(l => {
    const val = l.retirada_mensal_valor || 0;
    if (val <= 0) return;
    const pags = pagsMes.filter(p => p.lideranca_id === l.id);
    const total = pags.reduce((a, p) => a + p.valor, 0);
    todasPessoas.push({
      tipo: "lideranca", id: l.id, nome: l.nome,
      subtitulo: [l.regiao, l.chave_pix ? `PIX: ${l.chave_pix}` : undefined].filter(Boolean).join(" · ") || undefined,
      valorEsperado: val, totalPagoMes: total, pagamentosMes: pags,
      pago: total >= val,
    });
  });

  (administrativo || []).forEach(a => {
    const val = a.valor_contrato || 0;
    if (val <= 0) return;
    const pags = pagsMes.filter(p => p.admin_id === a.id);
    const total = pags.reduce((a, p) => a + p.valor, 0);
    todasPessoas.push({
      tipo: "admin", id: a.id, nome: a.nome,
      subtitulo: a.whatsapp || undefined,
      valorEsperado: val, totalPagoMes: total, pagamentosMes: pags,
      pago: total >= val,
    });
  });

  const matchBusca = (p: PEntry) => {
    if (!busca.trim()) return true;
    const q = norm(busca);
    return norm(p.nome).includes(q) || norm(p.subtitulo || "").includes(q);
  };
  const matchFiltro = (p: PEntry) => filtro === "todos" || (filtro === "suplentes" && p.tipo === "suplente") || (filtro === "liderancas" && p.tipo === "lideranca") || (filtro === "admin" && p.tipo === "admin");

  const pendentes = todasPessoas.filter(p => !p.pago && matchFiltro(p) && matchBusca(p));
  const pagos = todasPessoas.filter(p => p.pago && matchFiltro(p) && matchBusca(p));
  const totalPendentes = todasPessoas.filter(p => !p.pago).length;
  const totalPagos = todasPessoas.filter(p => p.pago).length;

  const abas = [
    { id: "todos" as FiltroAba, label: "Todos", count: todasPessoas.length },
    { id: "suplentes" as FiltroAba, label: "Suplentes", icon: <List size={12} />, count: (suplentes || []).filter(s => s.retirada_mensal_valor > 0).length },
    { id: "liderancas" as FiltroAba, label: "Lideranças", icon: <Users size={12} />, count: (liderancas || []).filter(l => (l.retirada_mensal_valor || 0) > 0).length },
    { id: "admin" as FiltroAba, label: "Admin", icon: <Briefcase size={12} />, count: (administrativo || []).filter(a => (a.valor_contrato || 0) > 0).length },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Pagamentos</h1>

        {/* Seletor de mês */}
        <div className="bg-card rounded-2xl border border-border p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navMes(-1)}><ChevronLeft size={20} /></Button>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{MESES[mes - 1]} {ano}</p>
              <p className="text-xs text-muted-foreground">Mês de referência</p>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navMes(1)}><ChevronRight size={20} /></Button>
          </div>
        </div>

        {/* Painel financeiro do chefe */}
        {!isLoading && (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-4 py-4">
              <div className="flex items-center gap-2 text-white/80 text-xs mb-3">
                <Wallet size={14} /> Painel Financeiro — {MESES[mes - 1]}/{ano}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white/15 rounded-xl p-2.5 text-center">
                  <p className="text-white/70 text-[9px] uppercase tracking-wider">Planejado</p>
                  <p className="text-white font-bold text-base leading-tight">{fmt(totalPlanejadoMes)}</p>
                </div>
                <div className="bg-white/15 rounded-xl p-2.5 text-center">
                  <p className="text-white/70 text-[9px] uppercase tracking-wider">Pago</p>
                  <p className="text-white font-bold text-base leading-tight">{fmt(totalPagoMes)}</p>
                </div>
                <div className="bg-black/20 rounded-xl p-2.5 text-center">
                  <p className="text-white/70 text-[9px] uppercase tracking-wider">Falta</p>
                  <p className="text-white font-bold text-base leading-tight">{fmt(totalFaltaMes)}</p>
                </div>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${totalPlanejadoMes > 0 ? Math.min(100, (totalPagoMes / totalPlanejadoMes) * 100) : 0}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-white/60 text-[9px]">{totalPagos} pagos · {totalPendentes} pendentes</span>
                <span className="text-white/60 text-[9px]">{totalPlanejadoMes > 0 ? `${((totalPagoMes / totalPlanejadoMes) * 100).toFixed(0)}%` : "0%"}</span>
              </div>
            </div>

            {/* Breakdown por categoria */}
            <div className="divide-y divide-border">
              {[
                { label: "Suplentes", icon: <List size={10} />, cor: "bg-pink-500", corText: "text-pink-500 bg-pink-500/10", pago: supPagoMes, planejado: supPlanejadoMes, pagos: (suplentes || []).filter(s => s.retirada_mensal_valor > 0 && pagsMes.filter(p => p.suplente_id === s.id).reduce((a, p) => a + p.valor, 0) >= s.retirada_mensal_valor).length, total: (suplentes || []).filter(s => s.retirada_mensal_valor > 0).length },
                ...(lidPlanejadoMes > 0 ? [{ label: "Lideranças", icon: <Users size={10} />, cor: "bg-violet-500", corText: "text-violet-500 bg-violet-500/10", pago: lidPagoMes, planejado: lidPlanejadoMes, pagos: (liderancas || []).filter(l => (l.retirada_mensal_valor || 0) > 0 && pagsMes.filter(p => p.lideranca_id === l.id).reduce((a, p) => a + p.valor, 0) >= (l.retirada_mensal_valor || 0)).length, total: (liderancas || []).filter(l => (l.retirada_mensal_valor || 0) > 0).length }] : []),
                ...(admPlanejadoMes > 0 ? [{ label: "Administrativo", icon: <Briefcase size={10} />, cor: "bg-blue-500", corText: "text-blue-500 bg-blue-500/10", pago: admPagoMes, planejado: admPlanejadoMes, pagos: (administrativo || []).filter(a => (a.valor_contrato || 0) > 0 && pagsMes.filter(p => p.admin_id === a.id).reduce((a, p) => a + p.valor, 0) >= (a.valor_contrato || 0)).length, total: (administrativo || []).filter(a => (a.valor_contrato || 0) > 0).length }] : []),
              ].map(row => (
                <div key={row.label} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-1 ${row.corText}`}>{row.icon}{row.label}</span>
                      <span className="text-[11px] text-muted-foreground">{row.pagos}/{row.total} pagos</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-foreground">{fmt(row.pago)}</span>
                      <span className="text-[10px] text-muted-foreground"> / {fmt(row.planejado)}</span>
                    </div>
                  </div>
                  <Bar pago={row.pago} total={row.planejado} cor={row.cor} />
                  {row.planejado > row.pago && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Falta: {fmt(row.planejado - row.pago)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Busca */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..." className="pl-9 h-10 bg-card border-border rounded-xl text-sm" />
          {busca && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setBusca("")}><X size={14} /></button>}
        </div>

        {/* Tabs filtro */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {abas.map(a => (
            <button key={a.id} onClick={() => setFiltro(a.id)}
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all ${filtro === a.id ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
              {a.icon}{a.label}
              <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ml-0.5 ${filtro === a.id ? "bg-primary/10 text-primary" : "bg-muted-foreground/20"}`}>{a.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? <CardSkeletonList count={5} /> : (
          <>
            {/* PENDENTES */}
            {pendentes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  <h2 className="text-sm font-bold text-foreground">Falta pagar — {pendentes.length}</h2>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold ml-auto">
                    {fmt(pendentes.reduce((a, p) => a + (p.valorEsperado - p.totalPagoMes), 0))}
                  </span>
                </div>
                {pendentes.map(p => <PendenteCard key={`${p.tipo}-${p.id}`} {...p} mes={mes} ano={ano} />)}
              </div>
            )}

            {pendentes.length === 0 && !busca && filtro === "todos" && pagos.length > 0 && (
              <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-2xl py-4">
                <CheckCircle2 size={18} className="text-green-500" />
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  Todos os pagamentos de {MESES[mes - 1]} registrados!
                </p>
              </div>
            )}

            {/* PAGOS */}
            {pagos.length > 0 && (
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between py-2 px-1" onClick={() => setShowPagos(!showPagos)}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <h2 className="text-sm font-bold text-foreground">Pagos — {pagos.length}</h2>
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">{fmt(pagos.reduce((a, p) => a + p.totalPagoMes, 0))}</span>
                  </div>
                  {showPagos ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                </button>
                {showPagos && pagos.map(p => <PagoCard key={`${p.tipo}-${p.id}`} {...p} mes={mes} ano={ano} />)}
              </div>
            )}

            {todasPessoas.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma pessoa com valor cadastrado</p>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
}
