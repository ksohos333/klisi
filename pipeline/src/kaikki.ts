import type { Cell, Example, Lexeme, Paradigm, Sense } from "@klisi/schema";
import { featureKey } from "./features.js";

/**
 * kaikki.org (Wiktextract) Modern Greek entries.
 *
 * The inflection tables are already expanded by the extractor, which means we
 * get attested surface forms with case/number/person/tense tags instead of
 * having to reimplement the conjugation rules that live in Wiktionary's Lua
 * modules. That is the whole reason this source is the spine.
 */

export interface KaikkiForm {
  form: string;
  tags?: string[];
  source?: string;
  roman?: string;
}

export interface KaikkiEntry {
  word: string;
  pos: string;
  lang_code: string;
  forms?: KaikkiForm[];
  sounds?: Array<{ ipa?: string }>;
  hyphenations?: Array<{ parts?: string[] }>;
  head_templates?: Array<{ name: string; args?: Record<string, string> }>;
  senses?: Array<{
    glosses?: string[];
    tags?: string[];
    examples?: Array<{ text?: string; translation?: string; english?: string; roman?: string }>;
  }>;
}

const CASE: Record<string, string> = {
  nominative: "NOM",
  genitive: "GEN",
  accusative: "ACC",
  vocative: "VOC",
  dative: "DAT",
};
const NUMBER: Record<string, string> = { singular: "SG", plural: "PL", dual: "DU" };
const GENDER: Record<string, string> = { masculine: "MASC", feminine: "FEM", neuter: "NEUT" };
const DEGREE: Record<string, string> = { comparative: "CMPR", superlative: "SPRL" };
const PERSON: Record<string, string> = {
  "first-person": "1",
  "second-person": "2",
  "third-person": "3",
};
const VOICE: Record<string, string> = { active: "ACT", passive: "MIDPASS" };

/** Tags that qualify a form but are not feature axes of their own. */
const NOTE_TAGS = new Set(["informal", "rare", "dated", "archaic", "progressive", "continuative"]);

/** Dash-only and suffix-only artefacts of table extraction are not real forms. */
function isUsableForm(form: string): boolean {
  if (form === "-" || form === "—") return false;
  if (/^[-‑–—]/.test(form)) return false;
  // Description rows: the extractor sometimes emits the template's explanatory
  // prose ("Formed using present tense from above with a particle (να, ας).")
  // in place of a form. Latin letters never occur in a Greek surface form.
  if (/[A-Za-z]/.test(form)) return false;
  return true;
}

/** A "-" cell means the form does not exist, which is different from missing data. */
function isAbsentMarker(form: string): boolean {
  return form === "-" || form === "—";
}

/**
 * Map the extractor's tense/aspect tags onto the canonical feature axes used by
 * UniMorph and by our Ministry-of-Education label set.
 *
 * kaikki        → aspect ; tense
 * present+ipfv  → IPFV;PRS   (Ενεστώτας)
 * imperfect     → IPFV;PST   (Αόριστος)
 * past+pfv      → PFV;PST    (Στιγμιαίος)
 * dependent+pfv → PFV;SBJV   (γράψω, the aorist subjunctive stem)
 * future        → IPFV/PFV;FUT
 */
