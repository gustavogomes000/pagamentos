import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/PageTransition";
import { CardSkeletonList } from "@/components/CardSkeleton";
import {
  ChevronDown, ChevronUp, Trash2, X, Loader2, Wallet,
  ChevronLeft, ChevronRight, Save, Search,
  CheckCircle2, AlertCircle, Users, Briefcase, List, Pencil,
  DollarSign, Receipt,
} from "lucide-react";
import { calcTotaisFinanceiros } from "@/lib/finance";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type Pagamento = {
  id: string;
  suplente_id: string | null; lideranca_id: string | null; admin_id: string | null;
  tipo_pessoa: string; mes: number; ano: number;
  categoria: string; valor: number; observacao: string | null; created_at: string;
};

type Suplente = {
  id: string; nome: string; regiao_atuacao: string | null; partido: string | null; bairro: string | null;
  retirada_mensal_valor: number; retirada_mensal_meses: number;
  plotagem_qtd: number; plotagem_valor_unit: number;
  liderancas_qtd: number; liderancas_valor_unit: number;
  fiscais_qtd: number; fiscais_valor_unit: number; total_campanha: number;
  numero_urna: string | null;
};

type Lideranca = {
  id: string; nome: string; regiao: string | null;
  retirada_mensal_valor: number | null; chave_pix: string | null;
};

type AdminPessoa = {
  id: string; nome: string; whatsapp: string | null; valor_contrato: number | null;
};

const CAT_LABEL: Record<string, string> = {
  retirada: "Retirada Mensal", plotagem: "Plotagem",
  liderancas: "Lideranças", fiscais: "Fiscais",
  salario: "Salário", outro: "Outro",
};

