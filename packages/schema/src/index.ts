/**
 * Klisi — language-neutral artifact types.
 *
 * These types are the contract between the pipeline and every client. They are
 * deliberately free of any language-specific knowledge: what an axis means for a
 * given language lives in `features/<lang>.json`, not here.
 */

export type Bilingual = { el: string; en: string };

export interface AxisValue extends Bilingual {}

export interface AxisConfig {
  label: Bilingual;
  values: Record<string, AxisValue>;
}

export interface GridConfig {
  /** Axes that form the row groups of a paradigm table. */
  groupBy: string[];
  /** Axes that form the columns. */
  columns: string[];
  /** Cells that are not part of the person×number grid (verbs only). */
  nonFinite?: string[];
}

export interface SearchConfig {
  stripCombining: boolean;
  finalSigmaFold: boolean;
  /** Ordered [from, to] digraph folds applied by the phonetic stage. */
  folds: [string, string][];
  /** Latin-script to native-script map used by the romanization stage. */
  romanization: Record<string, string>;
}

export interface LanguageConfig {
  lang: string;
  name: string;
  endonym: string;
  script: string;
  pos: string[];
  axes: Record<string, AxisConfig>;
  grids: Record<string, GridConfig>;
  /** Display labels keyed by "<aspect>;<tense>" (Greek) or empty. */
  tenseLabels: Record<string, Bilingual>;
  teachingNotes: Record<string, Bilingual>;
  search: SearchConfig;
}

export interface Translation {
  lang: string;
  text: string;
}

export interface Example {
  text: string;
  translation?: string | null;
  /** Latin-script rendering, for learners who cannot yet read the native script. */
  roman?: string | null;
  ref?: string | null;
}

export interface Sense {
  gloss: string;
  tags?: string[] | null;
  translations?: Translation[] | null;
  examples?: Example[] | null;
}

export type LinkType = "voice" | "translation" | "variant" | "related";

export interface Link {
  type: LinkType;
  target: string;
}

export interface ReviewMark {
  by: string;
  at: string;
}

export interface SourceRef {
  name: string;
  ref?: string | null;
  license?: string | null;
}

export interface Lexeme {
  /** Stable id: `<lang>:<pos>:<lemma>`. */
  id: string;
  lang: string;
  lemma: string;
  pos: string;
  class?: string | null;
  gender?: string | null;
  stems?: Record<string, string | string[]> | null;
  /** Alternative spellings of this lemma (e.g. δυο for δύο). */
  variants?: string[] | null;
  /** Derived property, never a hand-maintained flag. */
  irregular?: boolean | null;
  senses?: Sense[] | null;
  links?: Link[] | null;
  ipa?: string | null;
  romanization?: string | null;
  syllabification?: string | null;
  reviewed?: ReviewMark | null;
  source: SourceRef;
}

export interface Cell {
  features: Record<string, string>;
  /** All accepted variants; index 0 is the primary form. */
  forms: string[];
  /** true = linguistically absent, as opposed to missing data. */
  absent?: boolean | null;
  note?: string | null;
  /** Rule that produced this cell when it was derived rather than attested. */
  derived?: string | null;
  irregular?: boolean | null;
  reviewed?: ReviewMark | null;
}

export interface Paradigm {
  lemmaId: string;
  grid: GridConfig;
  cells: Cell[];
}

export interface ManifestFile {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ManifestSource {
  name: string;
  url: string;
  license: string;
  sha256?: string | null;
  retrievedAt?: string | null;
}

export interface Manifest {
  schemaVersion: 1;
  lang: string;
  buildId: string;
  createdAt: string;
  files: ManifestFile[];
  sources: ManifestSource[];
  counts?: Record<string, number> | null;
}

export { validateArtifact } from "./validate.js";
export { loadLanguageConfig } from "./config.js";
