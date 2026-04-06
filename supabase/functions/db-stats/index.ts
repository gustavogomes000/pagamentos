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
    const body = await req.json().catch(() => ({}));
    const action = body.action || "stats";

    if (action === "stats") {
      const results: Record<string, any> = {};
      for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
        const r = await client.queryArray(`SELECT count(*)::int FROM ${t}`);
        results[`total_${t}`] = r.rows[0][0];
      }
      for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
        const r = await client.queryArray(`SELECT ano::int, count(*)::int FROM ${t} GROUP BY ano ORDER BY ano`);
        results[`${t}_por_ano`] = r.rows.map((row: any) => ({ ano: row[0], total: row[1] }));
      }
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_2016") {
      const r1 = await client.queryArray(`DELETE FROM tse_candidatos WHERE ano = 2016`);
      const r2 = await client.queryArray(`DELETE FROM tse_votacao WHERE ano = 2016`);
      return new Response(JSON.stringify({
        deleted_candidatos: r1.rowCount,
        deleted_votacao: r2.rowCount,
        message: "Ano 2016 removido com sucesso"
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "vacuum") {
      // VACUUM FULL requires exclusive lock, run on each table
      for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
        await client.queryArray(`VACUUM FULL ${t}`);
      }
      // Reindex
      for (const t of ["tse_candidatos", "tse_votacao", "tse_eleitorado"]) {
        await client.queryArray(`REINDEX TABLE ${t}`);
      }
      return new Response(JSON.stringify({ message: "VACUUM FULL + REINDEX concluídos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action inválida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } finally {
    await client.end();
  }
});
