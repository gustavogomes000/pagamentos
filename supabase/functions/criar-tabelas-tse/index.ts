import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supaUrl = Deno.env.get("SUPA_URL") || Deno.env.get("SUPABASE_URL")!;
    const supaKey = Deno.env.get("SUPA_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Use the REST API to execute SQL via PostgREST rpc
    const resp = await fetch(`${supaUrl}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "apikey": supaKey,
        "Authorization": `Bearer ${supaKey}`,
        "Content-Type": "application/json",
      },
    });

    // Direct SQL execution via Supabase Management API
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    
    if (!dbUrl) {
      // Fallback: create tables using individual CREATE statements via fetch to Supabase SQL endpoint
      const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS public.tse_candidatos (
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
        )`,
        `CREATE TABLE IF NOT EXISTS public.tse_votacao (
          id bigserial PRIMARY KEY,
          ano smallint NOT NULL,
          nr_candidato text NOT NULL,
          nm_candidato text,
          nm_municipio text,
          cd_municipio text,
          nr_zona text,
          qt_votos_nominais integer DEFAULT 0,
          nr_turno smallint DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS public.tse_eleitorado (
          id bigserial PRIMARY KEY,
          ano smallint NOT NULL,
          cd_municipio text,
          nr_zona text,
          nm_bairro text,
          qt_eleitor_secao integer DEFAULT 0
        )`,
      ];

      return new Response(JSON.stringify({ 
        error: "SUPABASE_DB_URL não configurado. Precisa criar as tabelas via migration.",
        tables_needed: ["tse_candidatos", "tse_votacao", "tse_eleitorado"],
        sql: sqlStatements,
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
