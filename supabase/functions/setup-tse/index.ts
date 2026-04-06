import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { acao } = await req.json();
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    
    if (!dbUrl) {
      return new Response(JSON.stringify({ error: "SUPABASE_DB_URL não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Deno postgres to run DDL
    const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
    const client = new Client(dbUrl);
    await client.connect();

    if (acao === "criar_tabelas") {
      // tse_candidatos
      await client.queryArray(`
        CREATE TABLE IF NOT EXISTS public.tse_candidatos (
          id bigserial PRIMARY KEY,
          ano smallint NOT NULL,
          sq_candidato text,
          nm_candidato text NOT NULL,
          nm_urna_candidato text,
          nr_candidato text NOT NULL,
          sg_partido text,
          ds_cargo text,
          nm_ue text,
          sg_ue text,
          ds_sit_tot_turno text,
          nr_turno smallint DEFAULT 1
        )
      `);
      // tse_votacao
      await client.queryArray(`
        CREATE TABLE IF NOT EXISTS public.tse_votacao (
          id bigserial PRIMARY KEY,
          ano smallint NOT NULL,
          nr_candidato text NOT NULL,
          nm_candidato text,
          nm_municipio text,
          cd_municipio text,
          nr_zona text,
          qt_votos_nominais integer DEFAULT 0,
          nr_turno smallint DEFAULT 1
        )
      `);
      // tse_eleitorado
      await client.queryArray(`
        CREATE TABLE IF NOT EXISTS public.tse_eleitorado (
          id bigserial PRIMARY KEY,
          ano smallint NOT NULL,
          cd_municipio text,
          nr_zona text,
          nm_bairro text,
          qt_eleitor_secao integer DEFAULT 0
        )
      `);

      // Indexes
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_tse_cand_ano ON public.tse_candidatos(ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_cand_nome ON public.tse_candidatos(UPPER(nm_candidato))`,
        `CREATE INDEX IF NOT EXISTS idx_tse_cand_urna ON public.tse_candidatos(UPPER(nm_urna_candidato))`,
        `CREATE INDEX IF NOT EXISTS idx_tse_cand_nr ON public.tse_candidatos(nr_candidato, ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_cand_ue ON public.tse_candidatos(UPPER(nm_ue), ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_cand_cargo ON public.tse_candidatos(ds_cargo, ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_vot_nr_mun ON public.tse_votacao(nr_candidato, nm_municipio, ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_vot_cd_mun ON public.tse_votacao(cd_municipio, ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_vot_zona ON public.tse_votacao(nr_zona, cd_municipio, ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_eleit_zona ON public.tse_eleitorado(nr_zona, cd_municipio, ano)`,
        `CREATE INDEX IF NOT EXISTS idx_tse_eleit_bairro ON public.tse_eleitorado(nm_bairro, ano)`,
      ];
      for (const idx of indexes) {
        await client.queryArray(idx);
      }

      // RLS
      await client.queryArray(`ALTER TABLE public.tse_candidatos ENABLE ROW LEVEL SECURITY`);
      await client.queryArray(`ALTER TABLE public.tse_votacao ENABLE ROW LEVEL SECURITY`);
      await client.queryArray(`ALTER TABLE public.tse_eleitorado ENABLE ROW LEVEL SECURITY`);

      const policies = [
        [`tse_candidatos`, `Authenticated read tse_candidatos`, `SELECT`, `authenticated`],
        [`tse_candidatos`, `Service role full tse_candidatos`, `ALL`, `service_role`],
        [`tse_votacao`, `Authenticated read tse_votacao`, `SELECT`, `authenticated`],
        [`tse_votacao`, `Service role full tse_votacao`, `ALL`, `service_role`],
        [`tse_eleitorado`, `Authenticated read tse_eleitorado`, `SELECT`, `authenticated`],
        [`tse_eleitorado`, `Service role full tse_eleitorado`, `ALL`, `service_role`],
      ];
      for (const [table, name, cmd, role] of policies) {
        try {
          if (cmd === "ALL") {
            await client.queryArray(`CREATE POLICY "${name}" ON public.${table} FOR ${cmd} TO ${role} USING (true) WITH CHECK (true)`);
          } else {
            await client.queryArray(`CREATE POLICY "${name}" ON public.${table} FOR ${cmd} TO ${role} USING (true)`);
          }
        } catch {
          // policy may already exist
        }
      }

      await client.end();
      return new Response(JSON.stringify({ ok: true, msg: "Tabelas, índices e RLS criados com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (acao === "verificar") {
      const r1 = await client.queryArray(`SELECT COUNT(*) FROM public.tse_candidatos`);
      const r2 = await client.queryArray(`SELECT COUNT(*) FROM public.tse_votacao`);
      const r3 = await client.queryArray(`SELECT COUNT(*) FROM public.tse_eleitorado`);
      await client.end();
      return new Response(JSON.stringify({
        ok: true,
        candidatos: Number(r1.rows[0][0]),
        votacao: Number(r2.rows[0][0]),
        eleitorado: Number(r3.rows[0][0]),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await client.end();
    return new Response(JSON.stringify({ error: "acao deve ser: criar_tabelas ou verificar" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Setup error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
