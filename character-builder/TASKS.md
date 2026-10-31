# Project Tasks

Remaining work for the level-1 character creator, reviewed and consolidated on 2026-10-05. Implementation details belong in `PROJECT_RULES.md`; audit findings belong in the data-review documents. Passing tests verifies encoded behavior, not translation fidelity.

## Data Audits

- [ ] **User-owned translation task:** Complete the missing translation for 언데드 / Undead (`undead1`) in `frontend/data/foci.json`, including the currently empty effect text. The user will translate this entry; Codex must leave the translation to the user unless explicitly reassigned.
- [ ] Audit spells in `frontend/data/spells.json`: translated names and terminology, unambiguous effect wording, levels, schools, numerical values, and cross-references. Compare against the registered translator-provided sources and check first-level eligibility and class-school restrictions; record discrepancies for translator review.
- [ ] Audit arts in `frontend/data/arts/` and starting grants in `frontend/data/starting_arts.json`: names, terminology, numerical values, Effort costs/durations, class associations, prerequisites, and full/partial selections. Check fixed grants, restricted choices, and linked focus/ability effects against local descriptions.
- [ ] Resolve the remaining focus audit in `FOCUS_SEMANTIC_AUDIT.md` alongside the implementation history in `FOCUS_DATA_REVIEW.md`. On 2026-10-05, 81 manually completed review items were removed; 17 open reviews and 4 resolved implementation notes remain under their original numbers. Traditional Education's wording and cross-class Effort-pool questions remain in entry 102. Completed semantic reviews do not imply complete effect automation; concrete outstanding work is retained below.
- [ ] Reconcile `authority2`'s additional fixed Lead allotment with the manually reviewed effect text, which grants follower benefits without another skill grant. This is a remaining data discrepancy from closed semantic entry 071; confirm the intended allotment before changing data. Level-2 creation remains deferred.
- [x] Laborer and Warlike minimum modifier ruling confirmed by the user on 2026-10-31: retain explicit -2 minimums on negative modifier effects.
- [ ] Audit equipment, properties and starting packages for translation consistency, values, prices, quantities and references. Resolve preserved discrepancies in `EQUIPMENT_DATA_REVIEW.md`, especially load footnotes, daily/weekly rations, package bundles and armor values.

## Creation Rules

- [ ] Add Ghost Archer Style / 유령 궁수 유파 (`ghost_archer_style1`)'s -4 attack bonus when using other weapons to the character sheet bonuses. Display its source and weapon-use condition as a conditional penalty.
- [x] Implement the remaining first-level HP effects from manually reviewed foci: `all_directions_edge_style1` subtracts 2 from the hit-die result, and `die_hard1` grants +2 maximum HP per character level. Preserve their distinct sources and verify interaction with HD overrides, final CON, the minimum-HP rule, combined effects, removal and restoration. These implementation gaps survive the closure of semantic entries 001/075.
- [ ] Implement the remaining armor/equipment benefits of `righteous_iron_style1` from its reviewed text: an eligible starting heavy-armor choice costing at most 750 silver, +1 AC while wearing qualifying heavy armor, and removal of its Sneak/Exert penalties. Resolve equipment ownership and applicability explicitly; preserve the armor/shield distinction and the separate Armored Magic encumbrance exception. Carried-capacity simulation remains deferred. Semantic entry 006 is closed; implementation is still pending.
- [ ] Encode the reviewed selection prerequisites of `armored_magic1`, `polymath1` and `lucky1`. Armored Magic requires a caster whose casting is restricted by armor; Polymath requires Expert/partial Expert; Lucky's current prose requires at least one modifier of -1 or lower. Specify which modifier evaluation stage Lucky uses and when eligibility is rechecked. Verify legal/illegal class pairs, attribute changes, focus ordering and restoration; do not infer that closed semantic entries 067/084/087 mean these empty requirements are implemented.
- [ ] Resolve and implement `special_origin1` selection accounting from its reviewed text, including how the chosen origin is represented and charged and how the one-origin-family rule applies. The current normal-type entry has no encoded nested choice or grant. Preserve GM/campaign permission as a rule reference; verify duplicate charges, removal and restoration. This remains implementation work after semantic entry 091 was closed.
- [ ] Calculate and display total maximum System Strain / 최대 기관계 부담 on the character sheet, including the base maximum and all applicable validated bonuses rather than only the existing bonus adjustment. Confirm the base calculation against the registered rules, use final effective attributes, and share the calculation between frontend preview and backend evaluation. Show the total with its base/bonus breakdown; verify attribute changes, focus bonuses and removal, and saved-draft restoration. Current System Strain tracking remains outside this task.

