# ADR 0003: Local-first, zero accounts, zero telemetry

Status: accepted

## Context

The README commits the project to "free, open source, no ads, no tracking".
SpanishDict's drill feature requires login, which is precisely the friction this
project exists to avoid. A hosted premium tier would require accounts, and
accounts are how a project ends up collecting the data it promised not to collect.

## Decision

- No accounts, login, or entitlement checks anywhere in the product.
- No analytics, crash reporting, or third-party CDNs on the critical path.
- Learner state (SRS cards, lesson unlocks) is on-device and exportable as a file.
- Quizzes and drills are generated locally from the artifact.
- Web is a static export. The optional Go server is never required.
- Monetization, if any, is donation-first and/or a store purchase for the mobile
  app — never a server gate.

## Consequences

- The privacy promise is a build-time property, enforced by CI, not a policy page.
- No server-side features can become load-bearing. Anything that requires a
  server is out of scope by definition.
- Cost: no cross-device sync. Accepted; file export/import is the substitute.
- Cost: store distribution is the one unavoidable intermediary for mobile. It
  buys zero telemetry, which is acceptable.
- **iOS + AGPL is unresolved.** Apple's App Store Minimum Terms require the EULA
  to be between developer and user only and limited to Apple-branded products,
  which is the well-known friction with copyleft licenses. As copyright holder
  the options are: grant an additional permissive license for the iOS client,
  distribute outside the App Store, or keep AGPL and accept the constraint.
  This must be decided before any iOS work begins, and it needs legal review.
  Android/Google Play has no equivalent obstacle.
