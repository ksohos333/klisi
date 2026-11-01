# artifacts/

Generated data packs. **Not committed to git.**

Rebuild from pinned sources:

```
pnpm pipeline -- --lang el
```

Each pack contains:

```
lexemes.jsonl.gz     one lexeme per line
paradigms.jsonl.gz   one paradigm per line
forms.tsv.gz         surface \t lemmaId \t featureBundle
manifest.json        schema version, build id, sha256 + size per file, sources
```

The manifest is the unit of publication. A client verifies the manifest, then
reads the pack. See `docs/adr/0001-artifact-contract.md`.

Size budget: **50 MB per language pack, compressed.** The pipeline fails if a
pack exceeds it.

Raw upstream downloads never live here; they go to `KLISI_CACHE_DIR`
(default `/tmp/klisi-cache`), outside the repo and off nearly-full volumes.
