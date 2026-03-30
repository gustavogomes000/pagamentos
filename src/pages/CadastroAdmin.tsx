import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Save, Loader2, ArrowLeft } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";

interface FormData {
  nome: string;
  cpf: string;
  whatsapp: string;
  valor_contrato: number;
}

const defaultForm: FormData = {
  nome: "",
  cpf: "",
  whatsapp: "",
  valor_contrato: 0,
};

const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CadastroAdmin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ["admin_pessoa", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("administrativo").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<FormData>(defaultForm);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  if (existing && !initialized) {
    setForm({
      nome: existing.nome || "",
      cpf: existing.cpf || "",
      whatsapp: existing.whatsapp || "",
      valor_contrato: existing.valor_contrato || 0,
    });
    setInitialized(true);
  }

  const set = (key: keyof FormData, value: string | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    let error;
    if (id) {
      ({ error } = await (supabase as any).from("administrativo").update(payload).eq("id", id));
    } else {
      ({ error } = await (supabase as any).from("administrativo").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: id ? "Atualizado!" : "Funcionário cadastrado!" });
      qc.invalidateQueries({ queryKey: ["administrativo"] });
      navigate("/administrativo");
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/administrativo")} className="p-1.5 rounded-xl text-muted-foreground active:bg-muted">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-foreground">{id ? "Editar Funcionário" : "Novo Funcionário"}</h1>
        </div>

        {/* Dados */}
        <section className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Dados do Funcionário</h2>

          <Field label="Nome" required>
            <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo" className="bg-card shadow-sm border-border" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CPF">
              <Input value={form.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" inputMode="numeric" className="bg-card shadow-sm border-border" />
            </Field>
            <Field label="WhatsApp">
              <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(62) 99999-9999" inputMode="tel" className="bg-card shadow-sm border-border" />
            </Field>
          </div>
        </section>

        {/* Contrato */}
        <section className="bg-card rounded-2xl border border-border p-4 space-y-3 shadow-sm">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Valor do Contrato</h2>

          <Field label="Valor Mensal (R$)" required>
            <Input
              type="number" inputMode="numeric"
              value={form.valor_contrato || ""}
              onChange={(e) => set("valor_contrato", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="bg-card shadow-sm border-border"
            />
          </Field>

          <div className="flex items-center justify-between bg-primary/5 rounded-xl p-3">
            <span className="text-sm font-semibold text-foreground">Salário / Contrato</span>
            <span className="text-base font-bold text-primary">{fmt(form.valor_contrato)}/mês</span>
          </div>
        </section>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-90 text-white font-semibold h-12 text-base shadow-lg active:scale-[0.98] transition-transform"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {saving ? "Salvando..." : id ? "Atualizar Funcionário" : "Salvar Funcionário"}
        </Button>
      </div>
    </PageTransition>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}
