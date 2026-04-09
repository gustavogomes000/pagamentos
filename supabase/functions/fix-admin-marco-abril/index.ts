import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  apply: z.boolean().optional().default(false),
});

const TARGETS = [
  { label: "Gustavo Gomes", aliases: ["gustavo gomes", "gustavo"] },
  { label: "Syndy", aliases: ["syndy", "sindy"] },
];

type AdminRow = {
  created_at: string;
  id: string;
  nome: string;
  valor_contrato: number | null;
};

type PagamentoRow = {
  admin_id: string | null;
  ano: number;
  categoria: string;
  created_at: string;
  id: string;
  mes: number;
  observacao: string | null;
  valor: number;
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function matchesTarget(nome: string) {
  const normalized = normalize(nome);
  return TARGETS.some((target) => target.aliases.some((alias) => normalized.includes(alias)));
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Ambiente do Supabase não configurado" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autorizado" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return json({ error: "Token ausente" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "Sessão inválida" }, 401);
    }

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });

    if (roleError) {
      return json({ error: roleError.message }, 500);
    }

    if (!isAdmin) {
      return json({ error: "Acesso negado" }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }

    const { apply } = parsed.data;

    const { data: adminRows, error: adminError } = await supabaseAdmin
      .from("administrativo")
      .select("id, nome, valor_contrato, created_at")
      .order("nome");

    if (adminError) {
      return json({ error: adminError.message }, 500);
    }

    const matchedAdmins = ((adminRows || []) as AdminRow[]).filter((row) => matchesTarget(row.nome));

    if (matchedAdmins.length === 0) {
      return json({ error: "Gustavo Gomes e Syndy não foram encontrados no administrativo" }, 404);
    }

    const adminIds = matchedAdmins.map((row) => row.id);
    const adminById = new Map(matchedAdmins.map((row) => [row.id, row]));

    const { data: salaryPayments, error: paymentsError } = await supabaseAdmin
      .from("pagamentos")
      .select("id, admin_id, mes, ano, categoria, valor, observacao, created_at")
      .in("admin_id", adminIds)
      .eq("ano", 2026)
      .eq("categoria", "salario")
      .order("mes", { ascending: true })
      .order("created_at", { ascending: true });

    if (paymentsError) {
      return json({ error: paymentsError.message }, 500);
    }

    const pagamentos = (salaryPayments || []) as PagamentoRow[];
    const pagamentosMarco = pagamentos.filter((pagamento) => pagamento.mes === 3);
    const pagamentosAbril = pagamentos.filter((pagamento) => pagamento.mes === 4);

    const preview = matchedAdmins.map((admin) => ({
      id: admin.id,
      nome: admin.nome,
      valor_contrato: admin.valor_contrato,
      created_at: admin.created_at,
      marco: pagamentosMarco.filter((pagamento) => pagamento.admin_id === admin.id).map((pagamento) => ({
        id: pagamento.id,
        valor: pagamento.valor,
        observacao: pagamento.observacao,
      })),
      abril: pagamentosAbril.filter((pagamento) => pagamento.admin_id === admin.id).map((pagamento) => ({
        id: pagamento.id,
        valor: pagamento.valor,
        observacao: pagamento.observacao,
      })),
    }));

    if (!apply) {
      return json({
        dryRun: true,
        encontrados: preview,
        pagamentosMarcoRemover: pagamentosMarco.length,
        pagamentosAbrilExistentes: pagamentosAbril.length,
      });
    }

    if (pagamentosMarco.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("pagamentos")
        .delete()
        .in("id", pagamentosMarco.map((pagamento) => pagamento.id));

      if (deleteError) {
        return json({ error: deleteError.message }, 500);
      }
    }

    const inserts = matchedAdmins.flatMap((admin) => {
      const abrilExistente = pagamentosAbril.some((pagamento) => pagamento.admin_id === admin.id);
      if (abrilExistente) return [];

      const valorMarco = pagamentosMarco
        .filter((pagamento) => pagamento.admin_id === admin.id)
        .reduce((total, pagamento) => total + Number(pagamento.valor || 0), 0);

      const valor = valorMarco > 0 ? valorMarco : Number(admin.valor_contrato || 0);
      if (valor <= 0) return [];

      return [{
        admin_id: admin.id,
        ano: 2026,
        categoria: "salario",
        mes: 4,
        observacao: "Ajuste automático: primeiro pagamento movido de março para abril",
        tipo_pessoa: "admin",
        valor,
      }];
    });

    if (inserts.length > 0) {
      const { error: insertError } = await supabaseAdmin.from("pagamentos").insert(inserts);
      if (insertError) {
        return json({ error: insertError.message }, 500);
      }
    }

    const { data: marchAfter, error: marchAfterError } = await supabaseAdmin
      .from("pagamentos")
      .select("id, admin_id, mes, ano, categoria, valor")
      .eq("ano", 2026)
      .eq("mes", 3)
      .eq("categoria", "salario")
      .not("admin_id", "is", null);

    if (marchAfterError) {
      return json({ error: marchAfterError.message }, 500);
    }

    const nomesMarco = Array.from(new Set(((marchAfter || []) as PagamentoRow[])
      .map((pagamento) => adminById.get(String(pagamento.admin_id))?.nome)
      .filter(Boolean)));

    const { data: aprilAfter, error: aprilAfterError } = await supabaseAdmin
      .from("pagamentos")
      .select("id, admin_id, mes, ano, categoria, valor, observacao")
      .in("admin_id", adminIds)
      .eq("ano", 2026)
      .eq("mes", 4)
      .eq("categoria", "salario");

    if (aprilAfterError) {
      return json({ error: aprilAfterError.message }, 500);
    }

    return json({
      success: true,
      removidosDeMarco: pagamentosMarco.length,
      inseridosEmAbril: inserts.length,
      encontrados: preview,
      nomesAdminMarcoAposAjuste: nomesMarco,
      abrilAposAjuste: (aprilAfter || []).map((pagamento: any) => ({
        admin_id: pagamento.admin_id,
        nome: adminById.get(String(pagamento.admin_id))?.nome,
        valor: pagamento.valor,
        observacao: pagamento.observacao,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return json({ error: message }, 500);
  }
});