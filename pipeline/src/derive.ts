import type { Cell, Paradigm } from "@klisi/schema";
import type { ParsedCorpus } from "./unimorph.js";
import { featureKey } from "./features.js";

/**
 * Periphrastic Modern Greek tenses.
 *
 * kaikki's expanded Wiktionary tables do not include the periphrastic future or
 * the perfect, so those cells are absent from the raw ingest. They are regular
 * periphrases of cells we *do* have, so we derive them instead of leaving holes:
 *
 *   Μέλλοντας        θα + ενεστώτας        (θα γράφω)
 *                    θα + αορίστου (υποτ.)  (θα γράψω)
 *   Παρακείμενος     έχω + απαρέμφατο αορίστου (έχω γράψει)
 *   Υπερσυντέλικος   είχα + απαρέμφατο αορίστου (είχα γράψει)
 *   Μέλλ. συντελ.    θα + παρακείμενος      (θα έχω γράψει)
 *
 * Every derived cell is marked with the rule that produced it, and an attested
 * cell is never overwritten.
 */

/** έχω, present. Standard Modern Greek auxiliary paradigm. */
const AUX_PRESENT: Record<string, Record<string, string>> = {
  "1": { SG: "έχω", PL: "έχουμε" },
  "2": { SG: "έχεις", PL: "έχετε" },
  "3": { SG: "έχει", PL: "έχουν" },
};

/** έχω, past (imperfect). */
const AUX_PAST: Record<string, Record<string, string>> = {
  "1": { SG: "είχα", PL: "είχαμε" },
  "2": { SG: "είχες", PL: "είχατε" },
  "3": { SG: "είχε", PL: "είχαν" },
};

const PERSONS = ["1", "2", "3"];
const NUMBERS = ["SG", "PL"];

export interface DeriveStats {
  futureCells: number;
  perfectCells: number;
  subjunctiveCells: number;
  skippedNoStem: number;
}

function cellMap(p: Paradigm): Map<string, Cell> {
  const m = new Map<string, Cell>();
  for (const c of p.cells) m.set(featureKey(c.features), c);
  return m;
}

function upsert(p: Paradigm, features: Record<string, string>): Cell {
  const key = featureKey(features);
  const existing = p.cells.find((c) => featureKey(c.features) === key);
  if (existing) return existing;
  const cell: Cell = { features, forms: [] };
  p.cells.push(cell);
  return cell;
}

/** Only fill a cell that has no attested forms of its own. */
function fill(cell: Cell, forms: string[], rule: string): boolean {
  if (cell.forms.length > 0) return false;
  // A source cell can carry the same stem in several spellings (γράψομε and
  // γράψουμε); after dropping and re-adding a particle those collide.
  const unique: string[] = [];
  for (const f of forms) {
    const t = f.trim();
    if (t && !unique.includes(t)) unique.push(t);
  }
  if (unique.length === 0) return false;
  cell.forms = unique;
  cell.absent = false;
  cell.derived = rule;
  return true;
}

export function derivePeriphrases(corpus: ParsedCorpus): DeriveStats {
  const stats: DeriveStats = {
    futureCells: 0,
    perfectCells: 0,
    subjunctiveCells: 0,
    skippedNoStem: 0,
  };

  for (const paradigm of corpus.paradigms) {
    if (!paradigm.grid.columns.includes("person")) continue;
    const cells = cellMap(paradigm);

    // Sources differ on whether voice is an axis at all. When it is absent, the
    // paradigm is treated as active-only and the feature is left out of the key.
    const hasVoice = paradigm.cells.some((c) => c.features.voice);
    const voices: Array<string | null> = hasVoice ? ["ACT", "MIDPASS"] : [null];

    for (const voice of voices) {
      for (const person of PERSONS) {
        for (const number of NUMBERS) {
          const base: Record<string, string> = { person, number };
          if (voice) base.voice = voice;

          // --- Future: θα + present (imperfective future) ---
          const present = cells.get(
            featureKey({ ...base, aspect: "IPFV", tense: "PRS" }),
          );
          if (present && present.forms.length) {
            const target = upsert(paradigm, { ...base, aspect: "IPFV", tense: "FUT" });
            if (fill(target, present.forms.map((f) => `θα ${f}`), "θα+present")) {
              stats.futureCells++;
            }
          }

          // --- Present subjunctive: να + present indicative ---
          // The imperfective present subjunctive is the present indicative with
          // the particle να; Greek Wiktionary says so explicitly in its
          // conjugation tables ("Formed using present tense from above with a
          // particle (να, ας)"), but does not enumerate the rows.
          if (present && present.forms.length) {
            const target = upsert(paradigm, { ...base, aspect: "IPFV", tense: "SBJV" });
            if (fill(target, present.forms.map((f) => `να ${f}`), "να+present")) {
              stats.subjunctiveCells++;
            }
          }

          // --- Future: θα + aorist subjunctive (perfective future) ---
          // θα γράψω, so the να particle must be stripped from the subjunctive
          // cell before the θα particle is applied.
          const aoristSubj = cells.get(
            featureKey({ ...base, aspect: "PFV", tense: "SBJV" }),
          );
          if (aoristSubj && aoristSubj.forms.length) {
            const stems = aoristSubj.forms.map((f) => f.replace(/^να\s+/, ""));
            const target = upsert(paradigm, { ...base, aspect: "PFV", tense: "FUT" });
            if (fill(target, stems.map((f) => `θα ${f}`), "θα+aorist-subjunctive")) {
              stats.futureCells++;
            }
          }

          // --- Perfect, active voice only ---
          // The passive perfect is a different construction (είμαι + passive
          // participle, with agreement), so we do not guess at it here.
          if (voice !== "ACT") continue;

          // The aorist infinitive may or may not carry a voice tag depending on
          // how the source table was extracted; accept either.
          const infinitive = paradigm.cells.find(
            (c) =>
              c.features.nonFinite === "NFIN" &&
              (!c.features.voice || c.features.voice === "ACT") &&
              c.forms.length > 0,
          );
          if (!infinitive) {
            stats.skippedNoStem++;
            continue;
          }

          const perfectPresent = upsert(paradigm, {
            ...base,
            aspect: "PRF",
            tense: "PRS",
          });
          const auxPresent = AUX_PRESENT[person]?.[number];
          if (auxPresent) {
            const forms = infinitive.forms.map((f) => `${auxPresent} ${f}`);
            if (fill(perfectPresent, forms, "perfect:έχω+aorist-infinitive")) {
              stats.perfectCells++;
            }
          }

          const perfectPast = upsert(paradigm, { ...base, aspect: "PRF", tense: "PST" });
          const auxPast = AUX_PAST[person]?.[number];
          if (auxPast) {
            const forms = infinitive.forms.map((f) => `${auxPast} ${f}`);
            if (fill(perfectPast, forms, "perfect:είχα+aorist-infinitive")) {
              stats.perfectCells++;
            }
          }

          // Future perfect = θα + present perfect.
          if (perfectPresent.forms.length) {
            const target = upsert(paradigm, { ...base, aspect: "PRF", tense: "FUT" });
            if (fill(target, perfectPresent.forms.map((f) => `θα ${f}`), "θα+present-perfect")) {
              stats.futureCells++;
            }
          }

          // Subjunctive perfect = να + present perfect.
          if (perfectPresent.forms.length) {
            const target = upsert(paradigm, { ...base, aspect: "PRF", tense: "SBJV" });
            if (fill(target, perfectPresent.forms.map((f) => `να ${f}`), "να+present-perfect")) {
              stats.subjunctiveCells++;
            }
          }
        }
      }
    }
  }

  return stats;
}
