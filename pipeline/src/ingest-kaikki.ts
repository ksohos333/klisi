import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type { ParsedCorpus } from "./unimorph.js";
import { parseKaikkiEntry, type KaikkiEntry } from "./kaikki.js";
import { featureKey } from "./features.js";

/**
 * Parts of speech that carry a paradigm. Everything else is still emitted as a
 * dictionary entry with an empty paradigm, so high-frequency function words do
 * not look "absent" from the pack.
 */
const PARADIGM_POS = new Set(["verb", "noun", "adj", "name", "pron", "article", "det", "num"]);

export interface KaikkiIngestStats {
  lines: number;
  entries: number;
  skippedPos: number;
  skippedForms: number;
  duplicateIds: number;
}

/**
 * Stream a kaikki JSONL dump. The Greek file is ~220 MB and the English one is
 * ~3.2 GB, so this must never buffer the whole file.
 */
export async function ingestKaikki(
  filePath: string,
  lang: string,
  sourceName: string,
): Promise<{ corpus: ParsedCorpus; stats: KaikkiIngestStats }> {
  const corpus: ParsedCorpus = { lexemes: [], paradigms: [], forms: [], skipped: 0 };
  const stats: KaikkiIngestStats = {
    lines: 0,
    entries: 0,
    /** Entries kept as dictionary-only records (no paradigm). */
    skippedPos: 0,
    skippedForms: 0,
    duplicateIds: 0,
  };
  const seen = new Map<string, number>();

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    stats.lines++;
    let entry: KaikkiEntry;
    try {
      entry = JSON.parse(line) as KaikkiEntry;
    } catch {
      corpus.skipped++;
      continue;
    }
    if (entry.lang_code !== lang) continue;
    if (!PARADIGM_POS.has(entry.pos)) stats.skippedPos++;

    const base = `${lang}:${entry.pos}:${entry.word}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    // Homographs share a lemma+pos. Suffix deterministically in file order.
    const lemmaId = count === 1 ? base : `${base}#${count}`;
    if (count > 1) stats.duplicateIds++;

    const parsed = parseKaikkiEntry(entry, lemmaId, sourceName);
    corpus.lexemes.push(parsed.lexeme);
    corpus.paradigms.push(parsed.paradigm);
    corpus.forms.push(...parsed.forms);

    // A lemma without an inflection table (a conjunction, a pronoun) still has
    // to be findable by its own spelling, so it contributes itself to the
    // surface index.
    if (!parsed.forms.some((f) => f.surface === entry.word)) {
      corpus.forms.push({
        surface: entry.word,
        lemmaId,
        features: featureKey({}),
        roman: parsed.romanization,
      });
    }

    stats.skippedForms += parsed.skippedForms;
    stats.entries++;
  }

  return { corpus, stats };
}