// ─── Barra de progresso ───────────────────────────────────────────────────────
function Bar({ pago, total, cor = "bg-primary", height = "h-1.5" }: { pago: number; total: number; cor?: string; height?: string }) {
  const pct = total > 0 ? Math.min(100, (pago / total) * 100) : 0;
  return (
    <div className={`${height} bg-muted rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-500 ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Formulário de pagamento ─────────────────────────────────────────────────
function PayForm({ pessoaNome, valorSugerido, categorias, onSave, onCancel, saving }: {
  pessoaNome: string;
  valorSugerido: number;
  categorias: { key: string; label: string }[];
  onSave: (valor: number, obs: string, cat: string) => Promise<void>;
  onCancel: () => void; saving: boolean;
}) {
  const [valor, setValor] = useState(valorSugerido > 0 ? String(valorSugerido) : "");
  const [obs, setObs] = useState("");
  const [cat, setCat] = useState(categorias[0]?.key || "retirada");
  const valorNum = parseFloat(valor.replace(",", ".")) || 0;

  return (
    <div className="bg-card rounded-2xl border border-primary/30 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Registrar Pagamento</p>
          <p className="text-sm font-semibold text-foreground">{pessoaNome}</p>
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1"><X size={16} /></button>
      </div>

      {categorias.length > 1 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Categoria</p>
          <div className="flex gap-1.5 flex-wrap">
            {categorias.map(c => (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${cat === c.key ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Valor (R$)</p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium">R$</span>
            <Input type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)}
              className="pl-8 h-11 text-base font-bold bg-card border-primary/40" placeholder="0,00" autoFocus />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observação</p>
          <Input value={obs} onChange={e => setObs(e.target.value)} className="h-11 bg-card" placeholder="Opcional" />
        </div>
      </div>

      {valorSugerido > 0 && valorNum > 0 && valorNum < valorSugerido && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={11} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Parcial — faltará {fmt(valorSugerido - valorNum)}</span>
        </div>
      )}

      <Button onClick={() => onSave(valorNum, obs, cat)} disabled={saving || valorNum <= 0}
        className="w-full h-11 bg-gradient-to-r from-pink-500 to-rose-400 text-white font-bold text-sm">
        {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
        {saving ? "Salvando..." : `Registrar ${fmt(valorNum)}`}
      </Button>
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

  const save = async () => {
    const v = parseFloat(valor.replace(",", "."));
    if (!v) return;
    setSaving(true);
    const { error } = await supabase.from("pagamentos").update({ valor: v, observacao: obs || null }).eq("id", p.id);
    setSaving(false);
    if (!error) { toast({ title: "Atualizado!" }); qc.invalidateQueries({ queryKey: ["pagamentos"] }); setEditing(false); }
  };

  if (editing) return (
    <div className="px-3 py-2 space-y-1.5 bg-muted/20">
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
    <div className="flex items-center justify-between px-3 py-1.5">
      <div className="min-w-0">
        <span className="text-xs font-medium text-foreground">{CAT_LABEL[p.categoria] || p.categoria}</span>
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

// ─── Card de Suplente no Pagamentos ──────────────────────────────────────────
function SuplentePayCard({ s, pagsMes, pagsTodos, mes, ano }: {
  s: Suplente; pagsMes: Pagamento[]; pagsTodos: Pagamento[]; mes: number; ano: number;
}) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFicha, setShowFicha] = useState(false);

  const retiradaMes = s.retirada_mensal_valor || 0;
  const pagoMes = pagsMes.reduce((a, p) => a + p.valor, 0);
  const faltaMes = Math.max(0, retiradaMes - pagoMes);
  const pago = pagoMes >= retiradaMes && retiradaMes > 0;

  const totais = calcTotaisFinanceiros(s);
  const totalPagoGeral = pagsTodos.reduce((a, p) => a + p.valor, 0);

  const categorias = [
    { key: "retirada", label: "Retirada", planejado: totais.retirada, pago: pagsTodos.filter(p => p.categoria === "retirada").reduce((a, p) => a + p.valor, 0), detalhe: `${fmt(retiradaMes)} × ${s.retirada_mensal_meses || 0}m` },
    { key: "plotagem", label: "Plotagem", planejado: totais.plotagem, pago: pagsTodos.filter(p => p.categoria === "plotagem").reduce((a, p) => a + p.valor, 0), detalhe: `${s.plotagem_qtd || 0} × ${fmt(s.plotagem_valor_unit || 0)}` },
    { key: "liderancas", label: "Lideranças", planejado: totais.liderancas, pago: pagsTodos.filter(p => p.categoria === "liderancas").reduce((a, p) => a + p.valor, 0), detalhe: `${s.liderancas_qtd || 0} × ${fmt(s.liderancas_valor_unit || 0)}` },
    { key: "fiscais", label: "Fiscais", planejado: totais.fiscais, pago: pagsTodos.filter(p => p.categoria === "fiscais").reduce((a, p) => a + p.valor, 0), detalhe: `${s.fiscais_qtd || 0} × ${fmt(s.fiscais_valor_unit || 0)}` },
  ].filter(c => c.planejado > 0);

  const handleSave = async (valor: number, obs: string, cat: string) => {
    setSaving(true);
    const { error } = await (supabase as any).from("pagamentos").insert({
      tipo_pessoa: "suplente", suplente_id: s.id, mes, ano,
      categoria: cat, valor, observacao: obs || null,
    });
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `✅ ${fmt(valor)} registrado para ${s.nome}` }); qc.invalidateQueries({ queryKey: ["pagamentos"] }); setPaying(false); }
  };

  const handleDelete = async (pagId: string) => {
    if (!confirm("Excluir pagamento?")) return;
    await supabase.from("pagamentos").delete().eq("id", pagId);
    qc.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  const subtitle = [s.bairro || s.regiao_atuacao, s.partido].filter(Boolean).join(" · ");

  return (
    <div className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${pago ? "border-green-500/20" : "border-amber-500/30"}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground text-sm truncate">{s.nome}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {s.numero_urna && <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">#{s.numero_urna}</span>}
              {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            {pago ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(pagoMes)}</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground">Falta</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(faltaMes)}</p>
              </>
            )}
          </div>
        </div>

        {retiradaMes > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>Retirada {MESES[mes - 1]}</span>
              <span>{fmt(pagoMes)} / {fmt(retiradaMes)}</span>
            </div>
            <Bar pago={pagoMes} total={retiradaMes} cor={pago ? "bg-green-500" : "bg-amber-500"} />
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex border-t border-border/30 divide-x divide-border/30">
        <button onClick={() => { setPaying(!paying); setShowFicha(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold ${!pago ? "text-white bg-gradient-to-r from-pink-500 to-rose-400" : "text-primary hover:bg-primary/5"}`}>
          <DollarSign size={12} /> {pago ? "+ Pagamento" : "Pagar"}
        </button>
        <button onClick={() => { setShowFicha(!showFicha); setPaying(false); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:bg-muted/20 font-medium">
          <Receipt size={12} /> Ficha {showFicha ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {paying && (
        <div className="p-3 border-t border-border/30">
          <PayForm
            pessoaNome={s.nome}
            valorSugerido={faltaMes}
            categorias={categorias.map(c => ({ key: c.key, label: c.label }))}
            onSave={handleSave}
            onCancel={() => setPaying(false)}
            saving={saving}
          />
        </div>
      )}

      {showFicha && (
        <div className="border-t border-border/50 bg-muted/5 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
            <Receipt size={10} /> Gastos da Campanha
          </p>
          {categorias.map(c => {
            const falta = Math.max(0, c.planejado - c.pago);
            const catPags = pagsTodos.filter(p => p.categoria === c.key);
            return (
              <div key={c.key} className="bg-card rounded-xl border border-border/50 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{CAT_LABEL[c.key]}</p>
                    <p className="text-[10px] text-muted-foreground">{c.detalhe}</p>
                  </div>
                  <p className="text-xs font-bold text-foreground">{fmt(c.planejado)}</p>
                </div>
                <Bar pago={c.pago} total={c.planejado} cor={c.pago >= c.planejado ? "bg-green-500" : "bg-primary"} height="h-1" />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-green-600 dark:text-green-400">✓ {fmt(c.pago)}</span>
                  {falta > 0 ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">⏳ {fmt(falta)}</span>
                  ) : (
                    <span className="text-[10px] text-green-600 font-bold">Quitado ✓</span>
                  )}
                </div>
                {catPags.length > 0 && (
                  <div className="mt-1.5 border-t border-border/30 pt-1">
                    {catPags.slice(0, 3).map(p => (
                      <div key={p.id} className="flex justify-between text-[10px] py-0.5">
                        <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")} {p.observacao && `— ${p.observacao}`}</span>
                        <span className="font-medium text-foreground">{fmt(p.valor)}</span>
                      </div>
                    ))}
                    {catPags.length > 3 && <p className="text-[9px] text-muted-foreground">+{catPags.length - 3} pagamentos</p>}
                  </div>
                )}
              </div>
            );
          })}

          {/* Total campanha */}
          <div className={`rounded-xl p-3 border ${totalPagoGeral >= totais.totalFinal ? "bg-green-500/10 border-green-500/30" : "bg-card border-border"}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-foreground">Total Campanha</span>
              <span className="text-sm font-bold text-foreground">{fmt(totais.totalFinal)}</span>
            </div>
            <Bar pago={totalPagoGeral} total={totais.totalFinal} cor={totalPagoGeral >= totais.totalFinal ? "bg-green-500" : "bg-primary"} />
            <div className="flex justify-between mt-1">
              <span className="text-[11px] text-green-600 dark:text-green-400 font-bold">Pago: {fmt(totalPagoGeral)}</span>
              <span className={`text-[11px] font-bold ${totais.totalFinal > totalPagoGeral ? "text-rose-500" : "text-green-500"}`}>
                {totais.totalFinal > totalPagoGeral ? `Falta: ${fmt(totais.totalFinal - totalPagoGeral)}` : "Quitado ✓"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Card simples: Liderança / Admin ──────────────────────────────────────────
function PessoaPayCard({ tipo, id, nome, subtitulo, valorEsperado, pagsMes, mes, ano }: {
  tipo: "lideranca" | "admin"; id: string; nome: string; subtitulo?: string;
  valorEsperado: number; pagsMes: Pagamento[]; mes: number; ano: number;
}) {
  const qc = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const totalPago = pagsMes.reduce((a, p) => a + p.valor, 0);
  const faltando = Math.max(0, valorEsperado - totalPago);
  const isPago = totalPago >= valorEsperado && valorEsperado > 0;
  const catPadrao = tipo === "lideranca" ? "retirada" : "salario";

  const handleSave = async (valor: number, obs: string) => {
    setSaving(true);
    const payload: Record<string, unknown> = { tipo_pessoa: tipo, mes, ano, categoria: catPadrao, valor, observacao: obs || null };
    if (tipo === "lideranca") payload.lideranca_id = id;
    else payload.admin_id = id;
    const { error } = await (supabase as any).from("pagamentos").insert(payload);
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: `✅ ${fmt(valor)} registrado!` }); qc.invalidateQueries({ queryKey: ["pagamentos"] }); setPaying(false); }
  };

  const handleDelete = async (pagId: string) => {
    if (!confirm("Excluir pagamento?")) return;
    await supabase.from("pagamentos").delete().eq("id", pagId);
    qc.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  return (
    <div className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${isPago ? "border-green-500/20" : "border-amber-500/30"}`}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground text-sm truncate">{nome}</p>
            {subtitulo && <p className="text-[11px] text-muted-foreground truncate">{subtitulo}</p>}
          </div>
          <div className="text-right shrink-0">
            {isPago ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{fmt(totalPago)}</span>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground">Falta</p>
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(faltando)}</p>
              </>
            )}
          </div>
        </div>
        {!isPago && totalPago > 0 && (
          <div className="mt-2">
            <Bar pago={totalPago} total={valorEsperado} cor="bg-amber-500" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Pago: {fmt(totalPago)}</span>
              <span>Total: {fmt(valorEsperado)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex border-t border-border/30 divide-x divide-border/30">
        <button onClick={() => { setPaying(!paying); setShowHist(false); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold ${!isPago ? "text-white bg-gradient-to-r from-pink-500 to-rose-400" : "text-primary hover:bg-primary/5"}`}>
          <DollarSign size={12} /> {isPago ? "+ Extra" : "Pagar"}
        </button>
        {pagsMes.length > 0 && (
          <button onClick={() => { setShowHist(!showHist); setPaying(false); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground hover:bg-muted/20">
            {pagsMes.length} pag. {showHist ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      {paying && (
        <div className="p-3 border-t border-border/30">
          <PayForm
            pessoaNome={nome}
            valorSugerido={faltando}
            categorias={[{ key: catPadrao, label: tipo === "lideranca" ? "Retirada" : "Salário" }]}
            onSave={(v, o) => handleSave(v, o)}
            onCancel={() => setPaying(false)}
            saving={saving}
          />
        </div>
      )}
      {showHist && (
        <div className="bg-muted/10 border-t border-border/30 divide-y divide-border/20">
          {pagsMes.map(p => <HistoricoItem key={p.id} p={p} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function Pagamentos() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [abaAtiva, setAbaAtiva] = useState<"suplentes" | "liderancas" | "admin">("suplentes");
  const [busca, setBusca] = useState("");
  const [showPagos, setShowPagos] = useState(true);

  const { data: suplentes, isLoading: loadS } = useQuery({
    queryKey: ["suplentes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suplentes").select(
        "id,nome,numero_urna,bairro,regiao_atuacao,partido,retirada_mensal_valor,retirada_mensal_meses,plotagem_qtd,plotagem_valor_unit,liderancas_qtd,liderancas_valor_unit,fiscais_qtd,fiscais_valor_unit,total_campanha"
      ).order("nome");
      if (error) throw error;
      return data as unknown as Suplente[];
    },
    staleTime: 300000,
  });

  const { data: liderancas, isLoading: loadL } = useQuery({
    queryKey: ["liderancas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("liderancas").select("id,nome,regiao,retirada_mensal_valor,chave_pix").order("nome");
      if (error) throw error;
      return data as unknown as Lideranca[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: administrativo, isLoading: loadA } = useQuery({
    queryKey: ["administrativo"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("administrativo").select("id,nome,whatsapp,valor_contrato").order("nome");
      if (error) throw error;
      return data as unknown as AdminPessoa[];
    },
    staleTime: 0,
    refetchOnMount: "always",
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

  // Cálculos
  const supComValor = (suplentes || []).filter(s => (s.retirada_mensal_valor || 0) > 0);
  const lidComValor = (liderancas || []).filter(l => (l.retirada_mensal_valor || 0) > 0);
  const admComValor = (administrativo || []).filter(a => (a.valor_contrato || 0) > 0);

  const supPlanejado = supComValor.reduce((a, s) => a + (s.retirada_mensal_valor || 0), 0);
  const lidPlanejado = lidComValor.reduce((a, l) => a + (l.retirada_mensal_valor || 0), 0);
  const admPlanejado = admComValor.reduce((a, p) => a + (p.valor_contrato || 0), 0);
  const totalPlanejado = supPlanejado + lidPlanejado + admPlanejado;

  const supPago = pagsMes.filter(p => p.tipo_pessoa === "suplente").reduce((a, p) => a + p.valor, 0);
  const lidPago = pagsMes.filter(p => p.tipo_pessoa === "lideranca").reduce((a, p) => a + p.valor, 0);
  const admPago = pagsMes.filter(p => p.tipo_pessoa === "admin").reduce((a, p) => a + p.valor, 0);
  const totalPago = supPago + lidPago + admPago;
  const totalFalta = Math.max(0, totalPlanejado - totalPago);
  const pctGeral = totalPlanejado > 0 ? Math.min(100, (totalPago / totalPlanejado) * 100) : 0;

  // Contagens pagos
  const supPagosN = supComValor.filter(s => pagsMes.filter(p => p.suplente_id === s.id).reduce((a, p) => a + p.valor, 0) >= (s.retirada_mensal_valor || 0)).length;
  const lidPagosN = lidComValor.filter(l => pagsMes.filter(p => p.lideranca_id === l.id).reduce((a, p) => a + p.valor, 0) >= (l.retirada_mensal_valor || 0)).length;
  const admPagosN = admComValor.filter(a => pagsMes.filter(p => p.admin_id === a.id).reduce((a2, p) => a2 + p.valor, 0) >= (a.valor_contrato || 0)).length;

  // Filtro busca
  const matchBusca = (nome: string, extra?: string) => {
    if (!busca.trim()) return true;
    const q = norm(busca);
    return norm(nome).includes(q) || norm(extra || "").includes(q);
  };

  // Renderizar conteúdo da aba ativa
  const renderAba = () => {
    if (abaAtiva === "suplentes") {
      const filtrados = supComValor.filter(s => matchBusca(s.nome, [s.bairro, s.regiao_atuacao, s.numero_urna, s.partido].filter(Boolean).join(" ")));
      const pendentes = filtrados.filter(s => pagsMes.filter(p => p.suplente_id === s.id).reduce((a, p) => a + p.valor, 0) < (s.retirada_mensal_valor || 0));
      const pagos = filtrados.filter(s => pagsMes.filter(p => p.suplente_id === s.id).reduce((a, p) => a + p.valor, 0) >= (s.retirada_mensal_valor || 0));

      return (
        <>
          {/* Resumo suplentes */}
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-pink-500 bg-pink-500/10 flex items-center gap-1"><List size={10} />Suplentes</span>
                {supPagosN}/{supComValor.length} pagos
              </span>
              <span className="text-xs font-bold text-foreground">{fmt(supPago)} / {fmt(supPlanejado)}</span>
            </div>
            <Bar pago={supPago} total={supPlanejado} cor="bg-pink-500" />
            {supPlanejado > supPago && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Falta: {fmt(supPlanejado - supPago)}</p>}
          </div>

          {pendentes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                <h2 className="text-sm font-bold text-foreground">Falta pagar — {pendentes.length}</h2>
              </div>
              {pendentes.map(s => (
                <SuplentePayCard key={s.id} s={s}
                  pagsMes={pagsMes.filter(p => p.suplente_id === s.id)}
                  pagsTodos={(pagamentos || []).filter(p => p.suplente_id === s.id)}
                  mes={mes} ano={ano} />
              ))}
            </div>
          )}

          {pendentes.length === 0 && pagos.length > 0 && (
            <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-2xl py-4">
              <CheckCircle2 size={18} className="text-green-500" />
              <p className="text-sm font-bold text-green-600 dark:text-green-400">Todos os suplentes pagos! 🎉</p>
            </div>
          )}

          {pagos.length > 0 && (
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between py-2 px-1" onClick={() => setShowPagos(!showPagos)}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <h2 className="text-sm font-bold text-foreground">Pagos — {pagos.length}</h2>
                </div>
                {showPagos ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              {showPagos && pagos.map(s => (
                <SuplentePayCard key={s.id} s={s}
                  pagsMes={pagsMes.filter(p => p.suplente_id === s.id)}
                  pagsTodos={(pagamentos || []).filter(p => p.suplente_id === s.id)}
                  mes={mes} ano={ano} />
              ))}
            </div>
          )}
        </>
      );
    }

    if (abaAtiva === "liderancas") {
      const filtrados = lidComValor.filter(l => matchBusca(l.nome, l.regiao || ""));
      const pendentes = filtrados.filter(l => pagsMes.filter(p => p.lideranca_id === l.id).reduce((a, p) => a + p.valor, 0) < (l.retirada_mensal_valor || 0));
      const pagos = filtrados.filter(l => pagsMes.filter(p => p.lideranca_id === l.id).reduce((a, p) => a + p.valor, 0) >= (l.retirada_mensal_valor || 0));

      return (
        <>
          <div className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-violet-500 bg-violet-500/10 flex items-center gap-1"><Users size={10} />Lideranças</span>
                {lidPagosN}/{lidComValor.length} pagos
              </span>
              <span className="text-xs font-bold text-foreground">{fmt(lidPago)} / {fmt(lidPlanejado)}</span>
            </div>
            <Bar pago={lidPago} total={lidPlanejado} cor="bg-violet-500" />
            {lidPlanejado > lidPago && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Falta: {fmt(lidPlanejado - lidPago)}</p>}
          </div>

          {pendentes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                <h2 className="text-sm font-bold text-foreground">Falta pagar — {pendentes.length}</h2>
              </div>
              {pendentes.map(l => (
                <PessoaPayCard key={l.id} tipo="lideranca" id={l.id} nome={l.nome}
                  subtitulo={[l.regiao, l.chave_pix ? `PIX: ${l.chave_pix}` : undefined].filter(Boolean).join(" · ")}
                  valorEsperado={l.retirada_mensal_valor || 0}
                  pagsMes={pagsMes.filter(p => p.lideranca_id === l.id)}
                  mes={mes} ano={ano} />
              ))}
            </div>
          )}

          {pendentes.length === 0 && pagos.length > 0 && (
            <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-2xl py-4">
              <CheckCircle2 size={18} className="text-green-500" />
              <p className="text-sm font-bold text-green-600 dark:text-green-400">Todas lideranças pagas!</p>
            </div>
          )}

          {pagos.length > 0 && (
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between py-2 px-1" onClick={() => setShowPagos(!showPagos)}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <h2 className="text-sm font-bold text-foreground">Pagos — {pagos.length}</h2>
                </div>
                {showPagos ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {showPagos && pagos.map(l => (
                <PessoaPayCard key={l.id} tipo="lideranca" id={l.id} nome={l.nome}
                  subtitulo={l.regiao || undefined}
                  valorEsperado={l.retirada_mensal_valor || 0}
                  pagsMes={pagsMes.filter(p => p.lideranca_id === l.id)}
                  mes={mes} ano={ano} />
              ))}
            </div>
          )}

          {lidComValor.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma liderança com valor cadastrado</p>
            </div>
          )}
        </>
      );
    }

    // Admin
    const filtrados = admComValor.filter(a => matchBusca(a.nome, a.whatsapp || ""));
    const pendentes = filtrados.filter(a => pagsMes.filter(p => p.admin_id === a.id).reduce((acc, p) => acc + p.valor, 0) < (a.valor_contrato || 0));
    const pagos = filtrados.filter(a => pagsMes.filter(p => p.admin_id === a.id).reduce((acc, p) => acc + p.valor, 0) >= (a.valor_contrato || 0));

    return (
      <>
        <div className="bg-card rounded-xl border border-border p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-blue-500 bg-blue-500/10 flex items-center gap-1"><Briefcase size={10} />Admin</span>
              {admPagosN}/{admComValor.length} pagos
            </span>
            <span className="text-xs font-bold text-foreground">{fmt(admPago)} / {fmt(admPlanejado)}</span>
          </div>
          <Bar pago={admPago} total={admPlanejado} cor="bg-blue-500" />
          {admPlanejado > admPago && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Falta: {fmt(admPlanejado - admPago)}</p>}
        </div>

        {pendentes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">Falta pagar — {pendentes.length}</h2>
            </div>
            {pendentes.map(a => (
              <PessoaPayCard key={a.id} tipo="admin" id={a.id} nome={a.nome}
                subtitulo={a.whatsapp || undefined}
                valorEsperado={a.valor_contrato || 0}
                pagsMes={pagsMes.filter(p => p.admin_id === a.id)}
                mes={mes} ano={ano} />
            ))}
          </div>
        )}

        {pendentes.length === 0 && pagos.length > 0 && (
          <div className="flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/30 rounded-2xl py-4">
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-sm font-bold text-green-600 dark:text-green-400">Todos admin pagos!</p>
          </div>
        )}

        {pagos.length > 0 && (
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between py-2 px-1" onClick={() => setShowPagos(!showPagos)}>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-500" />
                <h2 className="text-sm font-bold text-foreground">Pagos — {pagos.length}</h2>
              </div>
              {showPagos ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showPagos && pagos.map(a => (
              <PessoaPayCard key={a.id} tipo="admin" id={a.id} nome={a.nome}
                subtitulo={a.whatsapp || undefined}
                valorEsperado={a.valor_contrato || 0}
                pagsMes={pagsMes.filter(p => p.admin_id === a.id)}
                mes={mes} ano={ano} />
            ))}
          </div>
        )}

        {admComValor.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum administrativo com valor cadastrado</p>
          </div>
        )}
      </>
    );
  };

  const abas = [
    { id: "suplentes" as const, label: "Suplentes", icon: <List size={12} />, count: supComValor.length, pagos: supPagosN },
    { id: "liderancas" as const, label: "Lideranças", icon: <Users size={12} />, count: lidComValor.length, pagos: lidPagosN },
    { id: "admin" as const, label: "Admin", icon: <Briefcase size={12} />, count: admComValor.length, pagos: admPagosN },
  ];

  return (
    <PageTransition>
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-foreground">Pagamentos</h1>

        {/* Painel financeiro geral */}
        {!isLoading && (
          <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2 text-white/80 text-xs mb-3">
              <Wallet size={14} /> Painel Financeiro — {MESES[mes - 1]}/{ano}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
                <p className="text-white/70 text-[9px] uppercase tracking-wider font-medium">Planejado</p>
                <p className="text-white font-bold text-base leading-tight">{fmt(totalPlanejado)}</p>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
                <p className="text-white/70 text-[9px] uppercase tracking-wider font-medium">Pago</p>
                <p className="text-white font-bold text-base leading-tight">{fmt(totalPago)}</p>
              </div>
              <div className="bg-black/20 backdrop-blur rounded-xl p-2.5 text-center">
                <p className="text-white/70 text-[9px] uppercase tracking-wider font-medium">Falta</p>
                <p className="text-white font-bold text-base leading-tight">{fmt(totalFalta)}</p>
              </div>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pctGeral}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-white/60 text-[9px]">{supPagosN + lidPagosN + admPagosN} pagos · {(supComValor.length + lidComValor.length + admComValor.length) - (supPagosN + lidPagosN + admPagosN)} pendentes</span>
              <span className="text-white/60 text-[9px]">{pctGeral.toFixed(0)}%</span>
            </div>
          </div>
        )}

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

        {/* Busca */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome..." className="pl-9 h-10 bg-card border-border rounded-xl text-sm" />
          {busca && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setBusca("")}><X size={14} /></button>}
        </div>

        {/* Tabs: Suplentes / Lideranças / Admin */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {abas.map(a => (
            <button key={a.id} onClick={() => { setAbaAtiva(a.id); setShowPagos(true); }}
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-lg transition-all ${abaAtiva === a.id ? "bg-card shadow text-primary" : "text-muted-foreground"}`}>
              {a.icon}{a.label}
              <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ml-0.5 ${abaAtiva === a.id ? "bg-primary/10 text-primary" : "bg-muted-foreground/20"}`}>{a.count}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        {isLoading ? <CardSkeletonList count={5} /> : (
          <div className="space-y-3">
            {renderAba()}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
