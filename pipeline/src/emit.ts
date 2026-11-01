import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Manifest, ManifestSource } from "@klisi/schema";
import type { ParsedCorpus } from "./unimorph.js";

export interface EmitResult {
  dir: string;
  manifest: Manifest;
  bytes: number;
}

function hash(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Emit an artifact pack. Files are gzip-compressed JSONL/TSV plus a manifest
 * that hashes every file, so a client can verify integrity before reading.
 */
export function emitArtifact(
  outDir: string,
  lang: string,
  corpus: ParsedCorpus,
  sources: ManifestSource[],
): EmitResult {
  mkdirSync(outDir, { recursive: true });
  const files: Manifest["files"] = [];
  let total = 0;

  function write(rel: string, content: string): void {
    const buf = gzipSync(Buffer.from(content, "utf8"), { level: 9 });
    writeFileSync(path.join(outDir, rel), buf);
    files.push({ path: rel, sha256: hash(buf), bytes: buf.byteLength });
    total += buf.byteLength;
  }

  write(
    "lexemes.jsonl.gz",
    corpus.lexemes.map((l) => JSON.stringify(l)).join("\n") + "\n",
  );
  write(
    "paradigms.jsonl.gz",
    corpus.paradigms.map((p) => JSON.stringify(p)).join("\n") + "\n",
  );
  write(
    "forms.tsv.gz",
    corpus.forms
      .map((f) => `${f.surface}\t${f.lemmaId}\t${f.features}\t${f.roman ?? ""}`)
      .join("\n") + "\n",
  );

  const manifest: Manifest = {
    schemaVersion: 1,
    lang,
    buildId: `${lang}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    files,
    sources,
    counts: {
      lexemes: corpus.lexemes.length,
      paradigms: corpus.paradigms.length,
      cells: corpus.paradigms.reduce((n, p) => n + p.cells.length, 0),
      forms: corpus.forms.length,
    },
  };

  const manifestBuf = Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8");
  writeFileSync(path.join(outDir, "manifest.json"), manifestBuf);
  total += manifestBuf.byteLength;

  return { dir: outDir, manifest, bytes: total };
}
