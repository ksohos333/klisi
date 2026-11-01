# Klisi — phased implementation plan

Status: Phase 0 in progress.
Owner: @ksohos333 (native-level Greek C1, fluent English; certifies the Greek content).

## Product in one line

An offline-first, zero-telemetry Greek↔English learning reference: full verb
conjugation and noun/adjective declension, a bilingual dictionary, examples,
and generated drills — free, open source, no ads, no tracking.

## The two decisions everything else hangs off

1. **The artifact is the product.** One versioned, checksummed data pack per
   language. Clients are readers.
2. **The contract between clients is data, not shared code.** Only `search` and
   `drill` are reimplemented per client language; both have normative specs and a
   shared golden-vector suite.

## Phase map

| Phase | Scope | Size | Depends on |
|---|---|---|---|
| 0 | Contracts, schema, monorepo skeleton, CI | S (1–2 wk) | — |
| 1 | Modern Greek pipeline (el) | L (4–6 wk) | 0 |
| 2 | Web app core, static/offline | L (4–6 wk) | 1 |
| 3 | Drills, SRS, learning paths | M (3–4 wk) | 2 |
| 4 | English + academic-English lane | M–L (3–5 wk) | 1, 2 |
| 5 | Mobile KMP offline client | L (5–8 wk) | 1–4 |
| 6 | Go self-hosted server (optional) | S–M (2–3 wk) | 1 |
| 7 | Ancient Greek lane (grc) | L (4–6 wk) | 1 |
| 8 | On-device sentence translation | M–L (optional) | 1 |

Sizes are estimates for one developer, not commitments.

---

## Phase 0 — Contracts & skeleton

Nothing ships to users. This phase makes every later phase cheap.

Deliverables:

- Monorepo: `packages/schema`, `packages/spec`, `pipeline/`, `apps/`, `docs/`
- Per-language feature configs: `features.el.json`, `features.en.json`,
  `features.grc.json`. Each defines the POS set, the feature axes, the axis order
  for rendering, and the label sets. **Renderers contain no language knowledge.**
- `schema/lexeme.schema.json`, `schema/paradigm.schema.json`
- `spec/algorithms/search.md`: normative algorithm
- `spec/vectors/search-cases.json`: golden cases — accent errors, digraph folds,
  typos, romanization, IPA, homophone disambiguation
- ADRs 0001–0005
- CI: lint, typecheck, schema validation, spec conformance
- Repo hygiene: LICENSE (AGPL-3.0), NOTICE, ATTRIBUTION, CONTRIBUTING, and a
  **Report a conjugation error** issue template

Exit criteria:

- A placeholder artifact validates against the schema.
- The TypeScript reference search passes 100% of the vectors.
- CI green.
- A native speaker can file a correction and it lands in a defined queue.

## Phase 1 — Modern Greek pipeline

Ingest, each pinned by SHA256 in `sources.lock.json` (source priority was
**determined by measurement** — see `docs/PHASE1-DATA.md`):

1. **kaikki Greek — primary.** 85,425 entries, 100% Modern Greek, with
   already-expanded declension and conjugation tables, so we get attested
   surface forms per feature cell without reimplementing Wiktionary's Lua
   morphology modules. Also carries senses, glosses, example sentences with
   translations, IPA, hyphenation and headword templates.
2. **UniMorph `ell` — supplementary.** Feature-tagged forms for lemmas both
   sources have, and a cross-check on feature assignment. Not a spine: it covers
   only 54% of core vocabulary.
3. **el.wiktionary dump — on demand.** Not needed for the spine. Consulted for
   the stem tuple behind a paradigm, and for corrections the tables cannot
   express.

The ingest must handle **several** template families, not just `el-κλίσ-*`, and
must report per-family coverage. `pipeline/core-vocab.el.txt` is the coverage
alarm: a source below the bar is never promoted to primary.

Derived periphrases (future, subjunctive, perfect) are computed in the
pipeline from cells the source does provide, each marked with the rule that
produced it. An attested cell is never overwritten.

Model:

- Verb = `{lemma, class, stems{present, aorist, participle}, prefixes[], voicePair, features}`
- Noun/adjective = `{lemma, class, stems[], gender, degree, voicePair}`
- `voicePair` links γράφω ↔ γράφομαι so one page shows Active and Middle/Passive
  together. Greek Wiktionary treats voice as separate lemmas; the product must not
  inherit that split.
- Ministry taxonomy mapping in `docs/TAXONOMY.md`, reviewed by the owner.

Validator (fails CI):

- Paradigm completeness: no gaps for any lemma's POS/class combination.
- Form↔lemma round-trip; monotonic-accent sanity; conflicting-surface detection.
- Coverage report against every verb class and noun class.
- Core-vocabulary coverage alarm per source (`pipeline/core-vocab.el.txt`).
- Assert whether kaikki's "Greek" file contains `grc` entries or is `el`-only.

Native review:

- Stratified 200-item review sheet (every verb class × 2, every noun class × 1,
  top-500 frequent) → printable HTML → native verification → `corrections/`.
