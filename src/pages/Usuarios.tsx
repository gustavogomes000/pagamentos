import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Usuario = Tables<"usuarios">;
type UserRole = Tables<"user_roles">;

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<(Usuario & { role?: string })[]>([]);

  const load = async () => {
    const [u, r] = await Promise.all([
      supabase.from("usuarios").select("*").order("nome_usuario"),
      supabase.from("user_roles").select("*"),
    ]);
    if (u.data) {
      const roles = r.data ?? [];
      setUsuarios(u.data.map(usr => ({
        ...usr,
        role: roles.find(ro => ro.user_id === usr.user_id)?.role ?? "—",
      })));
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Gerenciamento de Usuários</h1>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome_usuario}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>{u.criado_em ? new Date(u.criado_em).toLocaleDateString("pt-BR") : "—"}</TableCell>
                  </TableRow>
                ))}
                {usuarios.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;
