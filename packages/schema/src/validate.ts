import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import type { Lexeme, Manifest, Paradigm } from "./index.js";

// ajv and ajv-formats are CommonJS. createRequire keeps the types intact under
// NodeNext resolution, where a default import would bind to the module namespace.
const require = createRequire(import.meta.url);
// Use the draft 2020-12 build: our schemas declare `$schema: 2020-12`, which the
// default (draft-07) Ajv instance refuses to compile.
const Ajv = require("ajv/dist/2020") as typeof import("ajv").default;
const addFormats = require("ajv-formats") as typeof import("ajv-formats").default;

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.resolve(here, "../schemas");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function loadSchema(name: string): object {
  return JSON.parse(readFileSync(path.join(schemaDir, `${name}.schema.json`), "utf8"));
}

const validators = {
  lexeme: ajv.compile(loadSchema("lexeme")),
  paradigm: ajv.compile(loadSchema("paradigm")),
  manifest: ajv.compile(loadSchema("manifest")),
} as const;

export type ArtifactKind = keyof typeof validators;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Validate one artifact record against its JSON Schema. The validator is the
 * gate: a record that does not validate must not reach a client.
 */
export function validateArtifact(kind: ArtifactKind, value: unknown): ValidationResult {
  const validate = validators[kind];
  const ok = validate(value) as boolean;
  if (ok) return { ok: true, errors: [] };
  const errors = (validate.errors ?? []).map(
    (e: { instancePath: string; message?: string }) =>
      `${e.instancePath || "/"} ${e.message ?? "invalid"}`,
  );
  return { ok: false, errors };
}

/** Convenience typed wrappers, so call sites get both checking and narrowing. */
export function validateLexeme(value: unknown): value is Lexeme {
  return validateArtifact("lexeme", value).ok;
}
export function validateParadigm(value: unknown): value is Paradigm {
  return validateArtifact("paradigm", value).ok;
}
export function validateManifest(value: unknown): value is Manifest {
  return validateArtifact("manifest", value).ok;
}
