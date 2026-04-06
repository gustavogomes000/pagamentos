import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BIGQUERY_API = "https://bigquery.googleapis.com/bigquery/v2";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
  project_id: string;
}

async function createJWT(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const headerB64 = enc(header);
  const payloadB64 = enc(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const pemContent = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${signingInput}.${sigB64}`;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createJWT(sa);
  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) throw new Error(`Token error: ${resp.status} - ${await resp.text()}`);
  return (await resp.json()).access_token;
}

async function queryBQ(token: string, projectId: string, sql: string, location = "US"): Promise<any[]> {
  const url = `${BIGQUERY_API}/projects/${projectId}/queries`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 50000, location }),
  });
  if (!resp.ok) throw new Error(`BQ error: ${resp.status} - ${await resp.text()}`);
  const data = await resp.json();
  if (!data.rows || !data.schema?.fields) return [];
  const fields = data.schema.fields.map((f: any) => f.name);
  return data.rows.map((row: any) => {
    const obj: Record<string, string> = {};
    row.f.forEach((cell: any, i: number) => { obj[fields[i]] = cell.v; });
    return obj;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { ano, tabela, location } = await req.json();
    if (!ano || !tabela) {
      return new Response(JSON.stringify({ error: "ano e tabela são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientEmail = Deno.env.get("BIGQUERY_CLIENT_EMAIL")!;
    const privateKey = Deno.env.get("BIGQUERY_PRIVATE_KEY")!;
    const projectId = Deno.env.get("BIGQUERY_PROJECT_ID")!;
    const supaUrl = Deno.env.get("SUPA_URL") || Deno.env.get("SUPABASE_URL")!;
    const supaKey = Deno.env.get("SUPA_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const sa: ServiceAccount = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
      token_uri: "https://oauth2.googleapis.com/token",
      project_id: projectId,
    };

    const token = await getAccessToken(sa);
    const supabase = createClient(supaUrl, supaKey);
    const loc = location || "US";
    let inserted = 0;

    if (tabela === "candidatos") {
      const sql = `
        SELECT sq_candidato, nm_candidato, nm_urna_candidato, nr_candidato, 
               sg_partido, ds_cargo, nm_ue, sg_ue, ds_sit_tot_turno, nr_turno
        FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_${ano}\`
        WHERE ds_cargo = 'VEREADOR'
      `;
      const rows = await queryBQ(token, projectId, sql, loc);
      
      // Insert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500).map(r => ({
          ano: parseInt(ano),
          sq_candidato: r.sq_candidato,
          nm_candidato: r.nm_candidato,
          nm_urna_candidato: r.nm_urna_candidato,
          nr_candidato: r.nr_candidato,
          sg_partido: r.sg_partido,
          ds_cargo: r.ds_cargo,
          nm_ue: r.nm_ue,
          sg_ue: r.sg_ue,
          ds_sit_tot_turno: r.ds_sit_tot_turno,
          nr_turno: parseInt(r.nr_turno || "1"),
        }));
        const { error } = await supabase.from("tse_candidatos").insert(batch);
        if (error) throw new Error(`Insert candidatos: ${error.message}`);
        inserted += batch.length;
      }
    } else if (tabela === "votacao") {
      const sql = `
        SELECT nr_candidato, nm_candidato, nm_municipio, cd_municipio, nr_zona, 
               qt_votos_nominais, nr_turno
        FROM \`silver-idea-389314.eleicoes_go_clean.raw_votacao_munzona_${ano}\`
      `;
      const rows = await queryBQ(token, projectId, sql, loc);
      
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500).map(r => ({
          ano: parseInt(ano),
          nr_candidato: r.nr_candidato,
          nm_candidato: r.nm_candidato,
          nm_municipio: r.nm_municipio,
          cd_municipio: r.cd_municipio,
          nr_zona: r.nr_zona,
          qt_votos_nominais: parseInt(r.qt_votos_nominais || "0"),
          nr_turno: parseInt(r.nr_turno || "1"),
        }));
        const { error } = await supabase.from("tse_votacao").insert(batch);
        if (error) throw new Error(`Insert votacao: ${error.message}`);
        inserted += batch.length;
      }
    } else if (tabela === "eleitorado") {
      if (parseInt(ano) < 2020) {
        return new Response(JSON.stringify({ ok: true, msg: `Eleitorado não disponível para ${ano}`, inserted: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sql = `
        SELECT cd_municipio, nr_zona, nm_bairro, 
               SUM(SAFE_CAST(qt_eleitor_secao AS INT64)) as qt_eleitor_secao
        FROM \`silver-idea-389314.eleicoes_go_clean.raw_eleitorado_local_${ano}\`
        WHERE nm_bairro IS NOT NULL AND nm_bairro != '#NULO#' AND nm_bairro != '#NE#' AND nm_bairro != ''
        GROUP BY cd_municipio, nr_zona, nm_bairro
      `;
      const rows = await queryBQ(token, projectId, sql, loc);
      
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500).map(r => ({
          ano: parseInt(ano),
          cd_municipio: r.cd_municipio,
          nr_zona: r.nr_zona,
          nm_bairro: r.nm_bairro,
          qt_eleitor_secao: parseInt(r.qt_eleitor_secao || "0"),
        }));
        const { error } = await supabase.from("tse_eleitorado").insert(batch);
        if (error) throw new Error(`Insert eleitorado: ${error.message}`);
        inserted += batch.length;
      }
    } else {
      return new Response(JSON.stringify({ error: "tabela deve ser: candidatos, votacao ou eleitorado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ano, tabela, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Import error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