- Round-trip: correction → rebuilt artifact → regression test on that paradigm.

Exit: every verb and noun class has ≥2 native-verified exemplars; zero
unexplained gaps; corrections pipeline proven end-to-end.

**Status (2026-11-01):** pipeline complete and measured. 85,425 lexemes,
492,741 surfaces, 12.0 MB pack, 0 schema errors, 39 gaps (all genuinely
irregular verbs). 24/24 core vocabulary. Awaiting the native-speaker review
batch and the web app (Phase 2).

## Phase 2 — Web app core

- Next.js, `output: 'export'`. The full product must run from a folder offline.
- Search UI implementing `spec/algorithms/search.md` against the artifact.
- Pages: `/el/verb/…`, `/el/noun/…`, `/el/adj/…`, `/el/dict/…`, mirrored `/en/…`.
  Verb page: full table, principal-parts strip, Active|Passive tabs, IPA,
  examples, glossary cross-links.
- Bilingual UI (Greek + English), Greek default.
- Anki export of conjugation tables.
- No external requests at runtime; zero telemetry; CSP enforced.

Exit: full product from a static folder offline; no network egress in a verified
audit; Anki export round-trips.

## Phase 3 — Drills, SRS, learning paths

- Drill generator from artifact cells: multiple-choice, accent-tolerant type-in,
  listen→type, lemma↔form matching, "which tense is this?".
- FSRS scheduler, local storage only. No account, no sync requirement.
- MoE-aligned grammar units with unlock conditions; achievements.
- Progress export/import as a file.

Exit: drills fully offline; SRS state stable across export/import.

## Phase 4 — English + academic lane

- English morphology from UniMorph `eng`.
- English dictionary: stream-filter kaikki English (3.2 GB → subset) or take
  verbs from en.wiktionary templates. Never persist the full dump.
- Bidirectional Greek↔English linking via shared translation IDs. This is the
  interoperability payoff: one search box, both languages, cross-links.
- Academic English: our own wordlists and reading exercises; listening via TTS.
- ETS trademark safety: do not use "TOEFL" in product or module names. No ETS
  materials. If the mark appears in descriptive prose, include the required
  notice (see `docs/LEGAL.md`).

Exit: English verb/noun/adjective pages live; search resolves in both
directions; academic drills offline.

## Phase 5 — Mobile (KMP, offline)

- Compose Multiplatform (Android + iOS + desktop), shared artifact reader, spec
  implementations in Kotlin passing the **same** golden vectors.
- Offline by construction: artifact bundled or side-loaded as a pack.
- Local SRS, no account, no telemetry.
- iOS + AGPL is a decision point, not a detail (see ADR 0003 and `docs/LEGAL.md`).

Exit: app passes the identical vector suite; artifact manifest hash matches the
web exactly; zero network required.

## Phase 6 — Go self-hosted server (optional)

Single binary: serves the artifact, hosts the static web export, optional
community sync for corrections. **Explicitly optional** — product value must not
depend on it. This is what makes "no cloud" real rather than aspirational.

Exit: `klisi serve` runs with no external dependencies.

## Phase 7 — Ancient Greek lane

- UniMorph `grc` has **no verbs** (verified: 44,026 lines, N + ADJ only).
  Ancient verbs come from Perseus/Morpheus reverse-inflection dictionaries
  (CC BY-SA) or kaikki Ancient Greek (390 MB).
- Polytonic normalization; dual number (`DU`); four cases + vocative.
- Separate tab, separate language pack — proves the schema generalizes.

Exit: Ancient verb paradigms complete; polytonic rendering native-verified.

## Phase 8 — On-device sentence translation

Fine-tuned small seq2seq or instruct model (Greek↔English) running locally:
llama.cpp / MLX / ONNX. Model download is optional and user-initiated; the
artifact glossary remains the default path. Label it experimental at this size.

Exit: model runs fully on-device; glossary remains the default.

---

## Cross-cutting constraints

1. TypeScript for pipeline + web. No third language without an ADR.
2. Artifact = contract: versioned, checksummed, per-file licensed.
3. Artifact size budget: < 50 MB per language pack, compressed.
4. Static-first web; client-side search over the artifact.
5. Zero-account core: no login for reading, searching, or drilling.
6. No telemetry: no analytics, no crash reporting, no third-party CDNs on the
   critical path. CI-enforced.
7. Multi-language schema from day one; no language conditionals in renderers.
8. License separation is structural (see `NOTICE`).
9. Pinned sources; reproducible builds; corrections as an overlay.
10. Validator gates CI, plus a native-speaker review queue.
11. Pipeline caches on `/` (or another volume with space), not on a nearly-full
    `/home`. Stream-filter the 3.2 GB English dump; never persist it.

## Open decisions

- Greek variety scope: standard Modern only (default), or also Katharevousa?
- Monetization form: donation-first with an optional store purchase for the
  mobile app (default), or a gated premium tier? A server-gated tier reintroduces
  exactly the accounts and phone-home this project rejects.
- iOS distribution: grant a permissive license for the iOS client, keep AGPL
  everywhere, or defer iOS.
