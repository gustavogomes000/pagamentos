import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, UserCheck, CreditCard } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({ pessoas: 0, visitas: 0, suplentes: 0, pagamentos: 0 });

  useEffect(() => {
    const load = async () => {
      const [p, v, s, pg] = await Promise.all([
        supabase.from("pessoas").select("id", { count: "exact", head: true }),
        supabase.from("visitas").select("id", { count: "exact", head: true }),
        supabase.from("suplentes").select("id", { count: "exact", head: true }),
        supabase.from("pagamentos").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        pessoas: p.count ?? 0,
        visitas: v.count ?? 0,
        suplentes: s.count ?? 0,
        pagamentos: pg.count ?? 0,
      });
    };
    load();
  }, []);

  const cards = [
    { label: "Pessoas", value: stats.pessoas, icon: Users, color: "text-primary" },
    { label: "Visitas", value: stats.visitas, icon: ClipboardList, color: "text-accent" },
    { label: "Suplentes", value: stats.suplentes, icon: UserCheck, color: "text-success" },
    { label: "Pagamentos", value: stats.pagamentos, icon: CreditCard, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Painel de Controle</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
