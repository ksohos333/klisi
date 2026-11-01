import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { loadLanguageConfig, type LanguageConfig } from "@klisi/schema";
import { SearchIndex, type IndexEntry } from "./search.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const vectors = JSON.parse(
  readFileSync(path.resolve(here, "../vectors/search-cases.json"), "utf8"),
) as {
  index: IndexEntry[];
  cases: Array<{
    id: string;
    lang: string;
    query: string;
    expectStage: number;
    expectLemmas: string[];
    expectFirst?: string;
    note?: string;
  }>;
};

const configs: Record<string, LanguageConfig> = {
  el: loadLanguageConfig("el"),
  en: loadLanguageConfig("en"),
};

const index = new SearchIndex(vectors.index, configs);

for (const c of vectors.cases) {
  test(`search: ${c.id}`, () => {
    const hits = index.search(c.lang, c.query);

    if (c.expectStage === 0) {
      assert.equal(hits.length, 0, `expected no hits, got ${JSON.stringify(hits)}`);
      return;
    }

    assert.ok(hits.length > 0, `expected hits for ${c.query}, got none`);
    const winningStage = Math.min(...hits.map((h) => h.stage));
    assert.equal(
      winningStage,
      c.expectStage,
      `expected stage ${c.expectStage}, got ${winningStage} (${JSON.stringify(hits)})`,
    );

    // Rule 1: no hit may come from a later stage than the winning one.
    for (const h of hits) {
      assert.equal(
        h.stage,
        c.expectStage,
        `hit ${h.lemmaId} came from stage ${h.stage}, expected ${c.expectStage}`,
      );
    }

    const lemmas = new Set(hits.map((h) => h.lemmaId));
    for (const expected of c.expectLemmas) {
      assert.ok(
        lemmas.has(expected),
        `expected ${expected} in results for ${c.query}, got ${[...lemmas].join(", ")}`,
      );
    }

    if (c.expectFirst) {
      assert.equal(hits[0]?.lemmaId, c.expectFirst, `wrong first hit for ${c.query}`);
    }
  });
}
