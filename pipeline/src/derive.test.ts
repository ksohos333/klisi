import test from "node:test";
import assert from "node:assert/strict";
import { derivePeriphrases } from "./derive.js";
import { featureKey } from "./features.js";
import type { ParsedCorpus } from "./unimorph.js";
import type { Cell, Paradigm } from "@klisi/schema";

function verbParadigm(cells: Cell[]): Paradigm {
  return {
    lemmaId: "el:verb:γράφω",
    grid: { groupBy: ["aspect", "tense"], columns: ["person", "number"] },
    cells,
  };
}

function corpusWith(cells: Cell[]): ParsedCorpus {
  return {
    lexemes: [{ id: "el:verb:γράφω", lang: "el", lemma: "γράφω", pos: "verb", source: { name: "test" } }],
    paradigms: [verbParadigm(cells)],
    forms: [],
    skipped: 0,
  };
}

const present: Cell = {
  features: { person: "1", number: "SG", voice: "ACT", aspect: "IPFV", tense: "PRS" },
  forms: ["γράφω"],
};
const aoristSubj: Cell = {
  features: { person: "1", number: "SG", voice: "ACT", aspect: "PFV", tense: "SBJV" },
  forms: ["γράψω"],
};
const infinitive: Cell = {
  features: { voice: "ACT", nonFinite: "NFIN", aspect: "PFV" },
  forms: ["γράψει"],
};

function cellFor(p: Paradigm, features: Record<string, string>): Cell | undefined {
  return p.cells.find((c) => featureKey(c.features) === featureKey(features));
}

test("derives the imperfective future from the present", () => {
  const corpus = corpusWith([present]);
  derivePeriphrases(corpus);
  const cell = cellFor(corpus.paradigms[0]!, {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "IPFV",
    tense: "FUT",
  });
  assert.deepEqual(cell?.forms, ["θα γράφω"]);
  assert.equal(cell?.derived, "θα+present");
});

test("derives the present subjunctive as να + present", () => {
  const corpus = corpusWith([present]);
  const stats = derivePeriphrases(corpus);
  assert.equal(stats.subjunctiveCells, 1);
  const cell = cellFor(corpus.paradigms[0]!, {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "IPFV",
    tense: "SBJV",
  });
  assert.deepEqual(cell?.forms, ["να γράφω"]);
  assert.equal(cell?.derived, "να+present");
});

test("the perfective future strips the να particle before adding θα", () => {
  const corpus = corpusWith([{ ...aoristSubj, forms: ["να γράψω"] }]);
  derivePeriphrases(corpus);
  const cell = cellFor(corpus.paradigms[0]!, {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "PFV",
    tense: "FUT",
  });
  assert.deepEqual(cell?.forms, ["θα γράψω"]);
});

test("derives the perfective future from the aorist subjunctive", () => {
  const corpus = corpusWith([aoristSubj]);
  derivePeriphrases(corpus);
  const cell = cellFor(corpus.paradigms[0]!, {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "PFV",
    tense: "FUT",
  });
  assert.deepEqual(cell?.forms, ["θα γράψω"]);
});

test("derives Παρακείμενος, Υπερσυντέλικος and the future perfect", () => {
  const corpus = corpusWith([infinitive]);
  derivePeriphrases(corpus);
  const p = corpus.paradigms[0]!;
  const base = { person: "1", number: "SG", voice: "ACT", aspect: "PRF" };
  assert.deepEqual(cellFor(p, { ...base, tense: "PRS" })?.forms, ["έχω γράψει"]);
  assert.deepEqual(cellFor(p, { ...base, tense: "PST" })?.forms, ["είχα γράψει"]);
  assert.deepEqual(cellFor(p, { ...base, tense: "FUT" })?.forms, ["θα έχω γράψει"]);
});

test("does not derive the passive perfect", () => {
  const corpus = corpusWith([
    { features: { person: "1", number: "SG", voice: "MIDPASS", nonFinite: "NFIN", aspect: "PFV" }, forms: ["γραφτεί"] },
  ]);
  const stats = derivePeriphrases(corpus);
  assert.equal(stats.perfectCells, 0);
});

test("never overwrites an attested cell", () => {
  const attested: Cell = {
    features: { person: "1", number: "SG", voice: "ACT", aspect: "IPFV", tense: "FUT" },
    forms: ["θα γράφω!"],
  };
  const corpus = corpusWith([present, attested]);
  derivePeriphrases(corpus);
  const cell = cellFor(corpus.paradigms[0]!, {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "IPFV",
    tense: "FUT",
  });
  assert.deepEqual(cell?.forms, ["θα γράφω!"]);
  assert.equal(cell?.derived, undefined);
});

test("deduplicates forms that collide after a particle is added", () => {
  const corpus = corpusWith([
    { ...aoristSubj, forms: ["να γράψομε", "να γράψουμε", "γράψομε", "γράψουμε"] },
  ]);
  derivePeriphrases(corpus);
  const cell = cellFor(corpus.paradigms[0]!, {
    person: "1",
    number: "SG",
    voice: "ACT",
    aspect: "PFV",
    tense: "FUT",
  });
  assert.deepEqual(cell?.forms, ["θα γράψομε", "θα γράψουμε"]);
});

test("fills every person and number, including the imperative-free future", () => {
  const cells: Cell[] = [];
  for (const person of ["1", "2", "3"]) {
    for (const number of ["SG", "PL"]) {
      cells.push({
        features: { person, number, voice: "ACT", aspect: "IPFV", tense: "PRS" },
        forms: [`p${person}${number}`],
      });
    }
  }
  const corpus = corpusWith(cells);
  const stats = derivePeriphrases(corpus);
  assert.equal(stats.futureCells, 6);
});
