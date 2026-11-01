import test from "node:test";
import assert from "node:assert/strict";
import { corpusFromRows, parseFeatures, parseLine } from "./unimorph.js";
import { validateCorpus } from "./validate.js";

const SAMPLE = [
  "γράφω\tγράφω\tV;1;SG;IPFV;PRS",
  "γράφω\tγράφεις\tV;2;SG;IPFV;PRS",
  "γράφω\tγράφει\tV;3;SG;IPFV;PRS",
  "γράφω\tγράφουμε, γράφομε\tV;1;PL;IPFV;PRS",
  "γράφω\tγράφετε\tV;2;PL;IPFV;PRS",
  "γράφω\tγράφουν, γράφουνε\tV;3;PL;IPFV;PRS",
  "γράφω\tέγραψα\tV;1;SG;PFV;PST",
  "γράφω\tγράφοντας\tV;PTCP",
  "σκύλος\tσκύλος\tN;NOM;SG",
  "σκύλος\tσκύλου\tN;GEN;SG",
  "σκύλος\tσκύλοι\tN;NOM;PL",
  "καλός\tκαλός\tADJ;NOM;SG;MASC",
  "καλός\tκαλύτερος\tADJ;NOM;SG;MASC;CMPR",
].join("\n");

test("parseFeatures maps aspect and tense separately", () => {
  assert.deepEqual(parseFeatures("V;1;SG;IPFV;PRS"), {
    person: "1",
    number: "SG",
    aspect: "IPFV",
    tense: "PRS",
  });
});

test("parseFeatures keeps case, number and gender for nominals", () => {
  assert.deepEqual(parseFeatures("ADJ;NOM;SG;MASC;CMPR"), {
    case: "NOM",
    number: "SG",
    gender: "MASC",
    degree: "CMPR",
  });
});

test("parseLine rejects malformed lines", () => {
  assert.equal(parseLine("not a valid row"), null);
  assert.equal(parseLine(""), null);
});

test("parseLine marks non-finite cells", () => {
  const row = parseLine("γράφω\tγράφοντας\tV;PTCP");
  assert.equal(row?.features.nonFinite, "PTCP");
});

test("corpusFromRows merges variants into one cell", () => {
  const rows = SAMPLE.split("\n").map((l) => parseLine(l)!);
  const corpus = corpusFromRows(rows, "el", "test");

  const paradigm = corpus.paradigms.find((p) => p.lemmaId === "el:verb:γράφω")!;
  const pluralFirst = paradigm.cells.find(
    (c) => c.features.person === "1" && c.features.number === "PL",
  );
  assert.deepEqual(pluralFirst?.forms, ["γράφουμε", "γράφομε"]);
});

test("every surface maps back to its lemma", () => {
  const rows = SAMPLE.split("\n").map((l) => parseLine(l)!);
  const corpus = corpusFromRows(rows, "el", "test");
  const target = corpus.forms.find((f) => f.surface === "έγραψα");
  assert.equal(target?.lemmaId, "el:verb:γράφω");
});

test("validator passes a complete corpus", () => {
  const rows = SAMPLE.split("\n").map((l) => parseLine(l)!);
  const corpus = corpusFromRows(rows, "el", "test");
  const report = validateCorpus(corpus);
  assert.equal(report.schemaErrors.length, 0, report.schemaErrors.join("\n"));
});

test("validator reports missing persons as gaps, not fatal errors", () => {
  const rows = SAMPLE.split("\n").map((l) => parseLine(l)!);
  const corpus = corpusFromRows(rows, "el", "test");
  const report = validateCorpus(corpus);
  assert.ok(report.ok);
  assert.ok(report.gaps.length > 0, "expected the aorist group to be reported as incomplete");
});
