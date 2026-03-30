import { supabase } from "@/integrations/supabase/client";
import { namesMatch, normalize } from "@/lib/validateVotes";

type CandidateTse = {
  id: number;
  nome: string;
  nomeUrna: string;
  codigoMunicipio: string;
  partido?: string;
};

/**
 * Fuzzy match for ballot names (nomes de urna) that may have slight
 * character differences, e.g. "JOANA DARK" vs "JOANA DARC".
 */
function fuzzyNamesMatch(dbName: string, tseName: string, tseNomeUrna: string): boolean {
  if (namesMatch(dbName, tseName) || namesMatch(dbName, tseNomeUrna)) return true;

  const a = normalize(dbName);
  const b = normalize(tseNomeUrna);
  if (!a || !b) return false;

  // Check if names are very similar (allow 1-2 char difference)
  if (Math.abs(a.length - b.length) <= 2) {
    let diffs = 0;
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      if (a[i] !== b[i]) diffs++;
      if (diffs > 2) break;
    }
    if (diffs <= 2) return true;
  }

  return false;
}

export type RequiredDataValidationResult = {
  id: string;
  nome: string;
  partidoAntes: string;
  partidoDepois: string;
  votosAntes: number;
  votosDepois: number;
  updated: boolean;
};

const MAX_CONCURRENCY = 5;

function isMissingParty(partido: unknown): boolean {
  return !String(partido || "").trim();
}

function isMissingVotes(votos: unknown): boolean {
  return !Number(votos) || Number(votos) <= 0;
}

export async function validateRequiredData(
  onProgress?: (current: number, total: number, nome: string) => void
): Promise<RequiredDataValidationResult[]> {
  const { data: suplentes, error } = await supabase
    .from("suplentes")
    .select("id, nome, partido, total_votos")
    .order("nome");

  if (error || !suplentes) throw new Error(error?.message || "Erro ao carregar suplentes");

  let votosMap: Record<string, number> = {};
  try {
    const resp = await fetch("/tse-votos-go-2024.json", { cache: "force-cache" });
    if (resp.ok) votosMap = await resp.json();
  } catch {
    votosMap = {};
  }

  const pending = suplentes.filter((s) => isMissingParty(s.partido) || isMissingVotes(s.total_votos));
  if (!pending.length) return [];

  const results: RequiredDataValidationResult[] = [];
  let progress = 0;

  const worker = async (s: (typeof pending)[number]) => {
    progress += 1;
    onProgress?.(progress, pending.length, s.nome);

    try {
      // Try full name, first+last, and first name only for broader matching
      const nameParts = s.nome.trim().split(/\s+/);
      const searchTerms = [
        s.nome.trim(),
        nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}` : "",
        nameParts[0],
      ].filter((t) => t.length >= 3);

      // Deduplicate search terms
      const uniqueTerms = [...new Set(searchTerms)];
      let bestMatch: CandidateTse | null = null;

      for (const term of uniqueTerms) {
        if (bestMatch) break;
        const { data, error: fnError } = await supabase.functions.invoke("buscar-candidato-tse", {
          body: { nome: term, ano: 2024 },
        });
        if (fnError || !data?.resultados) continue;

        const candidatos = data.resultados as CandidateTse[];
        bestMatch =
          candidatos.find((c) => fuzzyNamesMatch(s.nome, c.nome, c.nomeUrna)) || null;
      }
      if (!bestMatch) return;

      const votosNovo = votosMap[`${bestMatch.codigoMunicipio}:${bestMatch.id}`] || 0;
      const payload: Record<string, string | number> = {};

      if (isMissingParty(s.partido) && String(bestMatch.partido || "").trim()) {
        payload.partido = String(bestMatch.partido).trim();
      }
      if (isMissingVotes(s.total_votos) && votosNovo > 0) {
        payload.total_votos = votosNovo;
      }
      if (!Object.keys(payload).length) return;

      const { error: updateError } = await supabase.from("suplentes").update(payload).eq("id", s.id);
      results.push({
        id: s.id,
        nome: s.nome,
        partidoAntes: String(s.partido || ""),
        partidoDepois: String(payload.partido ?? s.partido ?? ""),
        votosAntes: Number(s.total_votos || 0),
        votosDepois: Number(payload.total_votos ?? s.total_votos ?? 0),
        updated: !updateError,
      });
    } catch {
      // Continua para os próximos registros
    }
  };

  for (let i = 0; i < pending.length; i += MAX_CONCURRENCY) {
    const chunk = pending.slice(i, i + MAX_CONCURRENCY);
    await Promise.all(chunk.map(worker));
  }

  return results;
}
