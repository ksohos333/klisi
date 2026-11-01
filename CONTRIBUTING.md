# Contributing to Klisi

Thank you. The most valuable contribution you can make is a **corrected
conjugation or declension**, with a source.

## Report a wrong form

Open an issue using the **Report a conjugation error** template. Include:

- the lemma (e.g. γράφω),
- the exact cell that is wrong (tense, person, number, voice, case),
- the wrong form and the correct form,
- a source (a printed grammar, a native speaker, a textbook page).

Every accepted correction becomes a row in `corrections/` and a permanent
regression test. Your name goes in the attribution log if you want it there.

## Report a search problem

If you typed something and did not get the right lemma, that is a bug in the
search algorithm. Open an issue with:

- exactly what you typed,
- what you expected to find,
- what you got instead.

These become cases in `packages/spec/vectors/search-cases.json`.

## Code contributions

```
pnpm install
pnpm typecheck
pnpm test
```

Rules that are not negotiable:

- No accounts, no telemetry, no third-party analytics, no ads.
- No new runtime dependency without a short note in the PR explaining why.
- Never add a language-specific conditional to a renderer. Language differences
  belong in `packages/schema/features.<lang>.json`.
- Never commit generated data or raw upstream dumps.
- Source files are AGPL-3.0. If your change incorporates material from a
  CC BY-SA source, say so in the PR — it must not land in the source tree.

## Native-speaker review

If you are a native Greek speaker (or a native English speaker for the English
lane), your review of a sample of paradigms is worth more than any amount of
code. See `docs/REVIEW.md` for the sampling method and how to record a verdict.

## License

By contributing you agree that your code contributions are licensed under
AGPL-3.0 and that data contributions keep their upstream license with
attribution.
