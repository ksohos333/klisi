import test from "node:test";
import assert from "node:assert/strict";
import { loadLanguageConfig, validateArtifact } from "./index.js";

test("language configs load and self-declare their language", () => {
  for (const lang of ["el", "en", "grc"]) {
    const cfg = loadLanguageConfig(lang);
    assert.equal(cfg.lang, lang);
    assert.ok(cfg.pos.length > 0);
    assert.ok(Object.keys(cfg.axes).length > 0);
  }
});

test("Modern Greek config carries the Ministry tense labels", () => {
  const cfg = loadLanguageConfig("el");
  assert.equal(cfg.tenseLabels["IPFV;PST"]?.el, "Αόριστος");
  assert.equal(cfg.tenseLabels["PFV;PST"]?.el, "Στιγμιαίος");
  assert.equal(cfg.tenseLabels["PRF;PRS"]?.el, "Παρακείμενος");
});

test("a well-formed lexeme validates", () => {
  const res = validateArtifact("lexeme", {
    id: "el:verb:γράφω",
    lang: "el",
    lemma: "γράφω",
    pos: "verb",
    source: { name: "test" },
  });
  assert.equal(res.ok, true, res.errors.join("; "));
});

test("an invalid lexeme is rejected with a readable error", () => {
  const res = validateArtifact("lexeme", { id: "el:verb:γράφω", lang: "el" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.length > 0);
});

test("a paradigm with absent cells still validates", () => {
  const res = validateArtifact("paradigm", {
    lemmaId: "el:verb:μένω",
    grid: { groupBy: ["aspect", "tense"], columns: ["person", "number"] },
    cells: [
      { features: { aspect: "IPFV", tense: "PRS", person: "1", number: "SG" }, forms: ["μένω"] },
      {
        features: { aspect: "PFV", tense: "PST", person: "1", number: "SG" },
        forms: [],
        absent: true,
      },
    ],
  });
  assert.equal(res.ok, true, res.errors.join("; "));
});

test("a manifest validates and rejects bad hashes", () => {
  const base = {
    schemaVersion: 1,
    lang: "el",
    buildId: "el-test",
    createdAt: new Date().toISOString(),
    files: [{ path: "lexemes.jsonl.gz", sha256: "a".repeat(64), bytes: 10 }],
    sources: [{ name: "UniMorph", url: "https://example.com", license: "CC BY-SA 3.0" }],
  };
  assert.equal(validateArtifact("manifest", base).ok, true);

  const bad = structuredClone(base);
  bad.files[0]!.sha256 = "not-a-hash";
  assert.equal(validateArtifact("manifest", bad).ok, false);
});
