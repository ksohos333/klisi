import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface SourceSpec {
  lang: string;
  name: string;
  url: string;
  license: string;
  licenseUrl: string;
  sha256: string | null;
  retrievedAt: string | null;
  comment?: string;
}

export interface Lockfile {
  version: number;
  note: string;
  cacheDir: string;
  sources: Record<string, SourceSpec>;
}

export function lockPath(repoRoot: string): string {
  return path.join(repoRoot, "pipeline", "sources.lock.json");
}

export function readLock(repoRoot: string): Lockfile {
  return JSON.parse(readFileSync(lockPath(repoRoot), "utf8")) as Lockfile;
}

export function writeLock(repoRoot: string, lock: Lockfile): void {
  writeFileSync(lockPath(repoRoot), JSON.stringify(lock, null, 2) + "\n");
}

export async function sha256File(p: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(p)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

/**
 * Fetch a pinned source into the cache directory, verifying its hash.
 *
 * First retrieval records the hash and date in sources.lock.json (that is the
 * pinning step). Later runs must match the recorded hash — a silent upstream
 * change is a build failure, not a silent content change.
 */
export async function fetchSource(
  repoRoot: string,
  key: string,
  opts: { offline?: boolean } = {},
): Promise<string> {
  const lock = readLock(repoRoot);
  const spec = lock.sources[key];
  if (!spec) throw new Error(`unknown source: ${key}`);

  const cacheDir = process.env.KLISI_CACHE_DIR ?? lock.cacheDir;
  mkdirSync(cacheDir, { recursive: true });
  const dest = path.join(cacheDir, `${key}.raw`);

  if (existsSync(dest)) {
    const actual = await sha256File(dest);
    if (spec.sha256 && actual !== spec.sha256) {
      throw new Error(
        `${key}: cached file hash ${actual} != pinned ${spec.sha256}. ` +
          `Delete ${dest} and re-run with --pin to accept the new upstream content deliberately.`,
      );
    }
    return dest;
  }

  if (opts.offline) {
    throw new Error(`${key}: not cached and --offline was set (${dest})`);
  }

  const res = await fetch(spec.url);
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status} for ${spec.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);

  const actual = createHash("sha256").update(buf).digest("hex");
  if (spec.sha256 && actual !== spec.sha256) {
    throw new Error(
      `${key}: downloaded hash ${actual} != pinned ${spec.sha256}. ` +
        `Upstream changed. Review the diff before updating sources.lock.json.`,
    );
  }

  if (!spec.sha256) {
    spec.sha256 = actual;
    spec.retrievedAt = new Date().toISOString();
    writeLock(repoRoot, lock);
    console.log(`pinned ${key} sha256=${actual}`);
  }

  return dest;
}
