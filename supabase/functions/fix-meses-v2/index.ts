import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: string[] = [];

  // Fix suplentes: meses = max(1, 10 - mes_cadastro), last payment = September
  const { data: sups, error: e1 } = await supabase.from("suplentes").select("id, nome, created_at, retirada_mensal_valor, retirada_mensal_meses, plotagem_qtd, plotagem_valor_unit, liderancas_qtd, liderancas_valor_unit, fiscais_qtd, fiscais_valor_unit");
  if (e1) return new Response(JSON.stringify({ error: e1.message }), { status: 500 });

  for (const s of sups || []) {
    const dt = new Date(s.created_at);
    const mesCad = dt.getMonth() + 1;
    const mesesCorreto = Math.max(1, 10 - mesCad);
    const retirada = (s.retirada_mensal_valor || 0) * mesesCorreto;
    const plotagem = (s.plotagem_qtd || 0) * (s.plotagem_valor_unit || 0);
    const liderancas = (s.liderancas_qtd || 0) * (s.liderancas_valor_unit || 0);
    const fiscais = (s.fiscais_qtd || 0) * (s.fiscais_valor_unit || 0);
    const total = retirada + plotagem + liderancas + fiscais;

    if (s.retirada_mensal_meses !== mesesCorreto) {
      const { error } = await supabase.from("suplentes").update({
        retirada_mensal_meses: mesesCorreto,
        total_campanha: total
      }).eq("id", s.id);
      results.push(`SUP ${s.nome}: ${s.retirada_mensal_meses} → ${mesesCorreto} meses (cad mês ${mesCad}) total=${total} ${error ? "ERRO: " + error.message : "OK"}`);
    }
  }

  // Fix liderancas: meses = max(1, 10 - mes_cadastro)
  const { data: lids, error: e2 } = await supabase.from("liderancas").select("id, nome, created_at, retirada_mensal_meses");
  if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500 });

  for (const l of lids || []) {
    const dt = new Date(l.created_at);
    const mesCad = dt.getMonth() + 1;
    const mesesCorreto = Math.max(1, 10 - mesCad);

    if (l.retirada_mensal_meses !== mesesCorreto) {
      const { error } = await supabase.from("liderancas").update({
        retirada_mensal_meses: mesesCorreto
      }).eq("id", l.id);
      results.push(`LID ${l.nome}: ${l.retirada_mensal_meses} → ${mesesCorreto} meses (cad mês ${mesCad}) ${error ? "ERRO: " + error.message : "OK"}`);
    }
  }

  return new Response(JSON.stringify({ updated: results.length, results }), {
    headers: { "Content-Type": "application/json" }
  });
});
