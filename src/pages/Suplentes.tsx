import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Suplente = Tables<"suplentes">;

const emptyForm = {
  nome: "", telefone: "", partido: "", cargo_disputado: "Vereador", regiao_atuacao: "", base_politica: "", situacao: "Suplente", ano_eleicao: "2024",
  total_votos: "0", expectativa_votos: "0",
  retirada_mensal_valor: "3000", retirada_mensal_meses: "6",
  plotagem_qtd: "0", plotagem_valor_unit: "250",
  liderancas_qtd: "0", liderancas_valor_unit: "1622",
  fiscais_qtd: "0", fiscais_valor_unit: "110",
  total_campanha: "0", assinatura: "",
};

const Suplentes = () => {
  const [suplentes, setSuplentes] = useState<Suplente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Suplente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("suplentes").select("*").order("nome");
    if (data) setSuplentes(data);
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (s?: Suplente) => {
    if (s) {
      setEditing(s);
      setForm({
        nome: s.nome, telefone: s.telefone ?? "", partido: s.partido ?? "", cargo_disputado: s.cargo_disputado ?? "Vereador",
        regiao_atuacao: s.regiao_atuacao ?? "", base_politica: s.base_politica ?? "", situacao: s.situacao ?? "Suplente",
        ano_eleicao: String(s.ano_eleicao ?? 2024), total_votos: String(s.total_votos ?? 0), expectativa_votos: String(s.expectativa_votos ?? 0),
        retirada_mensal_valor: String(s.retirada_mensal_valor ?? 0), retirada_mensal_meses: String(s.retirada_mensal_meses ?? 0),
        plotagem_qtd: String(s.plotagem_qtd ?? 0), plotagem_valor_unit: String(s.plotagem_valor_unit ?? 0),
        liderancas_qtd: String(s.liderancas_qtd ?? 0), liderancas_valor_unit: String(s.liderancas_valor_unit ?? 0),
        fiscais_qtd: String(s.fiscais_qtd ?? 0), fiscais_valor_unit: String(s.fiscais_valor_unit ?? 0),
        total_campanha: String(s.total_campanha ?? 0), assinatura: s.assinatura ?? "",
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome) { toast.error("Nome é obrigatório"); return; }
    setLoading(true);
    const payload = {
      nome: form.nome, telefone: form.telefone || null, partido: form.partido || null,
      cargo_disputado: form.cargo_disputado || null, regiao_atuacao: form.regiao_atuacao || null,
      base_politica: form.base_politica || null, situacao: form.situacao || null,
      ano_eleicao: Number(form.ano_eleicao) || null, total_votos: Number(form.total_votos) || 0,
      expectativa_votos: Number(form.expectativa_votos) || 0,
      retirada_mensal_valor: Number(form.retirada_mensal_valor) || 0,
      retirada_mensal_meses: Number(form.retirada_mensal_meses) || 0,
      plotagem_qtd: Number(form.plotagem_qtd) || 0, plotagem_valor_unit: Number(form.plotagem_valor_unit) || 0,
      liderancas_qtd: Number(form.liderancas_qtd) || 0, liderancas_valor_unit: Number(form.liderancas_valor_unit) || 0,
      fiscais_qtd: Number(form.fiscais_qtd) || 0, fiscais_valor_unit: Number(form.fiscais_valor_unit) || 0,
      total_campanha: Number(form.total_campanha) || 0, assinatura: form.assinatura || null,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      const { error } = await supabase.from("suplentes").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("suplentes").insert(payload);
      if (error) toast.error("Erro ao cadastrar"); else toast.success("Cadastrado!");
    }
    setLoading(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir?")) return;
    await supabase.from("suplentes").delete().eq("id", id);
    toast.success("Excluído!");
    load();
  };

  const filtered = suplentes.filter(s => s.nome.toLowerCase().includes(search.toLowerCase()));

  const NumField = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />
    </div>
  );

  const TxtField = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />
    </div>
  );

  const fmt = (v: number | null) => v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo Suplente</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Partido</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Total Campanha</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell>{s.partido ?? "—"}</TableCell>
                    <TableCell>{s.cargo_disputado ?? "—"}</TableCell>
                    <TableCell>{s.situacao ?? "—"}</TableCell>
                    <TableCell>{fmt(s.total_campanha)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(s)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum suplente encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Suplente" : "Novo Suplente"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TxtField label="Nome" field="nome" />
            <TxtField label="Telefone" field="telefone" />
            <TxtField label="Partido" field="partido" />
            <TxtField label="Cargo Disputado" field="cargo_disputado" />
            <TxtField label="Região de Atuação" field="regiao_atuacao" />
            <TxtField label="Base Política" field="base_politica" />
            <TxtField label="Situação" field="situacao" />
            <NumField label="Ano Eleição" field="ano_eleicao" />
            <NumField label="Total Votos" field="total_votos" />
            <NumField label="Expectativa Votos" field="expectativa_votos" />
            <NumField label="Retirada Mensal (R$)" field="retirada_mensal_valor" />
            <NumField label="Retirada Mensal (Meses)" field="retirada_mensal_meses" />
            <NumField label="Plotagem Qtd" field="plotagem_qtd" />
            <NumField label="Plotagem Valor Unit." field="plotagem_valor_unit" />
            <NumField label="Lideranças Qtd" field="liderancas_qtd" />
            <NumField label="Lideranças Valor Unit." field="liderancas_valor_unit" />
            <NumField label="Fiscais Qtd" field="fiscais_qtd" />
            <NumField label="Fiscais Valor Unit." field="fiscais_valor_unit" />
            <NumField label="Total Campanha" field="total_campanha" />
            <TxtField label="Assinatura" field="assinatura" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suplentes;
