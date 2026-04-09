import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: sups } = await supabase.from("suplentes").select("id, nome, created_at, retirada_mensal_meses, retirada_mensal_valor").order("nome").limit(100);

  const report = (sups || []).map(s => {
    const dt = new Date(s.created_at);
    const mesCad = dt.getMonth() + 1;
    const mesesCorreto = Math.max(1, 10 - mesCad);
    const mesInicio = mesCad;
    const mesFim = mesCad + (s.retirada_mensal_meses || 0) - 1;
    const mesFimCorreto = mesCad + mesesCorreto - 1;
    return {
      nome: s.nome,
      mesCad,
      mesesAtual: s.retirada_mensal_meses,
      ultimoMesAtual: mesFim,
      mesesCorreto,
      ultimoMesCorreto: mesFimCorreto,
      precisaFix: s.retirada_mensal_meses !== mesesCorreto
    };
  });

  const needsFix = report.filter(r => r.precisaFix);

  return new Response(JSON.stringify({ total: report.length, needsFix: needsFix.length, sample: report.slice(0, 20), fixes: needsFix }, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
});
