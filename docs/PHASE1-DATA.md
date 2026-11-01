# Phase 1 data findings (measured, not assumed)

These are measured facts about the candidate sources, recorded because they change
the ingest strategy. Check dates against `sources.lock.json`.

## UniMorph `ell` is not a usable primary spine

Measured 2026-11-01 against the pinned download
(`sha256=68f71b889fa29d31d975ebbc29f9f0f1b3a2dd6cca4f40a21b2c06f443811941`):

- 211,923 lines, 11,907 distinct lemmas, 218,403 surfaces after parsing.
- **Only 13 of 24 high-frequency core lemmas are present (54%).**
- Absent: γράφω, σκύλος, δρόμος, άνθρωπος, καλός, παιδί, μητέρα, που, θέλω,
  βλέπω, πίνω.
- Present: είμαι, έχω, κάνω, λέω, παίρνω, δένω, τρώω, νερό, σπίτι, γυναίκα,
  άντρας, δροσίζω, μαγκιά.

The dataset is Wikipedia-derived and its lemma selection does not cover ordinary
everyday vocabulary. It is still useful as a **source of feature-tagged forms for
the lemmas it does contain**, and its tag vocabulary is the canonical one for our
feature schema — but it cannot be the primary source of a learner's dictionary.

Reproduce with:

```
pnpm pipeline -- --lang=el
pnpm --filter @klisi/pipeline exec tsx src/smoke.ts --lang=el
```

## Greek Wiktionary is the primary source

Verified by direct API query: all eleven lemmas missing from UniMorph
(θέλω, βλέπω, πίνω, καλός, παιδί, μητέρα, άνθρωπος, δρόμος, σκύλος, που, γράφω)
exist as entries in el.wiktionary, and the conjugation machinery is present
(`{{el-κλίσ-'δένω'|...}}` for verbs, `{{el-κλίση-'X'}}` for nominals).

Caveat measured at the same time: not every lemma uses the `el-κλίσ-*` template
family. θέλω, for example, does not. The Phase 1 ingest must therefore handle
**several** template families and must report per-family coverage instead of
assuming one uniform shape.

## Consequence for Phase 1

Source priority is inverted relative to the first draft of the plan:

1. **el.wiktionary dump — primary.** Stem tuples, declension classes, IPA,
   syllabification, examples, and the lemma list itself.
2. **UniMorph `ell` — supplementary.** Feature-tagged forms for lemmas that
   Wiktionary also has; a cross-check on feature assignment, not a spine.
3. **kaikki Greek — senses, translations, examples.**

The coverage alarm (`pipeline/core-vocab.el.txt`) exists so this class of problem
fails loudly in the diagnostic rather than silently in the product. A source that
drops below the core-vocabulary bar must not be promoted to primary.

## Ancient Greek

UniMorph `grc` contains **no verbs** (44,026 lines, nouns and adjectives only).
Ancient Greek verbs need a different source in Phase 7.
