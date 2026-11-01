# Taxonomy — Ministry of Education alignment

Greek display labels follow the Modern Greek school grammar (the taxonomy used
in Greek education and in the standard reference grammar for teachers, e.g.
Θεοδωράκη, *Εισαγωγή στη Γραμματική*).

Two label systems coexist in the artifact. The renderer picks per context:

- **School/MoE labels** — the Greek tense names a learner meets in a Greek
  textbook.
- **Aspect-grid labels** — a tense × aspect presentation, which is clearer for
  English speakers and is used by several existing conjugators.

UniMorph's Greek tags are aspect-first (`IPFV`/`PFV`); the school grammar is
tense-first. The mapping below is **not** one-to-one and must be reviewed by the
owner before it ships.

## Verb mapping (Modern Greek)

| UniMorph `ell` feature pair | School / MoE label | Aspect-grid label | Example (γράφω) |
|---|---|---|---|
| `IPFV;PRS` | Ενεστώτας | Continuous · Present | γράφω |
| `IPFV;PST` | Αόριστος | Continuous · Past | έγραφα |
| `PFV;PST` | Στιγμιαίος | Simple · Past | έγραψα |
| `IPFV;FUT` | Μέλλοντας (θα + ενεστώτας) | Continuous · Future | θα γράφω |
| `PFV;FUT` | Μέλλοντας (θα + αορίστου) | Simple · Future | θα γράψω |
| `PRF;PRS` | Παρακείμενος | Perfect | έχω γράψει |
| `PRF;PST` | Υπερσυντέλικος | Past perfect | είχα γράψει |
| `PRF;FUT` | Μέλλοντας συντελεσμένος | Future perfect | θα έχω γράψει |
| `SBJV` | Συντακτικός | Subjunctive | να γράψω |
| `IMP` | Προστακτικός | Imperative | γράψε |
| `NFIN` | Απαρέμφατο | Non-finite | γράψει |
| `PTCP` | Μετοχή | Participle | γράφοντας |

> ⚠️ The counter-intuitive pair: **Αόριστος is the imperfective past** (έγραφα),
> **Στιγμιαίος is the perfective past** (έγραψα). Learners routinely invert these.
> The UI must explain this pair explicitly rather than just label it.

### Notes on the mapping

- `PFV;PRS` exists for some verbs (the "perfective present", e.g. γράψω as a
  bare subjunctive stem). It is not a standalone school tense; it surfaces under
  Συντακτικός and under Μέλλοντας after θα.
- Some verbs have no perfective past or no imperfective past. A missing cell is
  a **linguistic fact**, not a pipeline gap. The validator distinguishes
  "structurally absent" from "unexpectedly missing".
- UniMorph's `ell` forms sometimes list several surfaces for one cell
  (e.g. δροσίζουμε, δροσίζομε). These are **variants**, not duplicates. The
  artifact keeps all variants with the first marked as primary.

## Voice

Greek Wiktionary models voice as separate lemmas (γράφω / γράφομαι). The product
must not inherit that split: a single verb page shows Active and Middle/Passive
as tabs, joined by a `voicePair` link recorded in the artifact.

## Noun and adjective axes

| Axis | Values (Modern Greek) |
|---|---|
| Case (πτώση) | Ονομαστική (NOM), Γενική (GEN), Αιτιατική (ACC), Κλητική (VOC) |
| Number (αριθμός) | Ενικός (SG), Πληθυντικός (PL) |
| Gender (γένος) | Αρσενικό (MASC), Θηλυκό (FEM), Ουδέτερο (NEUT) |
| Degree (adjectives) | Βαθμός (AB), Συγκριτικός (CMPR), Υπερθετικός (SPRL) |

Declension classes follow the Greek Wiktionary pattern names
(`el-κλίση-'δρόμος'`, `el-κλίση-'άνθρωπος'`, …). These are *pattern labels*, and
they are what a Greek teacher already uses when saying "declines like δρόμος".

## Verb stems

The Greek Wiktionary verb template encodes a stem tuple:

1. tonized present stem
2. untonized present stem
3. tonized aorist stem
4. untonized aorist stem
5. passive-participle stem (optional)
6.–8. prefixes for compound verbs

This is the artifact's primary representation of a verb. "Irregular" is a
**derived property**: a verb is irregular when its aorist stem is not derivable
from its present stem by the rules of its class. That is what makes irregulars
first-class rather than a separate hand-maintained list.

## English lane

English uses a different feature set, defined in `features.en.json`:

- Verbs: base, third-person singular, past, past participle, present participle,
  plus irregular forms.
- Nouns: singular, plural, with irregular plurals as explicit exceptions.
- Adjectives: positive, comparative, superlative.

No case, no gender, no aspect axis. The renderer reads the English config and
never assumes Greek axes exist.
