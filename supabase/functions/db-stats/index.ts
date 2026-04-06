const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) return new Response(JSON.stringify({ error: "no db url" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
  const client = new Client(dbUrl);
  await client.connect();

  try {
    const results: Record<string, any> = {};

    for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
      const r = await client.queryArray(`SELECT count(*)::int FROM ${t}`);
      results[`total_${t}`] = r.rows[0][0];
    }

    for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
      const r = await client.queryArray(`SELECT ano::int, count(*)::int FROM ${t} GROUP BY ano ORDER BY ano`);
      results[`${t}_por_ano`] = r.rows.map((row: any) => ({ ano: row[0], total: row[1] }));
    }

    const nv = await client.queryArray(`SELECT COALESCE(ds_cargo,'NULL'), count(*)::int FROM tse_candidatos WHERE ds_cargo != 'VEREADOR' OR ds_cargo IS NULL GROUP BY ds_cargo ORDER BY count(*) DESC`);
    results["nao_vereador"] = nv.rows.map((r: any) => ({ cargo: r[0], total: r[1] }));

    const ed = await client.queryArray(`SELECT count(*)::int, count(DISTINCT (nr_zona, cd_municipio, ano))::int FROM tse_eleitorado`);
    results["eleitorado_rows_vs_zones"] = { total_rows: ed.rows[0][0], distinct_zones: ed.rows[0][1] };

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    await client.end();
  }
});
