import test from "node:test";
import assert from "node:assert/strict";
import { corpusFromRows, parseLine } from "./unimorph.js";
import { applyCorrections } from "./corrections.js";

const SAMPLE = [
  "γράφω\tγράφω\tV;1;SG;IPFV;PRS",
  "γράφω\tέγραψα\tV;1;SG;PFV;PST",
].join("\n");

function corpus() {
  return corpusFromRows(SAMPLE.split("\n").map((l) => parseLine(l)!), "el", "test");
}

const cell = { aspect: "PFV", tense: "PST", person: "1", number: "SG" };

test("replace fixes a form and marks the cell reviewed", () => {
  const c = corpus();
  const res = applyCorrections(c, [
    {
      lemmaId: "el:verb:γράφω",
      features: cell,
      action: "replace",
      wrong: "έγραψα",
      correct: "έγραψα!",
      source: "native speaker",
      reviewer: "@ksohos333",
      at: "2026-11-01",
    },
  ]);
  assert.equal(res.applied, 1);
  const target = c.paradigms[0]!.cells.find((x) => x.features.tense === "PST")!;
  assert.deepEqual(target.forms, ["έγραψα!"]);
  assert.equal(target.reviewed?.by, "@ksohos333");
});

test("a correction against a missing form is reported, not silently dropped", () => {
  const c = corpus();
  const res = applyCorrections(c, [
    { lemmaId: "el:verb:γράφω", features: cell, action: "replace", wrong: "νope", correct: "x" },
  ]);
  assert.equal(res.applied, 0);
  assert.equal(res.unmatched.length, 1);
});

test("add inserts a form that was missing", () => {
  const c = corpus();
  const res = applyCorrections(c, [
    { lemmaId: "el:verb:γράφω", features: cell, action: "add", correct: "γράφτηκα" },
  ]);
  assert.equal(res.applied, 1);
  const target = c.paradigms[0]!.cells.find((x) => x.features.tense === "PST")!;
  assert.ok(target.forms.includes("γράφτηκα"));
});

test("a correction against an unknown lemma is reported", () => {
  const c = corpus();
  const res = applyCorrections(c, [
    { lemmaId: "el:verb:δενυπάρχει", features: cell, action: "add", correct: "x" },
  ]);
  assert.equal(res.applied, 0);
  assert.equal(res.unmatched.length, 1);
});
