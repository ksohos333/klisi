# Competitive landscape

Surveyed 2026-11-01 by fetching each site directly.

| Site | What it does | Where it stops |
|---|---|---|
| **Verbix** (verbix.com/greek) | Greek among hundreds of languages; rule-based on principal parts; non-profit, donation-funded | Verbs only. No declension, no examples, no quizzes, no app |
| **SpanishDict** | Conjugation tables, `/drill` quizzes, examples, pronunciation, thesaurus, word-of-the-day, learning path, premium cheat sheets. Also serves the reverse direction (`?langFrom=en`, `ingles.com`) | Quizzes **require login**. Server-dependent. One language pair. Heavy account/analytics footprint |
| **cooljugator.com/gr** | Modern Greek only; good tables; forms embedded in example sentences | Greek-only, web-only, no nouns, no quizzes, no offline |
| **moderngreekverbs.com** | Modern Greek; search by Greek, Latin transliteration, or English meaning; browse by letter; active + passive; mobile swipe | Greek-only, no declension, no examples, no quizzes, no offline |
| **speakgreek.co.uk/conjugator** | Greek; tense × aspect matrix with both aspects side by side; six persons; voice | Tense×aspect framing is not what Greek schools teach; Greek-only; email-capture funnel |
| **Logeion / Perseus** | Ancient Greek dictionaries and morphology | Ancient only; desktop-oriented; third-party analytics on the page |
| **kaikki.org** | Machine-readable Wiktionary dumps (Greek 211 MiB, Ancient Greek 390 MiB, English 3.2 GB) | Data, not a product. No UI, no pedagogy |

## The gap

Nobody currently combines:

1. **Greek and English in one bidirectional app**, with an exam-prep lane on top.
2. **Verbs, nouns, adjectives, sentences, and a dictionary in one place, offline.**
   Every Greek conjugator today picks one lane.
3. **Zero-account, zero-telemetry learning.** SpanishDict's drill is gated behind
   login; no one in this space ships a fully private, offline-first learner.
4. **Cross-language linkage.** Nothing links γράφω to "write" to a shared
   paradigm view.

## What we take from each

- **Verbix**: a non-profit, donation-funded model works for exactly this kind of
  public-good reference.
- **SpanishDict**: the product shape people want — tables, examples, drills, and
  a learning path on one page.
- **moderngreekverbs.com**: Latin-transliteration and English-meaning search are
  table stakes for "search that forgives".
- **speakgreek.co.uk**: the aspect grid is a good *secondary* presentation, but
  the Ministry tense labels must be the primary one for Greek learners.
- **kaikki.org**: the data layer is free; our value is correctness review,
  pedagogy, and privacy, not data acquisition.

## The defensible asset

Not the data (it is public), not the tables (anyone can render them). The asset
is the **native-speaker correction and review pipeline**, plus the fact that the
owner can certify both languages. That is what the corrections overlay and the
regression-test-per-correction rule exist to protect.
