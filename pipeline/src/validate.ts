import { validateArtifact } from "@klisi/schema";
import type { ParsedCorpus } from "./unimorph.js";

export interface ValidationReport {
  ok: boolean;
  schemaErrors: string[];
  gaps: string[];
  summary: Record<string, number>;
}

/** Persons expected for a given tense: the imperative has no 1st or 3rd person. */
function expectedPersons(tense: string | undefined): string[] {
  return tense === "IMP" ? ["2"] : ["1", "2", "3"];
}

/**
 * The validator is a gate, not a report. Schema and round-trip violations are
 * fatal. Paradigm gaps are reported separately, because a genuinely absent cell
 * is a linguistic fact, not a pipeline bug.
 */
export function validateCorpus(corpus: ParsedCorpus): ValidationReport {
  const schemaErrors: string[] = [];
  const gaps: string[] = [];

  for (const l of corpus.lexemes) {
    const res = validateArtifact("lexeme", l);
    if (!res.ok) schemaErrors.push(`${l.id}: ${res.errors.join("; ")}`);
  }
  for (const p of corpus.paradigms) {
    const res = validateArtifact("paradigm", p);
    if (!res.ok) schemaErrors.push(`${p.lemmaId}: ${res.errors.join("; ")}`);
  }

  const lemmaIds = new Set(corpus.lexemes.map((l) => l.id));
  for (const f of corpus.forms) {
    if (!lemmaIds.has(f.lemmaId)) {
      schemaErrors.push(`form ${f.surface} points at unknown lemma ${f.lemmaId}`);
    }
  }

  for (const p of corpus.paradigms) {
    const finite = p.cells.filter((c) => !c.features.nonFinite);
    if (finite.length === 0) continue;

    if (p.grid.columns.includes("person")) {
      const groups = new Map<string, Set<string>>();
      for (const c of finite) {
        const key = `${c.features.aspect ?? ""};${c.features.tense ?? ""}`;
        const persons = groups.get(key) ?? new Set<string>();
        if (c.features.person) persons.add(c.features.person);
        groups.set(key, persons);
      }
      for (const [key, persons] of groups) {
        const tense = key.split(";")[1];
        const expected = expectedPersons(tense);
        const missing = expected.filter((x) => !persons.has(x));
        if (missing.length) {
          gaps.push(`${p.lemmaId} [${key}] missing person(s): ${missing.join(",")}`);
        }
      }
    }

    // A verb with no present indicative at all is almost always a data problem.
    if (p.grid.columns.includes("person")) {
      const hasPresent = finite.some(
        (c) => c.features.tense === "PRS" && c.features.aspect === "IPFV",
      );
      if (!hasPresent) gaps.push(`${p.lemmaId}: no present (IPFV;PRS) cells at all`);
    }
  }

  return {
    ok: schemaErrors.length === 0,
    schemaErrors,
    gaps,
    summary: {
      lexemes: corpus.lexemes.length,
      paradigms: corpus.paradigms.length,
      forms: corpus.forms.length,
      schemaErrors: schemaErrors.length,
      gaps: gaps.length,
    },
  };
}