export function mapVerbTags(tags: string[]): Record<string, string> {
  const t = new Set(tags);
  const features: Record<string, string> = {};
  for (const [tag, value] of Object.entries(PERSON)) if (t.has(tag)) features.person = value;
  for (const [tag, value] of Object.entries(NUMBER)) if (t.has(tag)) features.number = value;
  for (const [tag, value] of Object.entries(VOICE)) if (t.has(tag)) features.voice = value;

  const perfective = t.has("perfective");
  const imperfective = t.has("imperfective");

  if (t.has("imperative")) {
    features.aspect = perfective ? "PFV" : "IPFV";
    features.tense = "IMP";
    return features;
  }
  if (t.has("subjunctive")) {
    features.aspect = perfective ? "PFV" : "IPFV";
    features.tense = "SBJV";
    return features;
  }
  if (t.has("dependent")) {
    // γράψω: the perfective, non-standalone form used after θα and να.
    features.aspect = "PFV";
    features.tense = "SBJV";
    return features;
  }
  if (t.has("future")) {
    features.aspect = perfective ? "PFV" : "IPFV";
    features.tense = "FUT";
    return features;
  }
  if (t.has("infinitive-aorist")) {
    features.nonFinite = "NFIN";
    features.aspect = "PFV";
    return features;
  }
  if (t.has("participle")) {
    features.nonFinite = "PTCP";
    if (t.has("perfect")) features.aspect = "PRF";
    else if (t.has("past")) features.tense = "PST";
    else if (t.has("present")) features.tense = "PRS";
    return features;
  }
  if (t.has("imperfect")) {
    features.aspect = "IPFV";
    features.tense = "PST";
    return features;
  }
  if (t.has("past")) {
    features.aspect = perfective ? "PFV" : "IPFV";
    features.tense = "PST";
    return features;
  }
  if (t.has("present")) {
    features.aspect = imperfective ? "IPFV" : perfective ? "PFV" : "IPFV";
    features.tense = "PRS";
    return features;
  }
  return features;
}

export function mapNominalTags(tags: string[]): Record<string, string> {
  const features: Record<string, string> = {};
  for (const [tag, value] of Object.entries(CASE)) if (tags.includes(tag)) features.case = value;
  for (const [tag, value] of Object.entries(NUMBER)) if (tags.includes(tag)) features.number = value;
  for (const [tag, value] of Object.entries(GENDER)) if (tags.includes(tag)) features.gender = value;
  for (const [tag, value] of Object.entries(DEGREE)) if (tags.includes(tag)) features.degree = value;
  return features;
}

export interface ParsedKaikki {
  lexeme: Lexeme;
  paradigm: Paradigm;
  forms: Array<{ surface: string; lemmaId: string; features: string; roman?: string | null }>;
  romanization: string | null;
  skippedForms: number;
}

/** Parts of speech that carry a paradigm in this artifact. */
const PARADIGM_POS = new Set(["verb", "noun", "adj", "name", "pron", "article", "det", "num"]);