## Build Follow-Up

- [ ] Configure a backend production build and matching start command. `backend/package.json` currently has no build script; `start` expects `dist/index.js`, while the TypeScript output directory is not configured. Existing backend verification uses tests and the `tsx` development server; a compiled production deployment remains unverified.

## Deferred Scope

Focus `sheet_notes` coverage is partial: only some focus effects and play-time conditions are included in the character sheet's reference notes. Comprehensive coverage is a scope decision for future expansion, not an immediate defect or required task for this implementation pass. The displayed notes should not be treated as a complete summary of every selected focus's rules.

Closed semantic entries 013/034 still describe deferred carrying-related effects: Pack Beast's carrying-strength override and Oni's +4 encumbrance-only STR. Preserve those rules for future carrying-capacity work; Oni's adjustment is not currently encoded.

- [ ] Remaining 구도자 / Vowed effects, deferred at the user's request on 2026-10-05: Martial Style's Punch-specific attack floor; Unarmed Might's damage progression and interaction with unarmed-damage foci (first-level damage table is missing); and Style Weaponry's three player-defined weapon types and skill rules. Other arts remain readable play-time references. Keep activation, Effort spending, healing over time and rerolls outside automatic creation calculations.

- [ ] If higher-level creation is added, implement repeated Spirit Familiar Level 2 purchases linked to one Level 1 instance. Save two distinct benefit IDs per purchase, forbid reuse across the entire acquisition history, and save the background subchoice. Adapt upgrade limits, focus-pick costs, removal/restoration and familiar-only effects. The six-benefit catalogue metadata is ready; the current builder still rejects Level 2.
- [ ] If higher-level creation is added, implement Antimage's Nullifier upgrade and the alternative focus for an already-level-2 owner. Current behavior is a free level-1 grant with paid duplicates refunded, never a level-2 exception.
- [ ] If higher-level creation is added, implement the missing mental-attribute modifier choice for 엘프 / Elves (`elves2`): choose INT, WIS or CHA, add +1 to that modifier and permit a maximum of +3. Preserve the existing bonus-skill choice and `elves1` prerequisite. See `FOCUS_SEMANTIC_AUDIT.md` entry 065; verify modifier caps, derived statistics, choice changes, parent/upgrade removal and saved-draft restoration. Keep the current level-2 creation ban until that scope is expanded.

Combat-time simulation, Effort spending, conditional roll resolution, crafting, ongoing inventory, carried-capacity/storage/coin loads and current System Strain tracking remain outside this level-1 creator. Do not infer these features from passing creation tests.

## Completed Work

Completed tasks are consolidated here. Detailed rules and confirmed interpretations live in `PROJECT_RULES.md`; these entries are not open work. This documentation review checked current source/data and existing test coverage but did not rerun application tests or builds.

| Completed feature | Implemented result | Regression source |
|---|---|---|
| Self-Carved / 자각인 (`focus_0421`) | CON becomes 14 below the threshold, otherwise 18, after allocation/growth; maximum Strain adjustment +2; derived scores and play notes. Total maximum Strain remains an open task. | `backend/src/selfCarved.test.ts` |
| Chattel (`chattel1`) | Saved STR reroll of 1d4+2; CON/CHA modifier +1 with cap +3; attack -2; social-check note. | `backend/src/chattel.test.ts` |
| Functionary (`functionary1`) | Free Specialist bound to the chosen skill with one total skill allotment, same-skill paid-pick refund, and chosen modifier -1. | `backend/src/functionary.test.ts` |
| Gnomes (`gnomes1`) | Exactly one Sneak/Craft bonus-skill choice, including legacy fixed-Sneak restoration. | `backend/src/gnomes.test.ts` |
| Lizardmen (`lizardmen1`) | Base AC 13; better worn armor contributes its base +1; comparison with other bases, shields and final DEX. | `backend/src/lizardmen.test.ts` |
| Dwarves (`dwarves_21`) | +1 maximum HP at character level 1 with source/breakdown, after HD/CON and before the minimum-HP floor. | `backend/src/dwarvesHitPoints.test.ts` |
| Reincarnating Elves (`elves1`) | Optional point-preserving redistribution to raise selected scores below 9 to 9; donors remain at least 9. Original allocations and skill grants are preserved. | `backend/src/elves.test.ts` |
| Vowed HD/AC only (`vowed`) | Martial Style minimum 1d6 after overrides; Unarmored Defense base AC 13 at level 1 when neither armor nor shield is equipped. Remaining Vowed effects are deferred above. | `backend/src/vowedDefenses.test.ts` |
| Kitsune (`kitsune_beastfolk1`) | Automatic Elemental Sparks, one additional Elementalist pick when already fixed by class/tradition, and sheet provenance. | `backend/src/kitsune.test.ts` |
| Skinshifter naming | `classes.json` uses `Skinshifter`; no `Skin Shifter` remains in active frontend/data/shared/backend source. Stable `skinshifter` ID retained. | Source/data inspection |

