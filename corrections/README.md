# corrections/

Verified corrections, applied at build time as an **overlay** on top of the
ingested sources. This is the mechanism that makes native-speaker review
permanent: an upstream change can never silently rewrite a verified paradigm.

One file per language: `el.jsonl`, `en.jsonl`, `grc.jsonl`.

## Record format

One JSON object per line:

```json
{"lemmaId":"el:verb:γράφω","features":{"aspect":"PFV","tense":"PST","person":"1","number":"SG"},"action":"replace","wrong":"έγραφα","correct":"έγραψα","source":"native speaker","reviewer":"@ksohos333","at":"2026-11-01"}
```

Fields:

- `lemmaId` — the artifact id of the lemma.
- `features` — the exact cell, as a feature bundle. Must match a cell in the
  paradigm for `replace` and `remove`.
- `action` — `replace`, `add`, or `remove`.
- `wrong` / `correct` — the wrong and right surface forms.
- `source` — a printed grammar, a textbook, or "native speaker".
- `reviewer`, `at` — who certified it and when.

`add` inserts a form that was missing entirely (use this for a cell the source
never recorded). `remove` deletes a form that should not exist.

## Rules

- Every correction needs a source. "Native speaker" is a valid source.
- A correction that does not match its target cell is a **build warning**, never
  a silent no-op. Unmatched corrections are printed by the pipeline.
- Accepted corrections become permanent regression tests.
- Corrections that conflict with an upstream form are kept as **variants** when
  both forms are genuinely acceptable; the Ministry-conventional one stays
  primary (index 0).

See `docs/REVIEW.md` for the review workflow that produces these records.
