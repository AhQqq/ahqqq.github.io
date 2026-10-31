# Equipment Data Review

The equipment import used the reference page as it appeared on 2026-10-04. The import records preserve the raw table cells, property descriptions and original starting packages. [Equipment page](https://ahqqq.github.io/equipment.html) · [Raw equipment](../history/builder-sources/equipment_source.json) · [Starting packages](../history/builder-sources/starting_equipment.txt)

The initial import preserved the webpage's translation and numbers. At the translator's subsequent request, clear name and property-wording differences were updated from `D:\Hub\Downloads\WWN_SRD\Main.tex` on 2026-10-04. Numerical values and encoded mechanics remain unchanged. Catalogue IDs are stable technical references, not proposed English translations.

## SRD Translation Sync

Compared the existing catalogue against the SRD's equipment chapter, including gear, equipment bundles, armor, weapons, load footnotes, and weapon properties. Five active item names and six property descriptions changed:

| Catalogue ID | Updated wording | SRD lines |
| --- | --- | --- |
| `healing_pouch` | `치료 도구 주머니` becomes `치료사의 도구`. | 4184 |
| `breastplate_and_pauldrons` | `흉갑과 견갑` becomes `흉갑과 경갑`. The ID remains unchanged for saved drafts. | 4348, 4372 |
| `small_shield` | `소형 방패` becomes `작은 방패`, following the armor table and shield prose. | 4333-4335, 4390 |
| `large_shield` | `대형 방패` becomes `큰 방패`, following the armor table and shield prose. | 4333-4335, 4391 |
| `unarmored` | `갑옷 없음` becomes the table label `맨 몸`. | 4359 |
| `armor_piercing` | Uses `명중 판정` instead of `명중 굴림`. | 4486 |
| `less_lethal` | Uses `HP` and corrects `사용자의 선에 따라` to `사용자의 선택에 따라`. This resolves the previously flagged omission. | 4494 |
| `numerous` | `다섯 개가 하나의 준비된 물품으로 취급됩니다.` explicitly refers to readied items. | 4496 |
| `lethal` | Matches the source's `-1` penalty notation. | 4498 |
| `reload` | Uses `턴 행동` instead of `단순 행동`. | 4500 |
| `thrown` | Uses `명중 판정` and the source's `-4` penalty notation. | 4506 |

Distances retain the UI's readable `피트` notation for the TeX's apostrophe notation. Bundle names retain their Korean labels without the TeX's appended English names. Shield weapon-row aliases remain in the archived source data; each shield still has one shared equipment ID.

Only active `equipment.json` names and `equipment_properties.json` descriptions changed. All IDs, source-row metadata, prices, loads, property assignments, attack profiles, AC, and armor penalties were preserved. The SRD's explicit readied-item wording is now visible, but does not introduce a readied/stowed inventory system or change existing listed-load calculations.

`starting_equipment.json` needs no translation edit: the SRD describes the choice of a GM-provided package or rolled silver (lines 3269-3270), but does not supply replacements for the six named packages. Package item labels resolve through the updated catalogue. Package-only goods and the webpage's horse cart, which lacks a matching SRD gear row, remain intact. Animals, services, and other SRD-only entries were not imported as new catalogue items.

`Main.tex`, `old/equipment_source.json`, and `old/starting_equipment.txt` remain unchanged. The archived webpage is historical evidence, not an assertion that the live translation must remain identical. Source differences that cannot safely be treated as translation-only changes are recorded below.

## Translator-Confirmed Implementation Rules

- AC starts with armor base (10 unarmored). A higher shield base replaces it; when armor base equals or exceeds shield base, the shield adds +1 instead. Add the final DEX modifier afterward.
- 10 copper equals 1 silver. Purchase arithmetic uses integer copper.
- The source's conflicting values remain unchanged pending review.

## Potential Improvements

| Entry | Published data | Review needed |
| --- | --- | --- |
| Encumbrance footnotes | `*`: no load in reasonable quantities; `**`: no load while worn. Backpack, boots, and clothing use `1*` or `2*`. The webpage marks candles `**`; the SRD marks them `*` (line 4174), while retaining both definitions. | Confirm the intended markers, including the candle difference. This affects load rules, not just wording, so no property assignment or load marker was changed. Purchases with these markers remain flagged for manual load review. |
| Rations | General gear: daily rations cost 5 silver and have load 4. Packages: one week's rations have load 4. | Confirm intended duration and unit. Keep `rations_1_day` and `rations_1_week` separate; do not assign the daily price to the weekly package unit. |
| Hook and rope package bundle | Standalone hook load 1 and 50-foot rope load 2; combined package row load 2. | Confirm the bundle allowance or combined load. Retain package load 2 without expanding or adding component loads. |
| Writing supplies package bundle | Writing kit plus 20 sheets has package load 1; paper uses `*` in the gear table. | Resolve the footnote before computing constituent loads. Keep the named package bundle and do not invent a bundle purchase price. |
| Lantern/firelighting bundles | The mage package lists lantern, tinderbox, and two oil flasks at load 3; the torch bundle has load 1. Oil and torches separately have `#` bundling. | Confirm package-context bundling and the tinderbox footnote. Preserve package row totals rather than reconstructing them from catalogue entries. |
| Shields | Small shield: AC 13/+1, 20 silver. Large shield: AC 14/+1, 10 silver. Both load 1. Weapon rows list no price/load. | Confirm the apparent price reversal. Use armor-table prices/loads and weapon-table attack profiles under the same IDs, not separate purchasable shields. |
| Plate-related armor | `판갑`: AC 17, 1,000 silver, load 2. `판금 갑옷`: AC 16, 2,000 silver, load 3. `합성 갑옷`: AC 19, 2,000 silver, load 3. | Check names and numerical alignment. These values are preserved, not replaced with remembered English rules. |
| Medium armor row | The webpage and current `scale_armor` use `비늘 갑옷`, AC 16, 500 silver, load 3. The SRD's corresponding medium row says `사슬 갑옷` (line 4373), also used for its heavy row (line 4380); its prose still separately defines `비늘 갑옷` (line 4348). | Confirm which name belongs to the medium row. Retain `scale_armor` as `비늘 갑옷` rather than merging two distinct IDs or guessing at the intended armor. |
| Crossbow terminology | The SRD's prose uses `석궁` (line 4421), but its weapon table still uses `쇠뇌` (line 4457). | Retain the catalogue/table name `쇠뇌` pending the translator's preferred canonical term. |
| Club, transport, and package-only goods | Club price is a dash; horse-cart load is a dash. Mule/cart, quiver bundle, weekly rations, and other package-only bundles lack independent prices. | A dash is not a free purchase or zero load. Unpriced goods remain visible but cannot be bought; package grants still work. |
| Fine clothes | Package labels differ from the general-gear labels. | Existing IDs and package names are retained; source names are recorded for comparison/search. Folded fine clothes remain a separate unpriced package entry. The healing-tool label was separately resolved by the SRD sync above. |
| Throwing knives | Weapon price is 3 silver; the SRD's `다수` says five count as one readied item. Package quantity is five, load 1. | Current interpretation: purchase price is per knife; only listed load groups by five. Confirm if a different sale unit was intended. Actual readied/stowed capacity remains unimplemented. |
| Single-shot property | `단발` is defined, but no weapon row uses it. | Keep the glossary entry without assigning it to weapons by inference. |

## Deliberate Boundaries

All six starting packages retain their fixed quantities and currency. Shopping spends only their listed silver or the alternative silver roll. Removing purchases refunds only those purchases; packages cannot be sold, split, or exchanged for inferred prices.

No item is equipped automatically. Normal equipment supports one worn armor, one held shield, and one active weapon. A held shield cannot accompany an active two-handed weapon; shield attacks use that same held shield. Explicit focus/art exceptions are not inferred from prose and still require a future encoded rule.

Armor AC and Sneak/Exert check penalties are implemented. Learned skill levels are not reduced. Weapon damage, shock thresholds, range, attributes, and full property text are displayed as base/reference values; attack/damage modifiers, ammunition consumption, reload actions, armor penetration, and first-shock negation are not a combat simulator.

Listed load subtotals preserve package row totals. Purchased lots apply explicit groups of three (`#`) or five (`다수`), independently of package row annotations. Ambiguous footnotes and unlisted loads remain flagged. Readied/stowed capacity, transported goods, coin loads, and class/focus-specific equipment exceptions are not certified by equipment completion.

## Verification Status

Verified on 2026-10-04 after the translator requested build, test, and browser checks, before the subsequent SRD translation sync:

- `npm.cmd test --prefix backend`: 206 passed, 0 failed, 0 skipped.
- `npm.cmd run build --prefix frontend`: passed, including frontend/shared TypeScript checks and the Vite production build. The main JavaScript bundle is 710.74 kB minified / 198.32 kB gzip, producing a non-blocking size warning.
- Backend health endpoint: healthy, reporting 86 equipment entries, 16 properties, and six starting packages.
- Production-preview browser checks with the live API: package contents and unarmored defaults; equipped armor/shield AC; final DEX recalculation; saved-loadout reload; package replacement; shopping and merged quantities; overspend rejection; unpriced/unaffordable disabled items; copper change; ambiguous-load warnings; catalogue search and full descriptions.
- Browser equipment constraints: two-handed/shield conflicts disabled in both directions; shield attacks require the held shield; removing the last purchased shield refunds it and clears both equipped references.
- Silver-mode browser checks: replacing the package clears grants and purchases; saved 3d6 results survive reload; explicit rerolls replace funds instead of accumulating them.
- Responsive check at 390 x 844: catalogue search, full Korean descriptions, purchasing, and active-weapon selection worked without horizontal page overflow. The viewport override was reset afterward.
- No console warnings or errors were captured from the production-preview tab during these checks. Tests used a separate origin from the user's existing localhost draft.

Screenshots: [desktop](qa-artifacts/equipment-desktop.jpg), [mobile](qa-artifacts/equipment-mobile.jpg).

No application code fixes were required by this verification pass. This does not resolve the source-fidelity questions or deliberately unimplemented rules above.

### After the SRD Translation Sync

- `npm.cmd test --prefix backend`: 208 passed, 0 failed, 0 skipped, including two new translation regressions.
- `npm.cmd run build --prefix frontend`: passed. The existing non-blocking bundle-size warning remains (710.72 kB minified / 198.36 kB gzip).
- All 12 weapon-property descriptions match the corresponding SRD text, allowing only the existing feet-notation normalization. A before/after comparison confirmed exactly five `name` and six `description` changes in the equipment JSONs, with all other fields and starting packages unchanged.
- SHA-256 comparisons confirmed the TeX source and both equipment archives were unchanged. The development API was restarted and verified to return `치료사의 도구` and `맨 몸` through the existing item IDs.
- Browser checks and screenshots above belong to the earlier equipment implementation verification; they were not rerun for this text-only sync.
