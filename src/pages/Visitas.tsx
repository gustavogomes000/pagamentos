import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Visita = Tables<"visitas"> & { pessoas?: { nome: string | null } | null };

const statusColors: Record<string, string> = {
  "Aguardando": "bg-warning/15 text-warning border-warning/30",
  "Em andamento": "bg-accent/15 text-accent border-accent/30",
  "Concluído": "bg-success/15 text-success border-success/30",
};

const emptyForm = { pessoa_id: "", assunto: "", descricao_assunto: "", quem_indicou: "", origem_visita: "", status: "Aguardando", observacoes: "", cadastrado_por: "", responsavel_tratativa: "", data_hora: "" };

const Visitas = () => {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [pessoas, setPessoas] = useState<{ id: string; nome: string | null }[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Visita | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [v, p] = await Promise.all([
      supabase.from("visitas").select("*, pessoas(nome)").order("data_hora", { ascending: false }),
      supabase.from("pessoas").select("id, nome").order("nome"),
    ]);
    if (v.data) setVisitas(v.data);
    if (p.data) setPessoas(p.data);
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (v?: Visita) => {
    if (v) {
      setEditing(v);
      setForm({ pessoa_id: v.pessoa_id ?? "", assunto: v.assunto ?? "", descricao_assunto: v.descricao_assunto ?? "", quem_indicou: v.quem_indicou ?? "", origem_visita: v.origem_visita ?? "", status: v.status ?? "Aguardando", observacoes: v.observacoes ?? "", cadastrado_por: v.cadastrado_por ?? "", responsavel_tratativa: v.responsavel_tratativa ?? "", data_hora: v.data_hora ? v.data_hora.slice(0, 16) : "" });
    } else {
      setEditing(null);
      setForm({ ...emptyForm, data_hora: new Date().toISOString().slice(0, 16) });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = { ...form, pessoa_id: form.pessoa_id || null, atualizado_em: new Date().toISOString(), data_hora: form.data_hora || new Date().toISOString() };
    if (editing) {
      const { error } = await supabase.from("visitas").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("visitas").insert(payload);
      if (error) toast.error("Erro ao cadastrar"); else toast.success("Cadastrado!");
    }
    setLoading(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir?")) return;
    await supabase.from("visitas").delete().eq("id", id);
    toast.success("Excluído!");
    load();
  };

  const filtered = visitas.filter(v =>
    (v.pessoas?.nome ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (v.assunto ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Nova Visita</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => (
                  <TableRow key={v.id}>
                    <TableCell>{v.data_hora ? format(new Date(v.data_hora), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                    <TableCell className="font-medium">{v.pessoas?.nome ?? "—"}</TableCell>
                    <TableCell>{v.assunto ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[v.status ?? ""] ?? ""}>{v.status ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>{v.responsavel_tratativa ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(v)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma visita encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Visita" : "Nova Visita"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data/Hora</Label>
              <Input type="datetime-local" value={form.data_hora} onChange={e => setForm({ ...form, data_hora: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pessoa</Label>
              <Select value={form.pessoa_id} onValueChange={v => setForm({ ...form, pessoa_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome ?? p.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assunto</Label>
              <Input value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição do Assunto</Label>
              <Input value={form.descricao_assunto} onChange={e => setForm({ ...form, descricao_assunto: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quem Indicou</Label>
              <Input value={form.quem_indicou} onChange={e => setForm({ ...form, quem_indicou: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Origem da Visita</Label>
              <Input value={form.origem_visita} onChange={e => setForm({ ...form, origem_visita: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aguardando">Aguardando</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Responsável Tratativa</Label>
              <Input value={form.responsavel_tratativa} onChange={e => setForm({ ...form, responsavel_tratativa: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cadastrado Por</Label>
              <Input value={form.cadastrado_por} onChange={e => setForm({ ...form, cadastrado_por: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs">Observações</Label>
            <Input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
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

export default Visitas;
