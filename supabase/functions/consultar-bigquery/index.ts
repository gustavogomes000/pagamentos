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
      ? `AND (UPPER(c.NM_CANDIDATO) LIKE UPPER('%${p.nome.replace(/'/g, "")}%') OR UPPER(c.NM_URNA_CANDIDATO) LIKE UPPER('%${p.nome.replace(/'/g, "")}%'))`
      : "";
    const municipioFilter = p.municipio
      ? `AND UPPER(c.NM_UE) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')`
      : "";
    const municipiosFilter = p.municipios
      ? `AND UPPER(c.NM_UE) IN (${p.municipios.split(",").map(m => `UPPER('${m.trim().replace(/'/g, "")}')`).join(",")})`
      : "";

    return `
      SELECT 
        c.NM_CANDIDATO, c.NM_URNA_CANDIDATO, c.NR_CANDIDATO, c.SG_PARTIDO,
        c.DS_CARGO, c.NM_UE, c.DS_SIT_TOT_TURNO, c.NR_TURNO,
        c.SQ_CANDIDATO,
        COALESCE(v.total_votos, 0) as TOTAL_VOTOS
      FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_${ano}\` c
      LEFT JOIN (
        SELECT NR_VOTAVEL, NM_MUNICIPIO, SUM(CAST(QT_VOTOS AS INT64)) as total_votos
        FROM \`silver-idea-389314.eleicoes_go_clean.raw_votacao_munzona_${ano}\`
        GROUP BY NR_VOTAVEL, NM_MUNICIPIO
      ) v ON c.NR_CANDIDATO = v.NR_VOTAVEL AND UPPER(c.NM_UE) = UPPER(v.NM_MUNICIPIO)
      WHERE c.DS_CARGO = 'VEREADOR'
      ${nomeFilter}
      ${municipioFilter}
      ${municipiosFilter}
      ORDER BY COALESCE(v.total_votos, 0) DESC
      LIMIT ${p.limit || "50"}
    `;
  },

  candidatos_2024: (p) => `
    SELECT NM_CANDIDATO, NM_URNA_CANDIDATO, NR_CANDIDATO, SG_PARTIDO, 
           DS_CARGO, NM_UE, DS_SIT_TOT_TURNO, NR_TURNO
    FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_2024\`
    WHERE DS_CARGO = 'VEREADOR'
    ${p.municipio ? `AND UPPER(NM_UE) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')` : ""}
    ${p.nome ? `AND UPPER(NM_CANDIDATO) LIKE UPPER('%${p.nome.replace(/'/g, "")}%')` : ""}
    ORDER BY NM_CANDIDATO
    LIMIT ${p.limit || "100"}
  `,

  votacao_2024: (p) => `
    SELECT NM_VOTAVEL, NR_VOTAVEL, QT_VOTOS, NM_MUNICIPIO, NR_ZONA, NR_TURNO
    FROM \`silver-idea-389314.eleicoes_go_clean.raw_votacao_munzona_2024\`
    WHERE 1=1
    ${p.municipio ? `AND UPPER(NM_MUNICIPIO) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')` : ""}
    ${p.nome ? `AND UPPER(NM_VOTAVEL) LIKE UPPER('%${p.nome.replace(/'/g, "")}%')` : ""}
    ${p.numero ? `AND NR_VOTAVEL = '${p.numero.replace(/'/g, "")}'` : ""}
    ORDER BY CAST(QT_VOTOS AS INT64) DESC
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
    SELECT NM_CANDIDATO, NM_URNA_CANDIDATO, NR_CANDIDATO, SG_PARTIDO,
           DS_CARGO, NM_UE, DS_SIT_TOT_TURNO
    FROM \`silver-idea-389314.eleicoes_go_clean.raw_candidatos_${p.ano || "2024"}\`
    WHERE DS_CARGO = 'VEREADOR'
    ${p.municipio ? `AND UPPER(NM_UE) LIKE UPPER('%${p.municipio.replace(/'/g, "")}%')` : ""}
    ${p.nome ? `AND UPPER(NM_CANDIDATO) LIKE UPPER('%${p.nome.replace(/'/g, "")}%')` : ""}
    ORDER BY NM_CANDIDATO
    LIMIT ${p.limit || "100"}
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
