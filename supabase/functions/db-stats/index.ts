import { corsHeaders } from '@supabase/supabase-js/cors'

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return new Response(JSON.stringify({ error: "no db url" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
  const client = new Client(dbUrl);
  await client.connect();

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "stats";

    if (action === "stats") {
      const queries = [
        // Total per table
        "SELECT 'tse_candidatos' as t, count(*) as total FROM tse_candidatos",
        "SELECT 'tse_votacao' as t, count(*) as total FROM tse_votacao",
        "SELECT 'tse_eleitorado' as t, count(*) as total FROM tse_eleitorado",
        // By year
        "SELECT 'cand_por_ano' as t, ano, count(*) as total FROM tse_candidatos GROUP BY ano ORDER BY ano",
        "SELECT 'vot_por_ano' as t, ano, count(*) as total FROM tse_votacao GROUP BY ano ORDER BY ano",
        "SELECT 'eleit_por_ano' as t, ano, count(*) as total FROM tse_eleitorado GROUP BY ano ORDER BY ano",
        // Non-vereador count
        "SELECT 'nao_vereador' as t, ds_cargo, count(*) as total FROM tse_candidatos WHERE ds_cargo != 'VEREADOR' GROUP BY ds_cargo ORDER BY count(*) DESC",
        // Eleitorado duplicates potential
        "SELECT 'eleit_distinct_zona_mun' as t, count(DISTINCT (nr_zona, cd_municipio, ano)) as total FROM tse_eleitorado",
        // Table sizes
        "SELECT tablename, pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'tse_%' ORDER BY pg_total_relation_size('public.' || tablename) DESC",
      ];

      const results: Record<string, any> = {};
      for (const sql of queries) {
        const r = await client.queryObject(sql);
        const key = sql.substring(0, 60);
        results[key] = r.rows;
      }

      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    await client.end();
  }
});
