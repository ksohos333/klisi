import { existsSync, readFileSync } from "node:fs";
import type { ParsedCorpus } from "./unimorph.js";
import { featureKey } from "./features.js";

export interface Correction {
  lemmaId: string;
  features: Record<string, string>;
  action: "replace" | "add" | "remove";
  wrong?: string;
  correct?: string;
  source?: string;
  reviewer?: string;
  at?: string;
}

export interface CorrectionResult {
  applied: number;
  unmatched: string[];
}

export function parseCorrections(filePath: string): Correction[] {
  if (!existsSync(filePath)) return [];
  const out: Correction[] = [];
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    out.push(JSON.parse(t) as Correction);
  }
  return out;
}

/**
 * Apply verified corrections as an overlay, before validation and emission.
 * A correction that does not match its target cell is reported, never silently
 * dropped — a stale correction is a signal that the underlying data moved.
 */
export function applyCorrections(
  corpus: ParsedCorpus,
  corrections: Correction[],
): CorrectionResult {
  const unmatched: string[] = [];
  let applied = 0;

  for (const c of corrections) {
    const paradigm = corpus.paradigms.find((p) => p.lemmaId === c.lemmaId);
    if (!paradigm) {
      unmatched.push(`${c.lemmaId}: no such lemma`);
      continue;
    }
    const key = featureKey(c.features);
    const cell = paradigm.cells.find((x) => featureKey(x.features) === key);

    if (c.action === "add") {
      const target = cell ?? { features: c.features, forms: [] };
      if (c.correct && !target.forms.includes(c.correct)) target.forms.push(c.correct);
      if (!cell) paradigm.cells.push(target);
      target.reviewed = c.reviewer && c.at ? { by: c.reviewer, at: c.at } : null;
      applied++;
      continue;
    }

    if (!cell) {
      unmatched.push(`${c.lemmaId} ${key}: no such cell`);
      continue;
    }

    if (c.action === "remove") {
      const before = cell.forms.length;
      cell.forms = cell.forms.filter((f) => f !== c.wrong);
      if (cell.forms.length === before) {
        unmatched.push(`${c.lemmaId} ${key}: form "${c.wrong}" not present`);
        continue;
      }
      applied++;
      continue;
    }

    // replace
    const idx = c.wrong ? cell.forms.indexOf(c.wrong) : -1;
    if (idx === -1) {
      unmatched.push(`${c.lemmaId} ${key}: form "${c.wrong}" not present to replace`);
      continue;
    }
    if (c.correct) cell.forms[idx] = c.correct;
    cell.reviewed = c.reviewer && c.at ? { by: c.reviewer, at: c.at } : null;
    applied++;
  }

  return { applied, unmatched };
}
