import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Pessoa = Tables<"pessoas">;

const emptyPessoa = { cpf: "", nome: "", telefone: "", email: "", whatsapp: "", municipio: "", uf: "", origem: "", observacoes_gerais: "", instagram: "", data_nascimento: "", titulo_eleitor: "", zona_eleitoral: "", secao_eleitoral: "", situacao_titulo: "", outras_redes: "" };

const Pessoas = () => {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pessoa | null>(null);
  const [form, setForm] = useState(emptyPessoa);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("pessoas").select("*").order("criado_em", { ascending: false });
    if (data) setPessoas(data);
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (p?: Pessoa) => {
    if (p) {
      setEditing(p);
      setForm({ cpf: p.cpf, nome: p.nome ?? "", telefone: p.telefone ?? "", email: p.email ?? "", whatsapp: p.whatsapp ?? "", municipio: p.municipio ?? "", uf: p.uf ?? "", origem: p.origem ?? "", observacoes_gerais: p.observacoes_gerais ?? "", instagram: p.instagram ?? "", data_nascimento: p.data_nascimento ?? "", titulo_eleitor: p.titulo_eleitor ?? "", zona_eleitoral: p.zona_eleitoral ?? "", secao_eleitoral: p.secao_eleitoral ?? "", situacao_titulo: p.situacao_titulo ?? "", outras_redes: p.outras_redes ?? "" });
    } else {
      setEditing(null);
      setForm(emptyPessoa);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.cpf) { toast.error("CPF é obrigatório"); return; }
    setLoading(true);
    const payload = { ...form, data_nascimento: form.data_nascimento || null, atualizado_em: new Date().toISOString() };
    if (editing) {
      const { error } = await supabase.from("pessoas").update(payload).eq("id", editing.id);
      if (error) toast.error("Erro ao atualizar"); else toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("pessoas").insert(payload);
      if (error) toast.error("Erro ao cadastrar"); else toast.success("Cadastrado!");
    }
    setLoading(false);
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir?")) return;
    await supabase.from("pessoas").delete().eq("id", id);
    toast.success("Excluído!");
    load();
  };

  const filtered = pessoas.filter(p =>
    (p.nome ?? "").toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search)
  );

  const Field = ({ label, field, type = "text" }: { label: string; field: keyof typeof form; type?: string }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => handleOpen()}><Plus className="w-4 h-4 mr-2" />Nova Pessoa</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome ?? "—"}</TableCell>
                    <TableCell>{p.cpf}</TableCell>
                    <TableCell>{p.telefone ?? "—"}</TableCell>
                    <TableCell>{p.municipio ?? "—"}</TableCell>
                    <TableCell>{p.origem ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(p)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma pessoa encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome" field="nome" />
            <Field label="CPF" field="cpf" />
            <Field label="Telefone" field="telefone" />
            <Field label="WhatsApp" field="whatsapp" />
            <Field label="Email" field="email" type="email" />
            <Field label="Data Nascimento" field="data_nascimento" type="date" />
            <Field label="Município" field="municipio" />
            <Field label="UF" field="uf" />
            <Field label="Origem" field="origem" />
            <Field label="Instagram" field="instagram" />
            <Field label="Outras Redes" field="outras_redes" />
            <Field label="Título Eleitor" field="titulo_eleitor" />
            <Field label="Zona Eleitoral" field="zona_eleitoral" />
            <Field label="Seção Eleitoral" field="secao_eleitoral" />
            <Field label="Situação Título" field="situacao_titulo" />
          </div>
          <div className="space-y-1 mt-2">
            <Label className="text-xs">Observações</Label>
            <Input value={form.observacoes_gerais} onChange={e => setForm({ ...form, observacoes_gerais: e.target.value })} />
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

export default Pessoas;
