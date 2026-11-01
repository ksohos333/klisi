# Search — normative algorithm

**Status:** normative. Every client (TypeScript, Kotlin, Go) must implement this
algorithm and pass `vectors/search-cases.json` unchanged.

The goal is "search that forgives": a learner types what they heard, or an
inflected form, or a romanization, and gets the canonical lemma. Ranking is by
stage, not by score across stages.

## Terms

- **Index**: a set of entries `{lemmaId, lang, surface, romanization?, ipa?}`.
  Entries are built from artifact surfaces (lemmas *and* inflected forms), so an
  inflected query resolves to its lemma.
- **Stage**: an ordered matching strategy, numbered 1–7 below.
- **Hit**: `{lemmaId, surface, stage, score}`.

## Rule 1 — Stages are tried in order and short-circuit

Evaluate stages in ascending order. **Return the hits of the first stage that
produces at least one hit.** Do not merge hits from later stages.

Rationale: a stage-2 accent-insensitive match is a better answer than a stage-6
fuzzy match, and mixing them buries the right answer under noise.

### Exception: stages 1 and 2 are one canonical-match stage

Stages 1 (exact) and 2 (normalized) express **one intent** — "find this word,
ignoring case and accent" — so they are evaluated together:

- Collect exact matches and normalized matches.
- If either is non-empty, return the union, exact matches first.
- The reported stage is **1** when at least one exact match exists, otherwise **2**.
  Individual hits keep their own stage (1 for exact, 2 for normalized), so a
  client can still tell them apart.

Rationale: without this, an exact match on an unaccented spelling shadows the
accented spelling of a *different* lemma. Typing `δυο` must reach `δύο`
("two") as well as `δυο` ("pair"); short-circuiting at stage 1 would make the
accented word unreachable.

All other stages short-circuit strictly.

## Rule 2 — Normalization is applied to both sides

`normalize(s)`:

1. `s.normalize("NFC")`
2. lowercase (locale-independent)
3. if `search.finalSigmaFold`: replace final sigma `ς` with `σ` **everywhere**
   (so ς and σ unify)
4. if `search.stripCombining`: `s.normalize("NFD")`, remove all `\p{M}` marks,
   then `normalize("NFC")`

The index stores `normalize(surface)` precomputed. Queries go through the same
function.

## Stages

| # | Name | Match |
|---|---|---|
| 1 | Exact | `query == surface` |
| 2 | Normalized | `normalize(query) == normalize(surface)` |
| 3 | Phonetic fold | `fold(normalize(query)) == fold(normalize(surface))` |
| 4 | Romanization | Query in Latin script matches the entry's romanization, or maps onto the surface |
| 5 | IPA | `normalize(query) == normalize(ipa)` |
| 6 | Fuzzy | Trigram similarity over normalized forms, threshold ≥ 0.5 |
| 7 | Prefix | `normalize(surface)` starts with `normalize(query)`, query length ≥ 2 |

### Stage 3 — Phonetic fold

`fold(s)` applies the language config's `search.folds` list **in the order
given**, each as a global, non-overlapping, left-to-right replacement of the
`from` digraph by the `to` string. Order matters: the config lists longer or
more specific folds first. Applied to normalized input on both sides.

Greek folds cover the common heard-spelling confusions: μπ→β, ντ→δ, γκ→γ, γγ→γ,
τσ→τζ, ου→υ, ει→ι, οι→ι, η→ι, ω→ο, αι→ε, υι→ι.

### Stage 4 — Romanization

Two sub-strategies, either of which yields a hit:

- (a) the entry has a `romanization` and `normalize(romanization)` equals
  `normalize(query)`;
- (b) the query is Latin-script: transliterate it to the native script using
  `search.romanization` with **greedy longest-match** over the map keys, then
  compare the result with `fold(normalize(surface))`.

Stage 4 only runs when at least one entry has a romanization or the language
config declares a romanization map.

### Stage 6 — Fuzzy

Compute trigram sets of `normalize(query)` and of each `normalize(surface)`.
Score = Jaccard similarity `|A ∩ B| / |A ∪ B|`. Keep hits with score ≥ 0.5,
ordered by descending score, then by ascending surface length, then
lexicographically. Strings shorter than 3 characters never reach this stage.

### Stage 7 — Prefix

Prefix matches are ordered by ascending surface length, then lexicographically.
This is the fallback that powers search-as-you-type.

> Ordering note: stages 4 (romanization) and 5 (IPA) are exact-index lookups and
> deliberately sit **before** stage 6 (fuzzy). An earlier draft placed fuzzy
> first; exact index hits are higher-confidence and should win.

## Rule 3 — Ties return every candidate

If several lemmas tie at the winning stage, **all** are returned. Never silently
pick one: homophones are exactly the case the learner needs disambiguated.

### Implementation note on large packs

A full language pack has on the order of 200,000 surfaces. Stage 6 must not
precompute trigram sets for every entry at index-build time; compute them lazily
and cache them, since the fuzzy stage only runs after all exact-index stages
have failed. Stages 1–5 and 7 are lookups or linear scans and stay cheap.

## Rule 4 — Language scoping

Entries carry a language. A search is scoped to one language unless the caller
explicitly asks for both. Results never silently mix languages.

## Rule 5 — No telemetry

The algorithm performs no I/O and no network access. A client must not add
query logging, analytics, or "did you mean" beacons to it.

## Conformance

`vectors/search-cases.json` contains a fixture index and cases. Each case names
the query, the expected winning stage, and the lemmas that must be present.
A conformant implementation must:

- return the expected winning stage,
- include every expected lemma,
- never return a lemma from a later stage than the winning one.
