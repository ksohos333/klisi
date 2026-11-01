import { readFileSync } from "node:fs";
import type { Cell, Lexeme, Paradigm } from "@klisi/schema";
import { featureKey } from "./features.js";

/**
 * UniMorph line format: `lemma \t form \t features`.
 * Feature tokens are `;`-separated and aspect-first for Greek verbs, e.g.
 * `V;1;SG;IPFV;PRS`. Variants for one cell are comma-separated in the form.
 */

const POS_MAP: Record<string, string> = { V: "verb", N: "noun", ADJ: "adj" };

const AXES: Array<[string, string[]]> = [
  ["person", ["1", "2", "3"]],
  ["number", ["SG", "PL", "DU"]],
  ["case", ["NOM", "GEN", "ACC", "VOC", "DAT"]],
  ["gender", ["MASC", "FEM", "NEUT"]],
  ["aspect", ["IPFV", "PFV", "PRF"]],
  ["tense", ["PRS", "PST", "FUT", "SBJV", "IMP"]],
  ["degree", ["AB", "CMPR", "SPRL"]],
  ["nonFinite", ["PTCP", "NFIN"]],
];

export function parseFeatures(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const tokens = tag.split(";").filter(Boolean);
  for (const token of tokens.slice(1)) {
    for (const [axis, values] of AXES) {
      if (values.includes(token)) out[axis] = token;
    }
  }
  return out;
}

export interface ParsedRow {
  lemma: string;
  form: string;
  pos: string;
  features: Record<string, string>;
}

export function parseLine(line: string): ParsedRow | null {
  const parts = line.split("\t");
  if (parts.length < 3) return null;
  const [lemma, form, tag] = parts;
  if (!lemma || !form || !tag) return null;
  const posToken = tag.split(";")[0] ?? "";
  const pos = POS_MAP[posToken];
  if (!pos) return null;
  return { lemma, form, pos, features: parseFeatures(tag) };
}

export interface ParsedCorpus {
  lexemes: Lexeme[];
  paradigms: Paradigm[];
  /** surface -> lemmaId, for reverse analysis of an inflected query. */
  forms: Array<{ surface: string; lemmaId: string; features: string }>;
  skipped: number;
}

export function corpusFromRows(rows: ParsedRow[], lang: string, sourceName: string): ParsedCorpus {
  const byLemma = new Map<string, ParsedRow[]>();
  let skipped = 0;
  for (const row of rows) {
    const key = `${row.pos}:${row.lemma}`;
    const list = byLemma.get(key) ?? [];
    list.push(row);
    byLemma.set(key, list);
  }

  const lexemes: Lexeme[] = [];
  const paradigms: Paradigm[] = [];
  const forms: ParsedCorpus["forms"] = [];

  for (const [key, group] of byLemma) {
    const [pos, lemma] = key.split(/:(.*)/s);
    if (!pos || !lemma) continue;
    const id = `${lang}:${pos}:${lemma}`;
    const grid =
      pos === "verb"
        ? { groupBy: ["aspect", "tense"], columns: ["person", "number"] }
        : pos === "noun"
          ? { groupBy: ["gender"], columns: ["case", "number"] }
          : { groupBy: ["degree", "gender"], columns: ["case", "number"] };

    // Merge cells that share a feature bundle: one cell, several variants.
    const cellMap = new Map<string, Cell>();
    for (const row of group) {
      const key = featureKey(row.features);
      const variants = row.form.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
      const cell = cellMap.get(key) ?? { features: row.features, forms: [] };
      for (const v of variants) {
        if (!cell.forms.includes(v)) cell.forms.push(v);
        forms.push({ surface: v, lemmaId: id, features: key });
      }
      cellMap.set(key, cell);
    }

    const gender = group.find((r) => r.features.gender)?.features.gender ?? null;

    lexemes.push({
      id,
      lang,
      lemma,
      pos,
      class: null,
      gender,
      stems: null,
      senses: null,
      links: null,
      source: { name: sourceName, license: "CC BY-SA 3.0" },
    });

    paradigms.push({ lemmaId: id, grid, cells: [...cellMap.values()] });
  }

  return { lexemes, paradigms, forms, skipped };
}

export function parseUnimorphFile(filePath: string, lang: string, sourceName: string): ParsedCorpus {
  const text = readFileSync(filePath, "utf8");
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const row = parseLine(line);
    if (row) rows.push(row);
    else skipped++;
  }
  const corpus = corpusFromRows(rows, lang, sourceName);
  corpus.skipped = skipped;
  return corpus;
}
