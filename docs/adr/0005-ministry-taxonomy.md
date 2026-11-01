# ADR 0005: Ministry-of-Education taxonomy as the primary display contract

Status: accepted

## Context

Existing Greek conjugators use two different presentations:

- the Greek school grammar's named tenses (Ενεστώτας, Παρατατικός, Αόριστος,
  Στιγμιαίος, Μέλλοντας, Παρακείμενος, Υπερσυντέλικος, Συντακτικός,
  Προστακτικός, Απαρέμφατο, Μετοχή), and
- a tense × aspect matrix, which is clearer to English speakers but is not what
  a Greek learner is taught.

UniMorph's Greek tags are aspect-first. The school grammar is tense-first.
Choosing only one presentation would either confuse Greek learners or lose the
clarity English speakers need.

## Decision

Both label systems ship in the artifact. The **school/MoE labels are primary**
for the Greek lane; the aspect grid is a secondary presentation. The mapping
lives in `docs/TAXONOMY.md` and in the language config's label sets, not in code.

Explicitly documented in the mapping:

- Αόριστος = imperfective past (έγραφα)
- Στιγμιαίος = perfective past (έγραψα)

This inversion is the single most common learner error and gets its own
explanation panel rather than just a label.

Additional decisions:

- Voice is joined by `voicePair` links, not split across lemmas as Greek
  Wiktionary does.
- Variant surfaces for one cell are all kept, with the Ministry-conventional
  form marked primary.
- "Irregular" is a derived property of the stem tuple, not a hand-maintained
  flag.

## Consequences

- The owner reviews the mapping table, not the code.
- English speakers can switch to the aspect grid without forking the product.
- Cost: two label sets to maintain. Accepted, because they are data and they are
  small.
