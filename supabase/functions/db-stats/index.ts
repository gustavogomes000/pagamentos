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

    // Counts per table
    for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
      const r = await client.queryObject(`SELECT count(*) as total FROM ${t}`);
      results[`total_${t}`] = r.rows[0];
    }

    // By year
    for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
      const r = await client.queryObject(`SELECT ano, count(*) as total FROM ${t} GROUP BY ano ORDER BY ano`);
      results[`${t}_por_ano`] = r.rows;
    }

    // Non-vereador
    const nv = await client.queryObject(`SELECT ds_cargo, count(*) as total FROM tse_candidatos WHERE ds_cargo != 'VEREADOR' OR ds_cargo IS NULL GROUP BY ds_cargo ORDER BY count(*) DESC`);
    results["nao_vereador"] = nv.rows;

    // Votacao for non-vereador candidates
    const nvVot = await client.queryObject(`
      SELECT count(*) as total FROM tse_votacao v 
      WHERE NOT EXISTS (SELECT 1 FROM tse_candidatos c WHERE c.nr_candidato = v.nr_candidato AND c.ano = v.ano AND c.ds_cargo = 'VEREADOR')
      AND v.ano IN (2020, 2022, 2024)
    `);
    results["votacao_nao_vereador"] = nvVot.rows[0];

    // Eleitorado distinct zones
    const ed = await client.queryObject(`SELECT count(*) as total_rows, count(DISTINCT (nr_zona, cd_municipio, ano)) as distinct_zones FROM tse_eleitorado`);
    results["eleitorado_stats"] = ed.rows[0];

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    await client.end();
  }
});
