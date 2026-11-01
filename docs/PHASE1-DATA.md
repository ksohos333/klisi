# Phase 1 data findings (measured, not assumed)

These are measured facts about the candidate sources, recorded because they change
the ingest strategy. Check dates against `sources.lock.json`.

## kaikki Greek is the spine

kaikki's Modern Greek dump is a Wiktextract extraction of the English
Wiktionary, and it carries **already-expanded** inflection tables. That matters:
we do not have to reimplement the conjugation rules that live in Wiktionary's Lua
modules (`Module:el-verb-conj`, `Module:el-nouns-decl`). The extractor's tables
give us attested surface forms with clean feature tags.

Measured 2026-11-01 against
`sha256=6a6a930ef6fd2a011ccebda89c82ca73bb62456cd026cea583358c216aa173d7`:

| | |
|---|---|
| Entries | 85,425 |
| Language mix | **100% `el`** — the file contains no Ancient Greek |
| Entries with a declension table | 14,624 nouns, 5,995 adjectives, 1,342 names |
| Entries with a conjugation table | 2,437 verbs |
| Core-vocabulary coverage | **24/24 (100%)** |
| Final artifact | 85,425 lexemes · 492,741 surfaces · **12.0 MB** compressed |

Per-form data available: case, number, gender, degree, person, aspect, tense,
mood, voice, romanization, plus IPA, hyphenation, headword templates, senses,
glosses and example sentences with translations.

### What the source does *not* give

The periphrastic tenses are absent from the expanded tables. They are not
missing from the grammar — they are missing from the *extraction*. We derive
them (see below) rather than shipping holes.

## UniMorph `ell` is a supplementary source, not the spine

Measured against
`sha256=68f71b889fa29d31d975ebbc29f9f0f1b3a2dd6cca4f40a21b2c06f443811941`:

- 211,923 lines, 11,907 distinct lemmas, 218,403 surfaces.
- **Only 13 of 24 high-frequency core lemmas are present (54%).**
- Absent: γράφω, σκύλος, δρόμος, άνθρωπος, καλός, παιδί, μητέρα, που, θέλω,
  βλέπω, πίνω.
- Present: είμαι, έχω, κάνω, λέω, παίρνω, δένω, τρώω, νερό, σπίτι, γυναίκα,
  άντρας, δροσίζω, μαγκιά.

The dataset is Wikipedia-derived and its lemma selection does not cover ordinary
everyday vocabulary. It remains useful as a **cross-check on feature
assignment** for lemmas both sources have, and its tag vocabulary is the one our
feature schema is modelled on.

Reproduce with:

```
pnpm pipeline -- --lang=el
pnpm --filter @klisi/pipeline exec tsx src/smoke.ts --lang=el
```

## Greek Wiktionary is the source *behind* kaikki

Verified by direct API query: all eleven lemmas missing from UniMorph exist as
entries in el.wiktionary, and the conjugation machinery is present
(`{{el-κλίσ-'δένω'|...}}` for verbs, `{{el-κλίση-'X'}}` for nominals).

Caveat measured at the same time: not every lemma uses the `el-κλίσ-*` template
family (θέλω, for example, does not), so any direct dump parser must handle
**several** template families and report per-family coverage. kaikki sidesteps
this by delivering rendered tables.

The 107 MB el.wiktionary dump is therefore **not needed for the spine**. It
remains the source to consult when we need the *stem tuple* behind a paradigm
(the "explain the pattern" feature) or a correction the tables cannot express.

## Derivation: the periphrastic tenses

The expanded tables have no future, no subjunctive and no perfect. All three
are regular periphrases of cells we already have, so the pipeline derives them
and marks each derived cell with the rule that produced it:

| Derived | Rule | Example |
|---|---|---|
| Μέλλοντας | θα + ενεστώτας | θα γράφω |
| Μέλλοντας (στιγμιαίος) | θα + αορίστου υποτακτική | θα γράψω |
| Συντακτικός | να + ενεστώτας | να γράφω |
| Παρακείμενος | έχω + απαρέμφατο αορίστου | έχω γράψει |
| Υπερσυντέλικος | είχα + απαρέμφατο αορίστου | είχα γράψει |
| Μέλλοντας συντελεσμένος | θα + παρακείμενος | θα έχω γράψει |

Effect on the real corpus: **42,563 future cells, 30,185 subjunctive cells and
21,168 perfect cells derived**, and paradigm gaps fell from **4,812 to 39**.

An attested cell is never overwritten. A derived cell always carries
`derived: "<rule>"` so a reviewer can tell generated from attested at a glance.

The passive perfect is deliberately **not** derived: it is a different
construction (είμαι + passive participle, with gender and number agreement), so
guessing at it would be wrong.

## Remaining 39 gaps are real

They are irregular and impersonal verbs — πρέπει, πρόκειται, άγχομαι,
χιονίζει, αφορά — where the source itself does not enumerate every person.
These are exactly what the native-speaker review queue is for, not pipeline
bugs.

## Ancient Greek

UniMorph `grc` contains **no verbs** (44,026 lines, nouns and adjectives only).
Ancient Greek verbs need a different source in Phase 7.
