const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BIGQUERY_API = "https://bigquery.googleapis.com/bigquery/v2";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
  project_id: string;
}

/**
 * Creates a JWT for Google Service Account authentication
 */
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

  // Import the private key
  const pemContent = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");

  const binaryDer = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${sigB64}`;
}

/**
 * Gets an access token from Google OAuth2
 */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await createJWT(sa);

  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Failed to get access token: ${resp.status} - ${err}`);
  }

  const data = await resp.json();
  return data.access_token;
}

/**
 * Runs a BigQuery SQL query
 */
async function queryBigQuery(
  accessToken: string,
  projectId: string,
  sql: string,
  location = "southamerica-east1"
): Promise<unknown> {
  const url = `${BIGQUERY_API}/projects/${projectId}/queries`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      maxResults: 1000,
      location,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`BigQuery query failed: ${resp.status} - ${err}`);
  }

  return await resp.json();
}

/**
 * Transforms BigQuery response into a simple array of objects
 */
function transformResponse(bqResponse: any): Record<string, string>[] {
  if (!bqResponse.rows || !bqResponse.schema?.fields) return [];

  const fields = bqResponse.schema.fields.map((f: any) => f.name);

  return bqResponse.rows.map((row: any) => {
    const obj: Record<string, string> = {};
    row.f.forEach((cell: any, i: number) => {
      obj[fields[i]] = cell.v;
    });
    return obj;
  });
}

