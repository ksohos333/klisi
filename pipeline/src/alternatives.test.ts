import test from "node:test";
import assert from "node:assert/strict";
import { mergeAlternativeSpellings } from "./alternatives.js";
import type { ParsedCorpus } from "./unimorph.js";
import type { Lexeme } from "@klisi/schema";

function lexeme(id: string, lemma: string, pos: string, gloss: string, variants?: string[]): Lexeme {
  return {
    id,
    lang: "el",
    lemma,
    pos,
    senses: [{ gloss }],
    variants: variants ?? null,
    source: { name: "test" },
  };
}

function corpusWith(lexemes: Lexeme[]): ParsedCorpus {
  return {
    lexemes,
    paradigms: lexemes.map((l) => ({
      lemmaId: l.id,
      grid: { groupBy: [], columns: [] },
      cells: [],
    })),
    forms: lexemes.map((l) => ({ surface: l.lemma, lemmaId: l.id, features: "{}" })),
    skipped: 0,
  };
}

test("reciprocal alternative spellings merge into one lemma", () => {
  const corpus = corpusWith([
    lexeme("el:num:δύο", "δύο", "num", "two", ["δυο"]),
    lexeme("el:num:δυο", "δυο", "num", "two", ["δύο"]),
  ]);
  const stats = mergeAlternativeSpellings(corpus);
  assert.equal(stats.merged, 1);
  assert.equal(corpus.lexemes.length, 1);
  assert.equal(corpus.lexemes[0]?.lemma, "δύο");
  assert.deepEqual(corpus.lexemes[0]?.variants, ["δυο"]);
});

test("the merged entry keeps both spellings searchable", () => {
  const corpus = corpusWith([
    lexeme("el:num:δύο", "δύο", "num", "two", ["δυο"]),
    lexeme("el:num:δυο", "δυο", "num", "two", ["δύο"]),
  ]);
  mergeAlternativeSpellings(corpus);
  const surfaces = corpus.forms.map((f) => f.surface).sort();
  assert.deepEqual(surfaces, ["δυο", "δύο"]);
  assert.ok(corpus.forms.every((f) => f.lemmaId === "el:num:δύο"));
});

test("different parts of speech are never merged", () => {
  const corpus = corpusWith([
    lexeme("el:num:δύο", "δύο", "num", "two", ["δυο"]),
    lexeme("el:noun:δυο", "δυο", "noun", "two", ["δύο"]),
  ]);
  const stats = mergeAlternativeSpellings(corpus);
  assert.equal(stats.merged, 0);
  assert.equal(corpus.lexemes.length, 2);
});

test("different glosses are never merged", () => {
  const corpus = corpusWith([
    lexeme("el:noun:δύο", "δύο", "noun", "two (playing card)", ["δυο"]),
    lexeme("el:noun:δυο", "δυο", "noun", "pair", ["δύο"]),
  ]);
  const stats = mergeAlternativeSpellings(corpus);
  assert.equal(stats.merged, 0);
});

test("entries that do not declare each other are not merged", () => {
  const corpus = corpusWith([
    lexeme("el:noun:λέξη", "λέξη", "noun", "word"),
    lexeme("el:noun:λεξη", "λεξη", "noun", "word"),
  ]);
  const stats = mergeAlternativeSpellings(corpus);
  assert.equal(stats.merged, 0);
  assert.equal(corpus.lexemes.length, 2);
});
