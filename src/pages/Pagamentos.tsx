import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Pagamento = Tables<"pagamentos"> & { suplentes?: { nome: string } | null };

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const emptyForm = { suplente_id: "", mes: "1", ano: String(new Date().getFullYear()), valor: "0", categoria: "", observacao: "" };

const Pagamentos = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [suplentes, setSuplentes] = useState<{ id: string; nome: string }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pagamento | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [p, s] = await Promise.all([
      supabase.from("pagamentos").select("*, suplentes(nome)").order("ano", { ascending: false }).order("mes", { ascending: false }),
      supabase.from("suplentes").select("id, nome").order("nome"),
    ]);
    if (p.data) setPagamentos(p.data);
    if (s.data) setSuplentes(s.data);
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (p?: Pagamento) => {
    if (p) {
      setEditing(p);
      setForm({ suplente_id: p.suplente_id, mes: String(p.mes), ano: String(p.ano), valor: String(p.valor), categoria: p.categoria, observacao: p.observacao ?? "" });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.suplente_id || !form.categoria) { toast.error("Preencha suplente e categoria"); return; }
    setLoading(true);
    const payload = { suplente_id: form.suplente_id, mes: Number(form.mes), ano: Number(form.ano), valor: Number(form.valor), categoria: form.categoria, observacao: form.observacao || null };
    if (editing) {
      const { error } = await supabase.from("pagamentos").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("pagamentos").insert(payload);
      if (error) toast.error("Erro ao cadastrar"); else toast.success("Cadastrado!");
    }
    setLoading(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir?")) return;
    await supabase.from("pagamentos").delete().eq("id", id);
    toast.success("Excluído!");
    load();
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = pagamentos.filter(p =>
    (p.suplentes?.nome ?? "").toLowerCase().includes(search.toLowerCase()) ||
    p.categoria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Novo Pagamento</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Suplente</TableHead>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.suplentes?.nome ?? "—"}</TableCell>
                    <TableCell>{meses[p.mes - 1]}/{p.ano}</TableCell>
                    <TableCell>{p.categoria}</TableCell>
                    <TableCell>{fmt(p.valor)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{p.observacao ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pagamento encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Pagamento" : "Novo Pagamento"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Suplente</Label>
              <Select value={form.suplente_id} onValueChange={v => setForm({ ...form, suplente_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{suplentes.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Select value={form.mes} onValueChange={v => setForm({ ...form, mes: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano</Label>
              <Input type="number" value={form.ano} onChange={e => setForm({ ...form, ano: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Observação</Label>
              <Input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />
            </div>
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

export default Pagamentos;
