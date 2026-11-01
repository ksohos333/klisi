# klisi

*κλίση — conjugation, declension*

The Greek language reference that learners of other languages take for granted. **Status: Phase 0 (contracts and pipeline skeleton) built; Phase 1 (Modern Greek data) next.** See [docs/PLAN.md](docs/PLAN.md).

## The problem

Greek has remarkably little learning infrastructure compared to German, Spanish, or Mandarin. What exists is scattered: government sites that feel abandoned, spread-out dictionaries, translators that don't explain anything. Self-taught learners — the people who need structure the most — are left to reconstruct Greek grammar from fragments.

## Vision

One large, focused application in the spirit of SpanishDict, built for people teaching themselves Greek:

- **Verb conjugation** — full paradigms, searchable, with irregulars treated as first-class citizens
- **Noun & adjective declension** — cases, genders, plurals, without dread
- **Search that forgives** — type what you heard, get the canonical form
- **Examples in context** — not just tables, but how real sentences use them
- Free, open source, no ads, no tracking — a public good for the Greek language

## What is here now

- `docs/` — the plan, the architecture, ADRs, the Ministry-of-Education taxonomy
  mapping, the competitive survey, and the native-speaker review workflow.
- `packages/schema` — language-neutral artifact schema and per-language feature
  configs (`el`, `en`, `grc`). Renderers contain no language knowledge.
- `packages/spec` — the normative forgiving-search algorithm, its golden vectors,
  and a TypeScript reference implementation. Kotlin and Go clients must pass the
  same vectors.
- `pipeline` — pinned, hash-verified ingestion (`sources.lock.json`), a paradigm
  validator, periphrastic-tense derivation, an alternatives merger, and an
  artifact emitter with a 50 MB size budget.
- `artifacts/` — generated packs (not committed).

Verified on real data (2026-11-01):

- Modern Greek pack: **85,425 lexemes, 492,741 surfaces, 12.0 MB**, 0 schema
  errors, 39 gaps — all genuinely irregular verbs (πρέπει, πρόκειται, άγχομαι).
- **24/24** high-frequency core lemmas present; **25/25** accent-stripped
  queries resolve to the right lemma.
- The periphrastic tenses the source tables omit are derived and labelled:
  42,563 future, 30,185 subjunctive, 21,168 perfect cells. Attested forms are
  never overwritten.
- 69 tests pass, including 27 shared search vectors that the Kotlin and Go
  clients must also pass.

See [docs/PHASE1-DATA.md](docs/PHASE1-DATA.md) for the measurements that decided
the source strategy, including why UniMorph alone was not usable.

```
pnpm install
pnpm typecheck
pnpm test
pnpm pipeline -- --lang=el
pnpm --filter @klisi/pipeline exec tsx src/smoke.ts --lang=el
```

## Want this to exist?

Open an issue with what you struggle with most as a learner of Greek. Found a
wrong conjugation? Use the **Report a conjugation error** template — every
accepted correction becomes a permanent regression test.

## License

AGPLv3 — see [LICENSE](LICENSE).
