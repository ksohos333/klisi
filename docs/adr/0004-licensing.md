# ADR 0004: License separation is structural

Status: accepted

## Context

The repo is AGPL-3.0. The data comes from CC BY-SA 3.0 (UniMorph), CC BY-SA 4.0
(Wiktionary and kaikki extracts), and CC BY-SA (Perseus). Some reference
implementations are MIT.

Verified from the FSF license list: CC BY-SA 4.0 is one-way compatible with
GPLv3 — adaptations of BY-SA 4.0 material may be licensed under GPLv3, but
GPL-licensed works may not be relicensed under BY-SA 4.0.

## Decision

- Source code: AGPL-3.0.
- Derived data artifacts: upstream license, with attribution preserved and
  surfaced in-product.
- Never relocate BY-SA-derived material into AGPL-licensed source files.
- Never relicense AGPL-3.0 source under CC BY-SA.
- MIT upstreams (greek-inflexion, morphgnt) may be reused with their notices.
- `docs/ATTRIBUTION.md` is the authoritative per-source table and must be kept
  current whenever a source is added or dropped.
- Every artifact's manifest records the license and attribution of its inputs.

## Consequences

- Data is not relicensed; the question of whether a given combination is
  permitted simply does not arise in the normal build.
- An "About the data" view in the product is a requirement, not a courtesy.
- Any new data source requires an ATTRIBUTION entry before it can be ingested.
- Cost: the repo contains two licensing regimes. Accepted and documented in
  `NOTICE`.
- This is engineering guidance, not legal advice. Commercial or app-store
  distribution requires a legal review first.