// Allowed queries - whitelist approach for security
const ALLOWED_QUERIES: Record<string, (params: Record<string, string>) => string> = {
  // Busca principal: candidatos com votos agregados
  buscar_candidatos: (p) => {
    const ano = p.ano || "2024";
    const nomeFilter = p.nome
      ? `AND (UPPER(c.nm_candidato) LIKE UPPER('%${p.nome.replace(/'/g, "")}%') OR UPPER(c.nm_urna_candidato) LIKE UPPER('%${p.nome.replace(/'/g, "")}%'))`
      : "";
    const municipioFilter = p.municipio
      ? `AND UPPER(c.nm_ue) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')`
      : "";
    const municipiosFilter = p.municipios
      ? `AND UPPER(c.nm_ue) IN (${p.municipios.split(",").map(m => `UPPER('${m.trim().replace(/'/g, "")}')`).join(",")})`
      : "";

    // Use eleitorado_local for 2020+ or comparecimento_secao for older years
    const localTable = parseInt(ano) >= 2020
      ? `\`silver-idea-389314.eleicoes_go_clean.raw_eleitorado_local_${ano}\``
      : `\`silver-idea-389314.eleicoes_go_clean.raw_comparecimento_secao_${ano}\``;

    return `
      SELECT 
        c.nm_candidato, c.nm_urna_candidato, c.nr_candidato, c.sg_partido,
        c.ds_cargo, c.nm_ue, c.ds_sit_tot_turno, c.nr_turno,
        c.sq_candidato, c.nr_zona,
        COALESCE(v.total_votos, 0) as total_votos,
        l.bairros_zona
      FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_${ano}\` c
      LEFT JOIN (
        SELECT nr_candidato, nm_municipio, SUM(CAST(qt_votos_nominais AS INT64)) as total_votos
        FROM \`silver-idea-389314.eleicoes_go_clean.raw_votacao_munzona_${ano}\`
        GROUP BY nr_candidato, nm_municipio
      ) v ON c.nr_candidato = v.nr_candidato AND UPPER(c.nm_ue) = UPPER(v.nm_municipio)
      LEFT JOIN (
        SELECT nr_zona, cd_municipio, 
               STRING_AGG(DISTINCT nm_bairro, ', ' ORDER BY nm_bairro) as bairros_zona
        FROM ${localTable}
        WHERE nm_bairro IS NOT NULL AND nm_bairro != '#NULO#' AND nm_bairro != '#NE#'
        GROUP BY nr_zona, cd_municipio
      ) l ON SAFE_CAST(c.nr_zona AS INT64) = SAFE_CAST(l.nr_zona AS INT64) 
         AND SAFE_CAST(c.cd_municipio AS INT64) = SAFE_CAST(l.cd_municipio AS INT64)
      WHERE c.ds_cargo = 'VEREADOR'
      ${nomeFilter}
      ${municipioFilter}
      ${municipiosFilter}
      ORDER BY COALESCE(v.total_votos, 0) DESC
      LIMIT ${p.limit || "50"}
    `;
  },

  candidatos_2024: (p) => `
    SELECT nm_candidato, nm_urna_candidato, nr_candidato, sg_partido, 
           ds_cargo, nm_ue, ds_sit_tot_turno, nr_turno
    FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_2024\`
    WHERE ds_cargo = 'VEREADOR'
    ${p.municipio ? `AND UPPER(nm_ue) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')` : ""}
    ${p.nome ? `AND UPPER(nm_candidato) LIKE UPPER('%${p.nome.replace(/'/g, "")}%')` : ""}
    ORDER BY nm_candidato
    LIMIT ${p.limit || "100"}
  `,

  votacao_2024: (p) => `
    SELECT nm_candidato, nr_candidato, qt_votos_nominais, nm_municipio, nr_zona, nr_turno
    FROM \`silver-idea-389314.eleicoes_go_clean.raw_votacao_munzona_2024\`
    WHERE 1=1
    ${p.municipio ? `AND UPPER(nm_municipio) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')` : ""}
    ${p.nome ? `AND UPPER(nm_candidato) LIKE UPPER('%${p.nome.replace(/'/g, "")}%')` : ""}
    ${p.numero ? `AND nr_candidato = '${p.numero.replace(/'/g, "")}'` : ""}
    ORDER BY CAST(qt_votos_nominais AS INT64) DESC
    LIMIT ${p.limit || "100"}
  `,

  listar_datasets: () => `
    SELECT schema_name 
    FROM \`silver-idea-389314.INFORMATION_SCHEMA.SCHEMATA\`
    ORDER BY schema_name
  `,

  listar_tabelas: (p) => `
    SELECT table_name
    FROM \`silver-idea-389314.${p.dataset || "eleicoes_go_clean"}.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `,

  candidatos_historico: (p) => `
    SELECT nm_candidato, nm_urna_candidato, nr_candidato, sg_partido,
           ds_cargo, nm_ue, ds_sit_tot_turno
    FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_${p.ano || "2024"}\`
    WHERE ds_cargo = 'VEREADOR'
    ${p.municipio ? `AND UPPER(nm_ue) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')` : ""}
    ${p.nome ? `AND UPPER(nm_candidato) LIKE UPPER('%${p.nome.replace(/'/g, "")}%')` : ""}
    ORDER BY nm_candidato
    LIMIT ${p.limit || "100"}
  `,

  colunas_tabela: (p) => `
    SELECT column_name
    FROM \`silver-idea-389314.${p.dataset || "eleicoes_go_clean"}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${(p.tabela || "").replace(/'/g, "")}'
    ORDER BY ordinal_position
  `,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Body JSON inválido", detail: String(e) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { consulta, params = {} } = body;

    const clientEmail = Deno.env.get("BIGQUERY_CLIENT_EMAIL");
    const privateKey = Deno.env.get("BIGQUERY_PRIVATE_KEY");
    const projectId = Deno.env.get("BIGQUERY_PROJECT_ID");

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error("BigQuery credentials not configured. Need BIGQUERY_CLIENT_EMAIL, BIGQUERY_PRIVATE_KEY, BIGQUERY_PROJECT_ID");
    }

    const sa: ServiceAccount = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
      token_uri: "https://oauth2.googleapis.com/token",
      project_id: projectId,
    };

    if (!consulta || !ALLOWED_QUERIES[consulta]) {
      return new Response(
        JSON.stringify({
          error: "Consulta inválida",
          consultas_disponiveis: Object.keys(ALLOWED_QUERIES),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sql = ALLOWED_QUERIES[consulta](params);
    const accessToken = await getAccessToken(sa);
    const location = params.location || "US";
    const bqResponse = await queryBigQuery(accessToken, sa.project_id, sql, location);
    const rows = transformResponse(bqResponse);

    return new Response(
      JSON.stringify({
        consulta,
        total: rows.length,
        dados: rows,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("BigQuery error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
