# Change Log

Versions follow [SemVer](https://semver.org) (`MAJOR.MINOR.PATCH`):

- **MAJOR:** a breaking change, such as a replaced decision or a renumbered rule or chapter.
- **MINOR:** new content that keeps what was already there.
- **PATCH:** a fix or a small improvement.

Before 1.0.0 the design is a draft, so breaking changes raise MINOR. 1.0.0 will be the version the league signs off for the Phase 1 beta.

## 0.4.2 — 2026-11-11

- Notes are now yellow, both on the pages and in diagrams. Warnings stay amber.
- The HTML site moved to the repo root, so GitHub Pages URLs no longer include `docs/solution-design/html/`.

## 0.4.1 — 2026-11-11

- Changed the site colours to teal on a white page. Amber is now used only for warnings and risks.
- Diagram boxes are now coloured by type: person, frontend, backend service, data store and external service ([legend](features/README.md#5-diagram-legend)).
- The GitHub icon in the header now links to [mini-apps-org](https://github.com/mini-apps-org).

## 0.4.0 — 2026-11-11

- Added this HTML site, with search, numbered sections and a full-screen diagram viewer.
- Changed: Open Questions is now chapter 26 and As-Built vs Target is chapter 27. They come after the feature chapters 14–25.
- Added this change log.

## 0.3.0 — 2026-11-10

- Added [feature specs](features/README.md) for all 54 features in 12 epics.
- Default values that the league still needs to confirm are listed under each feature's open questions.

## 0.2.0 — 2026-11-10

- Changed the design to match the `league-be` and `league-fe` repos ([what changed](15-as-built-vs-target.md#2-where-the-original-design-changed)).
- Added [As-Built vs Target](15-as-built-vs-target.md). It records that the league API and the business-rules migration are missing from `league-be`.
- Added repo questions and defects to [Open Questions](14-open-questions.md).

## 0.1.1 — 2026-11-10

- Fixed the JSON examples so they are valid and easy to read.

## 0.1.0 — 2026-11-09

- First solution design, built from the nine Notion pages: chapters 01–14 and the [rule tables](appendix-rule-tables.md).
