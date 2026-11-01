import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { LanguageConfig } from "./index.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load a per-language feature configuration. Configs are data, not code, so a
 * renderer never needs to know anything about a specific language.
 */
export function loadLanguageConfig(lang: string): LanguageConfig {
  const p = path.resolve(here, `../features/${lang}.json`);
  const raw = readFileSync(p, "utf8");
  const cfg = JSON.parse(raw) as LanguageConfig;
  if (cfg.lang !== lang) {
    throw new Error(`config ${p} declares lang=${cfg.lang}, expected ${lang}`);
  }
  return cfg;
}
