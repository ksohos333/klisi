import test from "node:test";
import assert from "node:assert/strict";
import { mapNominalTags, mapVerbTags, parseKaikkiEntry, type KaikkiEntry } from "./kaikki.js";

test("present indicative maps to IPFV;PRS", () => {
  assert.deepEqual(mapVerbTags(["active", "first-person", "imperfective", "indicative", "present", "singular"]), {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "IPFV",
    tense: "PRS",
  });
});

test("imperfect maps to IPFV;PST (school label Αόριστος)", () => {
  const f = mapVerbTags(["imperfect", "imperfective", "indicative"]);
  assert.equal(f.aspect, "IPFV");
  assert.equal(f.tense, "PST");
});

test("perfective past maps to PFV;PST (school label Στιγμιαίος)", () => {
  const f = mapVerbTags(["indicative", "past", "perfective"]);
  assert.equal(f.aspect, "PFV");
  assert.equal(f.tense, "PST");
});

test("dependent perfective is the aorist subjunctive stem", () => {
  const f = mapVerbTags(["dependent", "indicative", "perfective"]);
  assert.equal(f.aspect, "PFV");
  assert.equal(f.tense, "SBJV");
});

test("imperative only takes an aspect and IMP tense", () => {
  assert.deepEqual(mapVerbTags(["imperative", "perfective"]), { aspect: "PFV", tense: "IMP" });
});

test("nominal tags map to case, number, gender and degree", () => {
  assert.deepEqual(mapNominalTags(["masculine", "nominative", "singular"]), {
    case: "NOM",
    number: "SG",
    gender: "MASC",
  });
});

const ENTRY: KaikkiEntry = {
  word: "γράφω",
  pos: "verb",
  lang_code: "el",
  sounds: [{ ipa: "/ˈɣra.fo/" }],
  hyphenations: [{ parts: ["γρά", "φω"] }],
  head_templates: [{ name: "el-verb", args: { past: "έγραψα", passive: "γράφομαι" } }],
  forms: [
    { form: "gráfo", tags: ["romanization"] },
    { form: "el-conjug-1st", source: "conjugation", tags: ["inflection-template"] },
    { form: "no-table-tags", source: "conjugation", tags: ["table-tags"] },
    {
      form: "γράφω",
      source: "conjugation",
      tags: ["active", "first-person", "imperfective", "indicative", "present", "singular"],
    },
    {
      form: "γράφομαι",
      source: "conjugation",
      tags: ["first-person", "imperfective", "indicative", "passive", "present", "singular"],
    },
    {
      form: "έγραψα",
      source: "conjugation",
      tags: ["active", "first-person", "indicative", "past", "perfective", "singular"],
    },
    {
      form: "-",
      source: "conjugation",
      tags: ["imperative", "imperfective", "passive", "second-person", "singular"],
    },
    { form: "‑η", source: "conjugation", tags: ["participle", "passive", "past"] },
    { form: "γράψει", source: "conjugation", tags: ["infinitive-aorist"] },
  ],
  senses: [
    {
      glosses: ["to write, pen"],
      examples: [{ text: "Γράφετε βιβλίο;", translation: "Are you writing a book?", roman: "Gráfete vivlío?" }],
    },
  ],
};

test("a real-shaped entry produces lexeme, paradigm and surfaces", () => {
  const { lexeme, paradigm, forms } = parseKaikkiEntry(ENTRY, "el:verb:γράφω", "kaikki-greek");

  assert.equal(lexeme.id, "el:verb:γράφω");
  assert.equal(lexeme.class, "el-conjug-1st");
  assert.equal(lexeme.ipa, "/ˈɣra.fo/");
  assert.equal(lexeme.syllabification, "γρά-φω");
  assert.equal(lexeme.romanization, "gráfo");
  assert.deepEqual(lexeme.stems, { aorist: "έγραψα", passiveLemma: "γράφομαι" });
  assert.equal(lexeme.senses?.[0]?.gloss, "to write, pen");
  assert.equal(lexeme.senses?.[0]?.examples?.[0]?.roman, "Gráfete vivlío?");

  // Active and passive live in the same table, so voice is an axis, not a new lemma.
  const voices = new Set(paradigm.cells.map((c) => c.features.voice));
  assert.ok(voices.has("ACT"));
  assert.ok(voices.has("MIDPASS"));

  // "-" becomes an absent cell, not a literal form.
  const absent = paradigm.cells.find((c) => c.absent);
  assert.ok(absent, "expected an absent cell for the missing passive imperative");
  assert.deepEqual(absent.forms, []);

  // Suffix-only extraction artefacts are not treated as forms.
  assert.ok(!forms.some((f) => f.surface === "‑η"));

  // The aorist infinitive is a non-finite cell.
  assert.ok(paradigm.cells.some((c) => c.features.nonFinite === "NFIN"));
});

test("description rows from the extractor are not treated as forms", () => {
  const entry: KaikkiEntry = {
    word: "έχω",
    pos: "verb",
    lang_code: "el",
    forms: [
      {
        form: "Formed using present tense from above with a particle (να, ας).",
        tags: ["active", "future", "imperfect", "imperfective", "present", "subjunctive"],
        source: "conjugation",
      },
    ],
  };
  const { paradigm } = parseKaikkiEntry(entry, "el:verb:έχω", "kaikki-greek");
  const allForms = paradigm.cells.flatMap((c) => c.forms);
  assert.ok(!allForms.some((f) => f.includes("Formed using")), "description row leaked in");
});

test("dependent forms carry the να particle, with the bare stem as a variant", () => {
  const entry: KaikkiEntry = {
    word: "γράφω",
    pos: "verb",
    lang_code: "el",
    forms: [
      {
        form: "γράψω",
        tags: ["active", "dependent", "first-person", "indicative", "perfective", "singular"],
        source: "conjugation",
      },
    ],
  };
  const { paradigm } = parseKaikkiEntry(entry, "el:verb:γράφω", "kaikki-greek");
  const cell = paradigm.cells[0]!;
  assert.equal(cell.features.tense, "SBJV");
  assert.deepEqual(cell.forms, ["να γράψω", "γράψω"]);
});

test("a verb tagged with a declension table gets nominal axes", () => {
  // kaikki tags participles as verbs but gives them a declension table.
  const entry: KaikkiEntry = {
    word: "μέλλων",
    pos: "verb",
    lang_code: "el",
    forms: [
      {
        form: "μέλλων",
        tags: ["masculine", "nominative", "singular"],
        source: "declension",
      },
      {
        form: "μέλλοντες",
        tags: ["masculine", "nominative", "plural"],
        source: "declension",
      },
    ],
  };
  const { paradigm } = parseKaikkiEntry(entry, "el:verb:μέλλων", "kaikki-greek");
  assert.ok(paradigm.cells[0]?.features.case, "expected a case axis");
  assert.ok(!paradigm.cells[0]?.features.person, "must not invent a person axis");
  assert.deepEqual(paradigm.grid.columns, ["case", "number"]);
});
