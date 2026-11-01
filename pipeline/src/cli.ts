import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSource, readLock } from "./lock.js";
import { parseUnimorphFile } from "./unimorph.js";
import { emitArtifact } from "./emit.js";
import { validateCorpus } from "./validate.js";
import { applyCorrections, parseCorrections } from "./corrections.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");

const args = process.argv.slice(2);
const lang = args.find((a) => a.startsWith("--lang="))?.split("=")[1] ?? "el";
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : null;
const offline = args.includes("--offline");

const SOURCE_BY_LANG: Record<string, string> = {
  el: "unimorph-ell",
  grc: "unimorph-grc",
  en: "unimorph-eng",
};

async function main(): Promise<void> {
  const key = SOURCE_BY_LANG[lang];
  if (!key) throw new Error(`no UniMorph source configured for lang=${lang}`);

  const lock = readLock(repoRoot);
  const spec = lock.sources[key]!;
  const file = await fetchSource(repoRoot, key, { offline });
  console.log(`ingesting ${spec.name} from ${file}`);

  const corpus = parseUnimorphFile(file, lang, key);
  if (limit) {
    corpus.lexemes = corpus.lexemes.slice(0, limit);
    const keep = new Set(corpus.lexemes.map((l) => l.id));
    corpus.paradigms = corpus.paradigms.filter((p) => keep.has(p.lemmaId));
    corpus.forms = corpus.forms.filter((f) => keep.has(f.lemmaId));
  }

  console.log(
    `parsed: ${corpus.lexemes.length} lemmas, ${corpus.forms.length} surfaces, ` +
      `${corpus.skipped} skipped lines`,
  );

  const corrections = parseCorrections(path.join(repoRoot, "corrections", `${lang}.jsonl`));
  if (corrections.length) {
    const res = applyCorrections(corpus, corrections);
    console.log(`corrections: ${res.applied} applied, ${res.unmatched.length} unmatched`);
    for (const u of res.unmatched) console.warn(`  unmatched correction: ${u}`);
  }

  const report = validateCorpus(corpus);
  console.log(`validator: ${JSON.stringify(report.summary)}`);
  if (report.schemaErrors.length) {
    console.error(report.schemaErrors.slice(0, 20).join("\n"));
    throw new Error(`${report.schemaErrors.length} schema/round-trip violations`);
  }
  if (report.gaps.length) {
    console.log(`paradigm gaps (informational): ${report.gaps.length}`);
    for (const g of report.gaps.slice(0, 10)) console.log(`  ${g}`);
  }

  const outDir = path.join(repoRoot, "artifacts", lang);
  const result = emitArtifact(outDir, lang, corpus, [
    {
      name: spec.name,
      url: spec.url,
      license: spec.license,
      sha256: spec.sha256,
      retrievedAt: spec.retrievedAt,
    },
  ]);

  const mb = (result.bytes / 1024 / 1024).toFixed(2);
  console.log(`emitted ${outDir} — ${mb} MB (budget: 50 MB)`);
  if (result.bytes > 50 * 1024 * 1024) {
    throw new Error(`artifact exceeds the 50 MB size budget (${mb} MB)`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
