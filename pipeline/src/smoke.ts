import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLanguageConfig } from "@klisi/schema";
import { SearchIndex, type IndexEntry, normalize } from "@klisi/spec";

/**
 * End-to-end diagnostic on a real emitted pack.
 *
 *   1. Coverage: which high-frequency lemmas are missing from this data source?
 *   2. Behaviour: does an accent-stripped query actually resolve to its lemma?
 *
 * Coverage gaps are reported, not fatal — a partial upstream source is a data
 * problem to fix in the ingest layer, not a reason to hide the result.
 * Behaviour failures ARE fatal: they mean the artifact and the spec algorithm
 * disagree.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const lang = process.argv.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? "el";
const packDir = path.join(repoRoot, "artifacts", lang);

const raw = gunzipSync(readFileSync(path.join(packDir, "forms.tsv.gz"))).toString("utf8");
const entries: IndexEntry[] = [];
for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  const [surface, lemmaId] = line.split("\t");
  if (!surface || !lemmaId) continue;
  entries.push({ lemmaId, lang, surface });
}
console.log(`pack: ${packDir}`);
console.log(`surfaces: ${entries.length}`);

const cfg = loadLanguageConfig(lang);
const index = new SearchIndex(entries, { [lang]: cfg });

const coreFile = path.join(repoRoot, "pipeline", `core-vocab.${lang}.txt`);
const core = readFileSync(coreFile, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));

const missing = core.filter((lemma) => !entries.some((e) => e.surface === lemma));
console.log(
  `\ncore vocabulary: ${core.length - missing.length}/${core.length} present ` +
    `(${(((core.length - missing.length) / core.length) * 100).toFixed(0)}%)`,
);
if (missing.length) console.log(`absent: ${missing.join(", ")}`);

console.log("\nbehaviour checks (accent-stripped query must resolve to its lemma):");
const candidates = [...new Set(entries.map((e) => e.lemmaId))].slice(0, 400);
let checked = 0;
let failures = 0;

for (const lemmaId of candidates) {
  const surface = entries.find((e) => e.lemmaId === lemmaId)?.surface;
  if (!surface) continue;
  const stripped = normalize(surface, cfg.search);
  if (stripped === surface) continue; // only exercise the accent-stripping path
  const hits = index.search(lang, stripped);
  checked++;
  // The lemma must be among the hits. A query may legitimately return several
  // homographs (δύο "two" and δυο "pair" are different words), so we assert
  // membership, not uniqueness.
  const found = hits.some((h) => h.lemmaId === lemmaId && h.stage <= 3);
  if (!found) {
    failures++;
    if (failures <= 5) {
      console.log(`  FAIL ${surface} -> query "${stripped}" gave ${hits.length} hits`);
    }
  }
  if (checked >= 25) break;
}

console.log(`  ${checked - failures}/${checked} accent-stripped queries resolved correctly`);
if (checked === 0) console.log("  (no accented surfaces sampled)");

console.log("\nsample queries:");
for (const q of core.slice(0, 4)) {
  if (missing.includes(q)) {
    console.log(`  ${q.padEnd(12)} absent from this source (fuzzy fallback only)`);
    continue;
  }
  const hits = index.search(lang, q);
  console.log(
    `  ${q.padEnd(12)} ${hits.length ? `stage ${hits[0]!.stage}, ${hits.length} hits` : "no hits"}`,
  );
}

if (failures > 0) process.exit(1);
