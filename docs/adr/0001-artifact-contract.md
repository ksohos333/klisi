# ADR 0001: The artifact is the product

Status: accepted

## Context

The product must work offline on three clients (Next.js web, Kotlin Multiplatform
mobile, optional Go server) with no cloud dependency and no telemetry. Morphology
logic must not be implemented three times.

## Decision

The versioned, checksummed **data artifact** is the product. Clients are readers.
All morphology logic lives in the TypeScript pipeline, at build time.

An artifact pack contains, per language:

```
lexemes.jsonl.gz         lemma, pos, senses, translations, examples, stems, links
paradigms.jsonl.gz       per lemma: grid of {cellId, features, surface, note}
forms.tsv.gz             surface \t lemmaId \t featureIds   (reverse analysis)
search/normalized.tsv.gz   folded surface \t lemmaId
search/phonetic.tsv.gz     phonetic key \t lemmaId
ipa.tsv.gz               ipa \t lemmaId
manifest.json            schemaVersion, lang, buildId, sha256 per file,
                         feature vocabulary, label sets, license + attribution
```

Every file is hashed; the manifest is the unit of publication. A client that can
read the manifest can consume the pack regardless of implementation language.

## Consequences

- Three clients cannot disagree about a conjugation: there is only one producer.
- Offline is a property of the format, not a feature to be maintained.
- Artifact size is a budget (< 50 MB compressed per language pack), enforced in CI.
- Generated artifacts are not committed to git. They are rebuilt from pinned
  sources and published as release assets.
- A client upgrade can never silently change content; only a new artifact can.
- Cost: clients cannot conjugate a word absent from the artifact. Accepted. The
  "explain the pattern" and "conjugate an unseen stem" features are deferred to
  the rule-derivation layer, which still emits data rather than shipping code.
