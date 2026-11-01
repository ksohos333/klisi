# Legal notes (engineering guidance, not legal advice)

## iOS distribution and AGPL

Apple's App Store "Minimum Terms of Developer's End-User License Agreement"
require, among other things, that the EULA be concluded between the developer
and the end-user only (not Apple), and that the license be limited to
Apple-branded products the user owns or controls. These are the terms generally
understood to create friction with copyleft licenses such as AGPL, which forbid
additional restrictions on the recipient's rights.

Options for this project, as copyright holder:

1. Grant an additional permissive license for the iOS client only, keeping the
   core AGPL-3.0.
2. Distribute the iOS build outside the App Store.
3. Keep AGPL everywhere and accept the distribution constraint.

Decide before any iOS work. Get this reviewed by a lawyer.

Android / Google Play has no equivalent obstacle. AGPL's source-availability
obligation is satisfied by the public repository.

## ETS trademarks (TOEFL)

ETS publishes trademark-use guidelines for publications, websites, and mobile
apps that reference its marks. Relevant constraints for us:

- Titles have prescribed formats; a title such as "TOEFL® TEST PREPARATION
  GUIDE" is given as an incorrect example, while a title identifying the
  publisher first is given as correct.
- The registry symbol and an appropriate generic term should appear with the
  mark, and on websites after the first and most prominent use on each page.
- A notice of the form
  *"TOEFL® is a registered trademark of ETS. This product is not endorsed or
  approved by ETS."* is required on app welcome screens and at the bottom of web
  pages when the mark is used.

Decision:

- Do **not** use "TOEFL" in the product name, module names, or route names.
- Refer to the lane as "Academic English" or "exam-prep English" in UI and code.
- If the mark is used in descriptive prose, include the required notice.
- **ETS's own test materials are copyrighted and must not be shipped.** All
  vocabulary lists, reading passages, and exercises in the academic lane are
  authored by us or taken from permissively licensed sources.

## Data licensing

See `docs/ATTRIBUTION.md`. Summary: code is AGPL-3.0; derived data keeps its
upstream license with attribution, and attribution must be visible in-product.
