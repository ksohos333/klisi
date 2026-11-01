import type { ParsedCorpus } from "./unimorph.js";

/**
 * Merge reciprocal spelling variants.
 *
 * The source sometimes carries the same word twice with the spelling swapped —
 * δύο and δυο each list the other as an "alternative", with identical glosses.
 * A learner should see one entry, not two, and searching either spelling must
 * reach it.
 *
 * The merge is deliberately conservative. Two entries are merged only when:
 *
 *   1. they have the same part of speech,
 *   2. they have identical gloss sets, and
 *   3. at least one of them declares the other as an explicit alternative.
 *
 * Accent differences alone never trigger a merge, because the Greek accent is
 * meaningful and the source already tells us when a variant is interchangeable.
 */

export interface MergeStats {
  merged: number;
  groups: number;
}

export function mergeAlternativeSpellings(corpus: ParsedCorpus): MergeStats {
  const stats: MergeStats = { merged: 0, groups: 0 };

  const lexemeById = new Map(corpus.lexemes.map((l) => [l.id, l]));
  const paradigmById = new Map(corpus.paradigms.map((p) => [p.lemmaId, p]));
  const consumed = new Set<string>();

  // Group by accent-insensitive surface, then split by POS. The grouping key
  // must ignore the accent: δύο and δυο differ only there.
  const groups = new Map<string, string[]>();
  for (const lexeme of corpus.lexemes) {
    const key = lexeme.lemma
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .normalize("NFC")
      .toLowerCase();
    const list = groups.get(key) ?? [];
    list.push(lexeme.id);
    groups.set(key, list);
  }

  for (const [, ids] of groups) {
    if (ids.length < 2) continue;

    const byPos = new Map<string, string[]>();
    for (const id of ids) {
      const pos = lexemeById.get(id)?.pos ?? "";
      const list = byPos.get(pos) ?? [];
      list.push(id);
      byPos.set(pos, list);
    }

    for (const samePos of byPos.values()) {
      if (samePos.length < 2) continue;

      const glossSets = samePos.map((id) =>
        JSON.stringify((lexemeById.get(id)?.senses ?? []).map((s) => s.gloss).sort()),
      );
      if (new Set(glossSets).size !== 1) continue;

      // Only merge when the entries explicitly point at each other.
      const declared = samePos.some((id) => {
        const lex = lexemeById.get(id);
        const variants = lex?.variants ?? [];
        return samePos.some(
          (other) => other !== id && variants.includes(lexemeById.get(other)?.lemma ?? ""),
        );
      });
      if (!declared) continue;

      // Prefer the spelling that carries the stress accent as canonical.
      const canonical = [...samePos].sort((a, b) => {
        const la = lexemeById.get(a)?.lemma ?? "";
        const lb = lexemeById.get(b)?.lemma ?? "";
        return stressScore(lb) - stressScore(la) || la.localeCompare(lb);
      })[0]!;

      let groupMerged = false;
      for (const id of samePos) {
        if (id === canonical || consumed.has(id)) continue;
        consumed.add(id);
        stats.merged++;
        groupMerged = true;

        const source = lexemeById.get(id);
        const target = lexemeById.get(canonical);
        if (!source || !target) continue;

        const variants = new Set(target.variants ?? []);
        variants.add(source.lemma);
        for (const v of source.variants ?? []) variants.add(v);
        // A lemma is not a variant of itself.
        variants.delete(target.lemma);
        target.variants = [...variants];

        for (const f of corpus.forms) {
          if (f.lemmaId === id) f.lemmaId = canonical;
        }
        const srcParadigm = paradigmById.get(id);
        if (srcParadigm) {
          paradigmById.delete(id);
          const dst = paradigmById.get(canonical);
          if (dst && srcParadigm.cells.length > dst.cells.length) {
            paradigmById.set(canonical, srcParadigm);
          }
        }
      }
      if (groupMerged) stats.groups++;
    }
  }

  if (consumed.size) {
    corpus.lexemes = corpus.lexemes.filter((l) => !consumed.has(l.id));
    corpus.paradigms = corpus.paradigms.filter((p) => !consumed.has(p.lemmaId));
    corpus.forms = corpus.forms.filter((f) => !consumed.has(f.lemmaId));
  }

  return stats;
}

/**
 * The nine precomposed accented Greek vowels. This is an explicit set, not a
 * range: 0x03AC–0x03CE spans the whole Greek block, most of which is
 * unaccented.
 */
const ACCENTED_VOWELS = new Set([
  0x03ac, // ά
  0x03ad, // έ
  0x03ae, // ή
  0x03af, // ί
  0x03b0, // ΰ
  0x03b1, // ώ
  0x03cc, // ό
  0x03cd, // ύ
  0x03ce, // ώ
]);

/** Higher score = more likely to be the standard spelling. */
function stressScore(word: string): number {
  let score = 0;
  for (const ch of word) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x0301 || ACCENTED_VOWELS.has(cp)) score += 2;
    else if (cp === 0x0300 || cp === 0x0342 || cp === 0x0343) score += 1;
  }
  return score;
}
