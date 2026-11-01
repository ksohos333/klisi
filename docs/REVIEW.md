# Native-speaker review

Correctness of the Greek content is the product's credibility. This is a
first-class workflow, not an afterthought.

## Who reviews

- Owner: @ksohos333 — Greek C1, fluent English. Certifies the Greek content.
- External native Greek speakers, invited per batch.
- English lane: native or near-native English reviewers.

## Sampling

Each review batch is a stratified sample, not a random one:

| Stratum | Count |
|---|---|
| Every verb conjugation class × 2 exemplars | ~90 |
| Every noun declension class × 1 exemplar | ~230 |
| Top-500 most frequent verbs and nouns | sample |
| Explicitly irregular verbs | all |
| Compound verbs with prefixes | sample |

The generator prints a printable HTML review sheet. Reviewers work on paper or
on the sheet, never in a code editor.

## Recording a verdict

For each item: `accept`, `correct`, or `reject`.

- `accept` → the paradigm is marked verified, with the reviewer and date.
- `correct` → a correction is filed with the wrong form, the right form, and a
  source. It lands in `corrections/` and becomes a permanent regression test.
- `reject` → the lemma is held out of the published artifact until resolved.

## Corrections are an overlay

Corrections live in `corrections/<lang>.jsonl` and are applied at build time,
after ingestion and before emission. This means:

- an upstream Wiktionary change can never silently rewrite a verified paradigm;
- every correction is a reviewable diff in git;
- a corrected paradigm gets a regression test, so the same error cannot return.

## Round-trip requirement

A correction is not "done" until:

1. the artifact rebuilds,
2. the validator passes,
3. the corrected cell is asserted in a test,
4. the review sheet is regenerated with the new form.

## Conflict policy

When sources disagree (e.g. two accepted aorist forms), both are kept as
variants with the Ministry-conventional form marked primary. We do not pick a
winner silently; the variant is shown.