export function parseKaikkiEntry(entry: KaikkiEntry, lemmaId: string, sourceName: string): ParsedKaikki {
  const lang = entry.lang_code;
  const pos = entry.pos;
  const hasParadigm = PARADIGM_POS.has(pos);

  const cells = new Map<string, Cell>();
  const notes = new Map<string, Set<string>>();
  const forms: ParsedKaikki["forms"] = [];
  let romanization: string | null = null;
  let declensionClass: string | null = null;
  let skippedForms = 0;
  const alternatives: string[] = [];

  for (const form of entry.forms ?? []) {
    const tags = form.tags ?? [];

    if (tags.includes("romanization") && !form.source) {
      romanization = form.form;
      continue;
    }
    if (tags.includes("alternative") && !form.source) {
      alternatives.push(form.form);
      continue;
    }
    if (tags.includes("inflection-template")) {
      declensionClass = form.form;
      continue;
    }
    if (tags.includes("table-tags") || tags.includes("no-table-tags")) continue;

    if (form.source !== "declension" && form.source !== "conjugation") continue;
    if (!hasParadigm) continue;

    // The mapper follows the *table*, not the POS. kaikki tags participles as
    // verbs but gives them a declension table, and reading them with the verb
    // mapper would produce cells with no aspect and no tense.
    const features =
      form.source === "conjugation" ? mapVerbTags(tags) : mapNominalTags(tags);
    if (form.source === "conjugation" && !features.voice) {
      // Voice lives in the same table, so it becomes an axis of the cell.
      features.voice = "ACT";
    }

    const key = featureKey(features);
    const cell = cells.get(key) ?? { features, forms: [] };

    if (isAbsentMarker(form.form)) {
      cell.absent = true;
      cell.forms = [];
      cells.set(key, cell);
      continue;
    }
    if (!isUsableForm(form.form)) {
      skippedForms++;
      continue;
    }

    if (!cell.forms.includes(form.form)) cell.forms.push(form.form);

    // The "dependent" tag marks the perfective form used after να, given as a
    // bare stem (γράψω). The Ministry grammar writes it with the particle, so
    // the particle form is primary and the bare stem stays as a variant.
    if (tags.includes("dependent") && !form.form.startsWith("να ")) {
      const particleForm = `να ${form.form}`;
      const idx = cell.forms.indexOf(form.form);
      if (idx > 0) cell.forms.splice(idx, 1);
      if (!cell.forms.includes(particleForm)) cell.forms.unshift(particleForm);
      if (!cell.forms.includes(form.form)) cell.forms.push(form.form);
    }
    const cellNotes = notes.get(key) ?? new Set<string>();
    for (const tag of tags) if (NOTE_TAGS.has(tag)) cellNotes.add(tag);
    notes.set(key, cellNotes);
    cells.set(key, cell);

    forms.push({
      surface: form.form,
      lemmaId,
      features: key,
      roman: form.roman ?? null,
    });
  }

  for (const [key, cell] of cells) {
    const cellNotes = notes.get(key);
    if (cellNotes && cellNotes.size) cell.note = [...cellNotes].sort().join(", ");
    if (cell.forms.length === 0 && !cell.absent) cell.absent = true;
    // De-duplicate while preserving source order: the first variant is primary.
    const seen = new Set<string>();
    cell.forms = cell.forms.filter((f) => {
      if (seen.has(f)) return false;
      seen.add(f);
      return true;
    });
  }

  const senses: Sense[] = (entry.senses ?? [])
    .filter((s) => (s.glosses ?? []).length > 0)
    .map((s) => {
      const glosses = s.glosses ?? [];
      const examples: Example[] = (s.examples ?? [])
        .filter((e) => e.text)
        .map((e) => ({
          text: e.text!,
          translation: e.translation ?? e.english ?? null,
          roman: e.roman ?? null,
        }));
      return {
        gloss: glosses.join("; "),
        tags: s.tags ?? null,
        translations: glosses.map((g) => ({ lang: "en", text: g })),
        examples: examples.length ? examples : null,
      };
    });

  const ipa = (entry.sounds ?? []).find((s) => s.ipa)?.ipa ?? null;
  const syllabification =
    (entry.hyphenations ?? []).find((h) => h.parts)?.parts?.join("-") ?? null;

  const headArgs = (entry.head_templates ?? []).find((h) => h.name === "el-verb")?.args;
  const stems: Record<string, string> = {};
  if (headArgs?.past) stems.aorist = headArgs.past;
  if (headArgs?.passive) stems.passiveLemma = headArgs.passive;

  const lexeme: Lexeme = {
    id: lemmaId,
    lang,
    lemma: entry.word,
    pos,
    class: declensionClass,
    gender: null,
    stems: Object.keys(stems).length ? stems : null,
    variants: alternatives.length ? alternatives : null,
    senses: senses.length ? senses : null,
    links: null,
    ipa,
    romanization,
    syllabification,
    source: { name: sourceName, license: "CC BY-SA 4.0" },
  };

  // The grid follows the cells that were actually produced, not the POS.
  const cellList = [...cells.values()];
  const isFiniteVerb = cellList.some((c) => c.features.person);
  const grid = isFiniteVerb
    ? { groupBy: ["aspect", "tense"], columns: ["person", "number"] }
    : cellList.some((c) => c.features.case)
      ? pos === "adj"
        ? { groupBy: ["degree", "gender"], columns: ["case", "number"] }
        : { groupBy: ["gender"], columns: ["case", "number"] }
      : { groupBy: [], columns: [] };

  return {
    lexeme,
    paradigm: { lemmaId, grid, cells: cellList },
    forms,
    romanization,
    skippedForms,
  };
}
