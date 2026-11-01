# Attribution and licensing

Source code: **AGPL-3.0** (see `LICENSE`).
Generated data artifacts: derived works, licensed per upstream source below.

Rule: data files carry their upstream license and attribution. Code files never
absorb BY-SA-derived material. See `NOTICE`.

## Upstream sources

| Source | Used for | License | Notes |
|---|---|---|---|
| UniMorph `ell` (Modern Greek) | Base form + feature vectors for nouns, verbs, adjectives | CC BY-SA 3.0 | https://github.com/unimorph/ell — README states "Source: Wikipedia, License: CC BY-SA 3.0" |
| UniMorph `grc` (Ancient Greek) | Ancient nouns/adjectives (no verbs in this dataset) | CC BY-SA 3.0 | https://github.com/unimorph/grc |
| UniMorph `eng` (English) | English morphology | CC BY-SA 3.0 | https://github.com/unimorph/eng |
| el.wiktionary (Greek Wiktionary) | Verb stem tuples, declension classes, IPA, syllabification, examples | CC BY-SA 4.0 (+ GFDL) | `Module:el-verb-conj`, `Module:el-nouns-decl`, templates `el-κλίσ-*`, `el-κλίση-*` |
| en.wiktionary (English Wiktionary) | English entries, translations | CC BY-SA 4.0 (+ GFDL) | — |
| kaikki.org (Wiktextract extracts) | Senses, glosses, translations, examples | CC BY-SA 4.0 (+ GFDL) | Derived from Wiktionary dumps; see citation below |
| Perseus Digital Library lexica (LSJ) | Ancient Greek lexicon, English glosses | CC BY-SA | Credit the Perseus Digital Library with a link to http://www.perseus.tufts.edu/ |
| jtauber/greek-inflexion | Reference implementation for Ancient Greek paradigms | MIT | Code may be reused with the MIT notice |
| morphgnt/morphological-lexicon | NT Greek lexemes, principal parts | MIT code / CC BY-SA 3.0 content | Keep the two licenses separate |

### Wiktextract citation

If kaikki data is used in research, cite:

> Tatu Ylonen: Wiktextract: Wiktionary as Machine-Readable Structured Data,
> Proceedings of the 13th Conference on Language Resources and Evaluation
> (LREC), pp. 1317–1325, Marseille, 20–25 June 2022.

Linking to the relevant kaikki.org page is also requested.

### Perseus attribution requirement

Perseus requires a standard bibliographic credit including a link to
perseus.tufts.edu, individual identification of reused texts, and that
corrections be offered back to the Perseus Digital Library.

## Compatibility note

The FSF lists CC BY-SA 4.0 as one-way compatible with GPLv3: adaptations of
BY-SA 4.0 material may be licensed under GPLv3, but GPL-licensed works may not be
relicensed under BY-SA 4.0. We avoid depending on this by keeping data as
separately-licensed data files rather than folding it into source files.

This document is engineering guidance, not legal advice. Before any commercial
or app-store distribution, get the licensing reviewed.

## In-product attribution

Any UI that renders artifact content must expose an "About the data" view that
lists the sources above with their licenses and links. This is a product
requirement, not an optional courtesy.
