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
      const r1 = await client.queryArray(`SELECT ano, COUNT(*) as cnt FROM public.tse_candidatos GROUP BY ano ORDER BY ano`);
      const r2 = await client.queryArray(`SELECT ano, COUNT(*) as cnt FROM public.tse_votacao GROUP BY ano ORDER BY ano`);
      const r3 = await client.queryArray(`SELECT ano, COUNT(*) as cnt FROM public.tse_eleitorado GROUP BY ano ORDER BY ano`);
      await client.end();
      const fmt = (rows: any[][]) => rows.map(r => ({ ano: Number(r[0]), count: Number(r[1]) }));
      return new Response(JSON.stringify({
        ok: true,
        candidatos: fmt(r1.rows),
        votacao: fmt(r2.rows),
        eleitorado: fmt(r3.rows),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (acao === "dedup_votacao") {
      // Remove duplicate rows in tse_votacao
      await client.queryArray(`
        DELETE FROM public.tse_votacao a USING public.tse_votacao b
        WHERE a.id > b.id
          AND a.ano = b.ano
          AND a.nr_candidato = b.nr_candidato
          AND COALESCE(a.cd_municipio,'') = COALESCE(b.cd_municipio,'')
          AND COALESCE(a.nr_zona,'') = COALESCE(b.nr_zona,'')
      `);
      const r = await client.queryArray(`SELECT COUNT(*) FROM public.tse_votacao`);
      await client.end();
      return new Response(JSON.stringify({ ok: true, votacao_after_dedup: Number(r.rows[0][0]) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (acao === "validar_bairros") {
      // Check bairros for a specific candidate's top zone
      const r = await client.queryArray(`
        WITH votos_zona AS (
          SELECT nr_candidato, cd_municipio, nr_zona, SUM(qt_votos_nominais) as votos
          FROM public.tse_votacao WHERE ano = 2024 AND nr_candidato = '40233'
          GROUP BY nr_candidato, cd_municipio, nr_zona ORDER BY votos DESC LIMIT 1
        )
        SELECT e.nm_bairro, e.qt_eleitor_secao
        FROM votos_zona vz
        JOIN public.tse_eleitorado e ON vz.nr_zona = e.nr_zona AND vz.cd_municipio = e.cd_municipio AND e.ano = 2024
        ORDER BY e.qt_eleitor_secao DESC LIMIT 10
      `);
      await client.end();
      const bairros = r.rows.map((row: any[]) => ({ bairro: row[0], eleitores: Number(row[1]) }));
      return new Response(JSON.stringify({ ok: true, bairros }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      // Check specific candidate exists with correct data
      const { nome, ano: anoParam } = await req.json().catch(() => ({ nome: "ADRIANA", ano: 2024 }));
      const r = await client.queryArray(`
        SELECT c.nm_candidato, c.nm_urna_candidato, c.nr_candidato, c.sg_partido, c.sq_candidato,
               COALESCE(SUM(v.qt_votos_nominais), 0) as total_votos
        FROM public.tse_candidatos c
        LEFT JOIN public.tse_votacao v ON c.nr_candidato = v.nr_candidato AND UPPER(c.nm_ue) = UPPER(v.nm_municipio) AND c.ano = v.ano
        WHERE c.ano = ${anoParam || 2024} AND c.ds_cargo = 'VEREADOR'
          AND UPPER(c.nm_candidato) LIKE UPPER('%${(nome || "ADRIANA").replace(/'/g, "")}%')
          AND UPPER(c.nm_ue) = 'GOIÂNIA'
        GROUP BY c.nm_candidato, c.nm_urna_candidato, c.nr_candidato, c.sg_partido, c.sq_candidato
        ORDER BY total_votos DESC
        LIMIT 5
      `);
      await client.end();
      const results = r.rows.map((row: any[]) => ({
        nm_candidato: row[0],
        nm_urna_candidato: row[1],
        nr_candidato: row[2],
        sg_partido: row[3],
        sq_candidato: row[4],
        total_votos: Number(row[5]),
      }));
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await client.end();
    return new Response(JSON.stringify({ error: "acao deve ser: criar_tabelas, verificar, dedup_votacao ou validar_amostra" }), {
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
