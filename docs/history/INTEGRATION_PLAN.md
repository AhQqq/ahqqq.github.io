# Website integration

Historical record of the integration. For current source locations, build commands and local preview instructions, see the [repository README](../../README.md).

## Agreed direction
Start with small visual changes; support a unified design later. One homepage, character builder and reference database, with one maintained catalogue eventually serving both.

## Checklist
- [x] Attach outer working directory to existing GitHub history on codex/integrate-builder; preserve local classes.js changes and nested checkout.
- [x] Import current builder working files, including uncommitted source changes. Original sibling directory remains unchanged.
- [x] Replace browser API evaluation with the existing shared full evaluator.
- [x] Add navigation between builder and database.
- [ ] Verify production build and existing regression suites.
- [ ] Browser interaction checks: creation, final values, reload, mobile layout and navigation.
- [x] Establish a shared catalogue consumed by both interfaces.
- [ ] Inventory and migrate spells, foci, arts and equipment; then backgrounds, skills and compatible class content.
- [x] Retain full higher-level reference data, descriptive rules and progression tables absent from the level-1 builder.
- [x] Build a two-choice homepage and preserve existing database URLs.
- [ ] Prepare GitHub Pages build workflow and review before publication.

## Development
Install locked dependencies with `npm ci --prefix character-builder/frontend` and `npm ci --prefix character-builder/backend`.
Run `npm run build` to generate the ignored `character/` static directory. Serve the repository root with a static HTTP server and visit `/character/`.
Run `npm test` for the imported regression suites. The backend is retained as a regression reference and is not required by the deployed builder.

## Content review policy
Prefer complete newer builder wording. Preserve unmatched reference material and record conflicts rather than replacing it with blank fields. Preserve stable catalogue IDs and saved-draft storage keys. Existing builder audit documents remain under character-builder/. Translation and rules audits are separate from integration verification.

## Baseline
Existing GitHub commit: 90f72c2. Outer classes.js has local changes. Source builder imported from its current working tree rather than only its committed version. Nested ahqqq.github.io checkout is retained and ignored, not removed.

## Verification results
Production build passed. Frontend: 19/19 passed. Backend: 311/313 passed; failures concern modifier-cap catalogue expectations and the Vowed fixed skill grant. Imported backend source, shared rules and catalogue files are byte-identical to the source working tree. Resolve these discrepancies before release; do not silently change rules to satisfy tests. Browser interaction checks remain pending. Build reports an 845 kB JS chunk. Dependency installation reports audit findings (frontend: 23; backend: 4, including one critical); dependency review remains a release task. No publication performed.

## Database migration
Spells (83), arts (202), focus level records (155), equipment (86), backgrounds (20) and skills (22) now render from character-builder/frontend/data. Equipment properties and all six starting packages also use that catalogue. Existing general rules and class progression content remain intact. Class-page migration is deferred because the creator catalogue lacks the full reference descriptions and higher-level progression.

Run `npm run build:database` after catalogue or database-template edits; `npm run check:database` checks generated pages are current. The full `npm run build` includes this generation. Generated HTML is tracked so the database still works with static hosting and does not require JavaScript to load its catalogue. Edit database-templates for surrounding reference prose, rather than editing generated HTML.

Verification: all catalogue names and spell/art/focus/background/skill descriptions were checked against generated HTML; IDs are unique per page and generation is repeatable. Browser visual/interaction checks have not been performed for this migration. Existing builder test discrepancies remain unrelated and unresolved.

### Retained content and review items
Three legacy focus rows remain in database-templates/focus-legacy.json solely as fallbacks for missing descriptions/effects or supplemental abilities. New nonempty catalogue text takes precedence. The original data/*.txt files are retained as historical sources, but these database pages no longer load them. All checked legacy spell/art/focus English names have equivalents in the new catalogue.
Specialist level 1 and level 2 have different Korean names in the shared data; the level-2 alternative is displayed alongside its level rather than silently renamed. Translation gaps and equipment numerical discrepancies described in the imported audit documents are not resolved by this migration.

## Browser QA — 2026-10-31
Local production output inspected in the in-app Chromium browser at 1440x900 and 390x844. Homepage entrances, database navigation, all migrated catalogue routes and classes route loaded. Verified builder attribute swaps update AC/saves, name restoration after reload, rules navigation, magic-class art/spell eligibility and selection persistence. This was representative smoke coverage, not exhaustive character-rule validation or a complete end-to-end character creation test.

Fixed during QA: class configuration referenced progression arrays before initialization (moved configuration after its dependencies); narrow reference pages/tables overflowed (responsive bounds, local table scrolling, viewport metadata); cached CSS/JS hid updates (versioned reference assets); duplicate identity navigation step (now nine unique stages); copper prices now use Korean currency labels. Existing local classes.js refactor is preserved.

Post-fix checks: all ten routes fit a 390px viewport without page-level horizontal overflow; Warrior/Expert class selection renders levels 1-10; production build and 19 frontend tests pass. Screenshot: qa-artifacts/homepage-desktop.png. Remaining release items: two earlier backend regression discrepancies, dependency audit review, deployment workflow and final publication decision. No publication performed.

## Confirmed-rule fixes — 2026-10-31
User confirmed explicit -2 modifier minimums for Laborer and Warlike; restored the catalogue metadata. User confirmed Vowed grants one selected skill excluding Stab, Punch and Shoot. Updated the outdated fixed-Heal test and rules documentation. Added regression coverage for missing, excluded and eligible choices, saved restoration and class removal. That coverage exposed an actual missing class-skill exclusion check: shared validation now rejects excluded choices, normalization clears them, and the frontend disables and rejects them.

Final verification: backend 314/314 tests pass; frontend 19/19 pass; production build passes. The two previously recorded backend failures are resolved. Dependency audit findings remain a separate release follow-up.