The implementation regression sources cover relevant calculations, validation, changes/removal and saved restoration. Sheet rendering coverage lives in `frontend/tests/characterSheet.test.mjs`; test-file presence does not substitute for a current test run.

Earlier completed work:

- Focus rules: typed allowances, Wrathful Mountain's -2 base attack adjustment, modifier caps, Impervious Defense AC, direct/conditional saves, free art-granted Nullifier, and Spirit Familiar's catalogue-only preparation with the level-2 ban.
- Traditional Education: tradition choice, full/partial Invoker starting arts, fixed grants without replacements, first-level spell access with two/four picks, and maximum Effort `max(1, Magic skill level)`. Remaining wording/resource questions are tracked in the audit.
- Derived calculations: background growth feeds scores, modifiers, HP, AC and saves; class/focus abilities use shared definitions; Flaw of Fragility overrides Warrior/Duelist HD before HP.
- Equipment: starting packages or funds, budgeted purchases, saved loadouts, owned equipment selection, AC and worn-armor penalties. Data caveats remain in `EQUIPMENT_DATA_REVIEW.md`.
- Interface/structure: Korean labels with English names, localized selectors, rules page, focus details and unavailable-choice locks; presentation-only `CharacterSheet.tsx` extraction and shared signed-number formatting; shared creation evaluation under `shared/` with separate loading, normalization and raw API-validation boundaries.
- Focus-audit cleanup (2026-10-05): removed 81 completed manual-review items, retained 17 open reviews and 4 resolved implementation notes, and preserved outstanding implementation work in this file.

## Verification History

These are results recorded by earlier implementation passes, not a fresh verification of every change now in the working tree. This 2026-10-05 task-list cleanup is documentation-only; no new application test, build or browser run was performed.

- **2026-10-05, Kitsune:** backend 267 tests and frontend 7 tests passed; frontend production build passed with the existing large-chunk warning. Covered grant/replacement, duplicates, removal/restoration, API validation and sheet rendering; no new browser interaction pass.
- **2026-10-05, sheet extraction:** backend 264 tests, frontend 6 tests and the frontend build passed. All 470 complete initial-render HTML comparisons matched the pre-extraction App; these were not interaction tests. Saved full Invoker restoration, growth-to-DEX/AC, arts/Effort/spells, disclosures, rules navigation and reload passed in an isolated Chromium session at 1280 x 720, with no page overflow or captured console warnings/errors.
- **2026-10-04, shared evaluation:** backend 264 tests and the frontend build passed; 469 complete API responses matched the pre-extraction implementation. Preview/API parity, adapters, immutability, raw-input validation and progression lookup gained regression coverage. A later isolated Invoker restoration smoke check passed.
- **2026-10-04, earlier browser coverage:** production-preview checks at 1440 x 900 and 390 x 844 covered unarmored AC, growth, modifier caps, Impervious Defense/armor/shields, Halfmen saves, Antimage/Nullifier removal, Spirit Familiar's level-2 lock, Traditional Education, spell duplicate locks and saved reload/navigation. No page overflow or captured console warnings/errors; temporary choices/tabs/servers were restored or closed.

Historical frontend builds emitted a large-chunk warning; the recorded main-JS sizes were approximately 803-805 kB minified. Prior tests and smoke checks are not an independent translation audit, exhaustive interaction/cross-browser/accessibility coverage, or verification of a backend production build. Subsequent focus/Vowed implementations are listed above with their regression sources; this cleanup does not invent updated suite totals for them.
