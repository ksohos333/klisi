# Architecture

## Shape

```
sources.lock.json (URL + SHA256)
        │
        ▼
   pipeline/  ── TypeScript, offline, reproducible ──
   ingest → normalize → model → derive → validate → emit
        │                                    ▲
        │                            corrections/ (overlay)
        ▼
   artifacts/<lang>/
     lexemes.jsonl.gz
     paradigms.jsonl.gz
     forms.tsv.gz
     search/normalized.tsv.gz
     search/phonetic.tsv.gz
     ipa.tsv.gz
     manifest.json          ← version, build id, checksums, feature vocab, labels
        │
        ├──► apps/web     Next.js static export  (no server needed)
        ├──► apps/mobile  Kotlin Multiplatform   (offline, same artifact)
        └──► apps/server  Go single binary       (optional self-host)
```

The artifact is the product. The three clients are readers.

## Why data is the contract, not shared code

Morphology logic exists **once**, in the pipeline. A client never conjugates a
verb; it looks up a precomputed paradigm cell and renders it.

Two algorithms still have to be duplicated per client language because they must
run offline on-device: **search** and **drill**. Both are specified normatively in
`packages/spec/` and every implementation must pass the same golden vectors.
That is the entire defense against three implementations drifting apart.

## Language neutrality

`features.<lang>.json` defines, per language:

- the POS set,
- the feature axes and their legal values,
- the axis order for rendering a paradigm grid,
- label sets (Ministry-of-Education labels for Greek; pedagogical English labels),
- the phonetic-fold tables used by search.

Renderers iterate the configured axes. Adding Ancient Greek is a new config file
plus a pipeline adapter — no renderer edits.

## Artifact size budget

< 50 MB per language pack, compressed. This is a build-time gate, because the
pack must bundle into a mobile app and ship as static files.

## Where state lives

There is no account and no server-side user state. Learner progress (SRS cards,
lesson unlocks) lives on the device and is exportable/importable as a file.
The optional Go server hosts the static site and serves artifacts; it is never
required.

## What is deliberately absent

- No accounts, login, or entitlement checks.
- No analytics, crash reporting, or third-party CDNs on the critical path.
- No server-side translation calls. Word-level translation is local data;
  sentence translation, when it arrives, is an on-device model.
