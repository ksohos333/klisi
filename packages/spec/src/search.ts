import type { LanguageConfig, SearchConfig } from "@klisi/schema";

/**
 * Reference implementation of packages/spec/search.md.
 *
 * This is the conformance target: the Kotlin and Go implementations must
 * reproduce these results exactly for the shared golden vectors. It performs no
 * I/O and no network access.
 */

export interface IndexEntry {
  lemmaId: string;
  lang: string;
  surface: string;
  romanization?: string | null;
  ipa?: string | null;
}

export interface SearchHit {
  lemmaId: string;
  surface: string;
  stage: number;
  score: number;
}

interface Prepared {
  entry: IndexEntry;
  normalized: string;
  folded: string;
  romanization: string | null;
  ipa: string | null;
}

const LATIN = /^[\p{Script=Latin}\s.'-]+$/u;

/** Rule 2: identical normalization on index entries and on queries. */
export function normalize(s: string, cfg: SearchConfig): string {
  let out = s.normalize("NFC").toLowerCase();
  if (cfg.finalSigmaFold) out = out.replace(/ς/g, "σ");
  if (cfg.stripCombining) {
    out = out.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
  }
  return out;
}

/** Stage 3: ordered, global, left-to-right digraph folds. */
export function fold(s: string, cfg: SearchConfig): string {
  let out = s;
  for (const [from, to] of cfg.folds) {
    if (from.length === 0) continue;
    out = out.split(from).join(to);
  }
  return out;
}

function trigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + 3 <= s.length; i++) set.add(s.slice(i, i + 3));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Greedy longest-match transliteration used by stage 4(b). */
export function transliterate(query: string, map: Record<string, string>): string | null {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return null;
  const q = query.toLowerCase();
  let out = "";
  let i = 0;
  while (i < q.length) {
    let matched = false;
    for (const k of keys) {
      if (q.startsWith(k, i)) {
        out += map[k] ?? "";
        i += k.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Unmapped Latin characters make the query unusable for this stage.
      if (/[a-z]/.test(q[i] ?? "")) return null;
      out += q[i];
      i++;
    }
  }
  return out;
}

export class SearchIndex {
  private byLang = new Map<string, Prepared[]>();
  /**
   * Trigram sets are computed lazily and cached. A full pack has ~200k surfaces;
   * precomputing all of them would cost real memory on a phone, and stage 6 only
   * runs when every exact-index stage has already failed.
   */
  private trigramCache = new Map<string, Set<string>>();

  private gramsOf(normalized: string): Set<string> {
    let g = this.trigramCache.get(normalized);
    if (!g) {
      g = trigrams(normalized);
      this.trigramCache.set(normalized, g);
    }
    return g;
  }

  constructor(entries: IndexEntry[], private configs: Record<string, LanguageConfig>) {
    for (const entry of entries) {
      const cfg = configs[entry.lang];
      if (!cfg) continue;
      const normalized = normalize(entry.surface, cfg.search);
      const prepared: Prepared = {
        entry,
        normalized,
        folded: fold(normalized, cfg.search),
        romanization: entry.romanization
          ? normalize(entry.romanization, cfg.search)
          : null,
        ipa: entry.ipa ? normalize(entry.ipa, cfg.search) : null,
      };
      const list = this.byLang.get(entry.lang) ?? [];
      list.push(prepared);
      this.byLang.set(entry.lang, list);
    }
  }

  search(lang: string, query: string): SearchHit[] {
    const cfg = this.configs[lang];
    const entries = this.byLang.get(lang);
    if (!cfg || !entries) return [];

    const q = query.trim();
    if (q.length === 0) return [];
    const nq = normalize(q, cfg.search);
    const fq = fold(nq, cfg.search);

    const hit = (p: Prepared, stage: number, score = 1): SearchHit => ({
      lemmaId: p.entry.lemmaId,
      surface: p.entry.surface,
      stage,
      score,
    });

    // Stages 1 and 2 form one canonical-match stage: "find this word, ignoring
    // case and accent". Exact matches rank first, but an exact match on one
    // spelling must not hide the accented spelling of a different lemma.
    const exact = entries.filter((p) => p.entry.surface === q).map((p) => hit(p, 1));
    const normalized = entries.filter((p) => p.normalized === nq).map((p) => hit(p, 2));
    if (exact.length || normalized.length) {
      return dedupe([...exact, ...normalized]);
    }

    let hits: SearchHit[];

    // Stage 3 — phonetic fold (heard-spelling confusions).
    if (cfg.search.folds.length > 0) {
      hits = entries.filter((p) => p.folded === fq).map((p) => hit(p, 3));
      if (hits.length) return hits;
    }

    // Stage 4 — romanization, in either direction.
    const romanizationHits: SearchHit[] = [];
    for (const p of entries) {
      if (p.romanization && p.romanization === nq) romanizationHits.push(hit(p, 4));
    }
    if (LATIN.test(q)) {
      const native = transliterate(q, cfg.search.romanization);
      if (native) {
        const target = fold(normalize(native, cfg.search), cfg.search);
        for (const p of entries) {
          if (p.folded === target) romanizationHits.push(hit(p, 4));
        }
      }
    }
    if (romanizationHits.length) return dedupe(romanizationHits);

    // Stage 5 — IPA.
    hits = entries.filter((p) => p.ipa !== null && p.ipa === nq).map((p) => hit(p, 5));
    if (hits.length) return hits;

    // Stage 6 — trigram fuzzy, only for queries of 3+ characters.
    if (nq.length >= 3) {
      const qg = this.gramsOf(nq);
      const scored: SearchHit[] = [];
      for (const p of entries) {
        const score = jaccard(qg, this.gramsOf(p.normalized));
        if (score >= 0.5) scored.push(hit(p, 6, score));
      }
      if (scored.length) {
        return scored.sort(
          (a, b) =>
            b.score - a.score ||
            a.surface.length - b.surface.length ||
            a.surface.localeCompare(b.surface),
        );
      }
    }

    // Stage 7 — prefix fallback (search-as-you-type).
    if (nq.length >= 2) {
      const prefixHits = entries
        .filter((p) => p.normalized.startsWith(nq))
        .map((p) => hit(p, 7))
        .sort(
          (a, b) =>
            a.surface.length - b.surface.length || a.surface.localeCompare(b.surface),
        );
      if (prefixHits.length) return prefixHits;
    }

    return [];
  }
}

function dedupe(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.lemmaId}::${h.surface}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}
