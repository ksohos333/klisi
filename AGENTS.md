# Klisi — working agreement

κλίση — conjugation, declension. A Greek/English learning reference, offline-first,
zero-telemetry, AGPL-3.0.

## The two decisions everything hangs off

1. **The artifact is the product.** One versioned, checksummed data pack per
   language. Clients (web, mobile, optional Go server) are *readers*. No client
   contains morphology logic.
2. **The contract between clients is data, not shared code.** The only
   algorithms duplicated across languages are `search` and `drill`. Each has a
   normative spec (`packages/spec/`) plus a golden-vector suite. Every client
   implementation must pass the same vectors.

## Constraints (non-negotiable)

- TypeScript for pipeline + web. Kotlin for mobile. Go for the optional server.
- No third language without an ADR.
- `sources.lock.json` pins every upstream input by SHA256. Builds must be
  reproducible from pinned inputs.
- **License separation is structural.** Code: AGPL-3.0. Derived data: upstream
  license, with attribution. Never relocate BY-SA-derived material into the AGPL
  source tree. See `NOTICE` and `docs/ATTRIBUTION.md`.
- **No accounts, no telemetry, no ads.** No analytics, no crash reporting, no
  third-party CDNs on the critical path. CI enforces this, not just intent.
- **Static-first web.** `output: 'export'`; the site must work from a folder with
  no server.
- **Artifact size budget:** < 50 MB per language pack (compressed).
- Pipeline caches and raw dumps live outside the repo, and off `/home` when it is
  near capacity. Never persist the 3.2 GB English dump.

## Validation is a gate, not a report

- `pnpm test` runs the spec golden vectors and the schema checks.
- The pipeline validator fails the build on incomplete paradigms, round-trip
  violations, or unexplained gaps.
- Corrections live in `corrections/` as an overlay applied at build time, so
  upstream changes never silently rewrite verified content.
- Native-speaker review is a first-class workflow: `docs/REVIEW.md`.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).
- No generated data in git (see `.gitignore`).
- New language support = a new `features.<lang>.json` plus a pipeline adapter.
  Never add language-specific conditionals to a renderer.

## Commands

```
pnpm install
pnpm typecheck
pnpm test
pnpm pipeline -- --lang el
```
