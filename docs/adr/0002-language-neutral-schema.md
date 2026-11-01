# ADR 0002: Language-neutral schema, per-language configuration

Status: accepted

## Context

Greek needs case, gender, aspect, and voice. English needs base/-s/-ed/-ing and
irregular plurals. Ancient Greek adds dual number, four cases plus vocative, and
polytonic orthography. Hardcoding Greek axes into a renderer would make English
and Ancient Greek second-class, and would require renderer edits for every new
language.

## Decision

The schema is language-neutral. Each language has a config file
(`packages/schema/features.<lang>.json`) that declares:

- `pos`: the parts of speech present,
- `axes`: the feature axes, their legal values, and their order for rendering,
- `labels`: display labels per axis value (school/MoE labels for Greek;
  pedagogical English labels for English),
- `fold`: the phonetic-fold tables used by search.

Renderers iterate the configured axes. No renderer may contain a
language-specific conditional.

## Consequences

- Ancient Greek is a config file plus a pipeline adapter, not a new app.
- The Ministry taxonomy is data (`docs/TAXONOMY.md` + the config labels), so the
  owner can correct a label without touching code.
- Cost: the config is a second source of truth for axis order. Mitigated by
  validating every artifact against its own language config in CI.
- Cost: cross-language paradigm comparison needs an explicit shared cell id
  scheme, because the axes differ. Handled by translation links, not by forcing
  a common axis set.
