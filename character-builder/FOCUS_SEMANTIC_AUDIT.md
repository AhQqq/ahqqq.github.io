# Focus Catalogue Semantic and Naming Review

Initial audit: 2026-10-04. Reconciled: 2026-10-05. Status: remaining translator review and implementation handoff; completed manual-review entries removed.

## Scope and Evidence

The original internal pass covered **153 catalogue entries in 102 review items**. This document now retains **21 items: 17 open reviews and 4 resolved implementation notes**. The 81 items explicitly marked `Manual Review: Done` were removed at the user's request. Original item numbers are preserved for existing references; gaps are intentional. A closed wording review does not certify that every effect is automated.

This reconciliation compares the current `frontend/data/foci.json`, linked abilities, shared evaluators, `PROJECT_RULES.md` and `TASKS.md`. No external sources were consulted, no new translations or rules decisions were made, and no application tests were run. The translator decides intended meanings; optional naming suggestions are not official translations. Missing card-level detail may be supplied by a general rule and need not be invented locally.

The current catalogue contains **155 entries**. The old item 037 concerned 묵도 언데드, now `ss_undead1`; its completed review does not apply to the newly separated `undead1`/`undead2` entries. Both new entries have empty effect text. `undead1` translation remains explicitly user-owned in `TASKS.md`; this pass does not translate either entry or mark them reviewed.

The original catalogue SHA-256 was `099E836518F291BDA92023411EE0C40E143E6F56260B9EE5C3377B8895A82EC1`. It identifies the historical input, not the current catalogue. Stable IDs locate current entries.

## How to Read Findings

- **P1**: resolve before relying on the entry for character creation or publishing it as an unambiguous rule. These include concrete data/prose discrepancies and high-impact unresolved readings.
- **P2**: clarify before play; different reasonable readings change targeting, timing, costs, or outcomes.
- **P3**: editorial or naming polish without an identified immediate mechanical discrepancy.
- **D (discrepancy)**: two local representations demonstrably differ. This does not establish which one should win.
- **R (ruling)**: the current text permits materially different interpretations. Proposed alternatives are not approved rules.
- **E (editing)**: terminology, syntax, scope, or units need clearer expression.
- **N (name)**: an optional title change based on the local English label and actual effect.

Korean sentences introduced as **conditional wording** assume the stated interpretation is approved. Square-bracket placeholders mark decisions still needed; they must not be pasted into published rules unresolved. The historical first pass is complete; the remaining questions and implementation tasks have separate completion states. If an established general rule already supplies a timing, distance, reroll, or action convention raised below, add a clear reference instead of inventing a special exception. An omission from one focus is not proof that the whole game lacks that rule.

## Priority Queue

| Priority | Entries | Remaining question |
|---|---|---|
| P1 D/R | `ghoul1` | Monthly feeding in the focus versus weekly feeding in Ghoulish Vigor; starvation timing. |
| P1 R | `accipiter1` | Flight load inequality and maintenance interval. |
| P1 R/D | `pacting1` | Persistent pantheon/domain choice, reference list and spell-use timing. |
| Confirmed 2026-10-31 | `laborer1`, `warlike1` | User confirmed explicit minimum -2 for negative modifier effects. |
| Wording / future resource scope | `traditional_education1` | Describe the implemented starting-art/spell rules accurately; cross-class Effort interaction remains unmodeled. |
| Play-time / higher-level scope | `elves1`, `elves2` | Daily reroll result retention; level-2 modifier choice deferred in `TASKS.md`. Level-1 redistribution is implemented. |

Items 042, 044, 045 and 059 are resolved creation records, not open P1 implementation defects. Their rules live in `PROJECT_RULES.md` and completed tasks in `TASKS.md`. Other unmarked entries retain their original review questions; retaining a question does not imply it is an immediate implementation requirement.

## Implementation Handoff from Closed Reviews

Concrete remaining implementation/data work from deleted manual-review items is recorded in `TASKS.md`: All Directions Edge Style and Die Hard HP effects; Righteous Iron Style armor/equipment effects; Armored Magic, Lucky and Polymath prerequisites; Special Origin selection accounting; and the Authority Level 2 skill discrepancy. Carrying-capacity work (Pack Beast/Oni) and repeated Spirit Familiar Level 2 remain deferred there. Closing these semantic entries does not close those tasks.

The note in old item 008 saying Wrathful Mountain's -2 base attack penalty still needed implementation is obsolete: `derived_bonus.base_attack_bonus: -2`, the shared evaluator and `PROJECT_RULES.md` already cover it. Kitsune's art grant/replacement, Lizardmen AC and Dwarves HP are also implemented. Old items 030, 062, 064 and 082 were removed with their completed manual reviews; consult `PROJECT_RULES.md` for the preserved rules. Tinker Goblins now says WIS decreases by 1, matching its data. Folie a Deux now uses `aotle` for both levels.

## Catalogue-Wide Wording Rules

The following are cross-catalogue conventions to settle as needed, not instructions to reopen every manually approved entry.

| Topic | Observed risk | Editorial policy to approve |
|---|---|---|
| Speaker | “당신” and “여러분의 캐릭터” alternate. | Choose one rules voice; retaining “당신” consistently is concise. Flavor can remain stylistically varied. |
| Skill names | `stab` is 백병 in `skills.json`, but 접전/근접전 appear throughout foci; 잠행 also becomes 은신. | Use catalogue names when naming a skill: “백병(Stab) 기술”, “잠행(Sneak) 기술”. Reserve “근접 공격/근접전” for combat situations. |
| Attribute names | STR is 근력 in the catalogue but often 힘 in prose. | Use “근력(STR) 점수” or “근력 수정치”, never bare “능력치” when the distinction matters. |
| Actions | 주요/중요 행동; 간단/단순 행동; 즉시/즉각적인 행동 are mixed. | Define one label for each actual action type. Do not assume every ordinary phrase “즉각적인 행동” names the formal Instant action. |
| Casting | “주문을 외운다” can mean memorizing, preparing, or casting. | Distinguish “배운다”, “준비한다”, “시전한다”, and “일일 시전 횟수를 소비한다”. |
| Resource terms | 기관계 부담/기관계 부하/기관 부하; 분발/노력 vary. | Adopt one label per resource, preferably the project's established 기관계 부담 and 분발. State amount, commitment duration, recovery, and cap test. |
| Saves | “+2 내성” may be applied to a die or displayed target. | Write “내성굴림 결과에 +2 보너스” and explain once that the current sheet instead lowers its target by 2. Penalties raise it. Never apply both representations. |
| Numbers | “레벨” can mean character, focus, skill, spell, or target HD; “절반/반올림” is inconsistent. | Name the level source and parenthesize formulas. Use 올림/내림/가장 가까운 정수로 반올림 deliberately, with boundary examples. |
| Scope | “한 번”, “특정 대상”, “이 능력” have unclear owners. | Specify per user, per recipient, per attack, per round, per scene, per in-game day/week, or per session. Define whether one effect's usage is shared with another. |
| Re-rolls | Several entries omit whether the original or new result is used and whether re-rolls can chain. | Provide a shared re-roll rule or state the result-retention rule locally. Do not add “더 좋은 결과” where the text does not grant it. |
| Injury | 치명상/치명적인 피해/살상/저살상/비살상 blur states and damage modes. | Use a defined state for mortal wounds; distinguish lethal damage from an attack that happens to cause a mortal wound. Prefer one term for nonlethal damage. |
| AC and Shock | “AC10으로 취급” can be read as lowering real AC; “최소 1 피해” can negate immunity. | Limit fictitious AC to Shock eligibility and state whether immunity still applies. A minimum applies only after establishing that damage is received. |
| Units | 10’, 10ft, bare 10 + level, “무게 2”, and “120도” coexist. | Use explicit ft for distance, encumbrance points for 하중, and physical weight only when intended. Do not silently convert 120 degrees to feet. |
| Level inheritance | Many Level 2 entries have empty descriptions; prerequisites alone do not explain inherited restrictions. | State once that Level 1's applicable restrictions persist, while specific replacements override rather than stack. Repeatable exceptions require their own ownership rule. |
| Caps | “최대 +2/+3” may look like a bonus amount or an absolute limit. | Separate contribution, final cap permission, and score. Preserve the approved shared -2/+2 default and non-stacking absolute cap overrides. |
| Free skills | “보너스 기술”, “기술-0”, “기술 수준으로 간주” are not interchangeable. | Reference the approved allotment rules; distinguish actual allotments, minimum ranks, and effective ranks used only for checks. |
| Flavor versus rules | Mechanical penalties and prerequisites sometimes live in `desc`. | Preserve flavor, but repeat operative clauses in a clearly labeled rules/prerequisites block. Otherwise card previews and summaries can hide disadvantages. |
| Cross-references | Some translated spell/ability names do not match their local entries. | Link by stable local ID plus the approved display name. A higher-level spell referenced by an ability is not automatically a learned starting spell. |

### Naming and Metadata Policy

Keep setting-specific terms such as 那落種, 抱病種, 默都, 自刻人, 奴役種, and 隷屬種 unless you choose otherwise. They are not automatically errors. Because “포병” ordinarily also suggests artillery, consider displaying “포병종(抱病種)” on first use. Separate a title's translated name, English name, and hanja alias instead of putting all three into `englishName`.

Nine `englishName` fields are blank: `focus_0221`, `focus_0251`, `focus_0271`, `focus_0291`, `focus_0321`, `focus_0331`, `focus_0351`, `focus_0361`, and `focus_0381`. Do not invent supposed original English names; an optional descriptive gloss can be explicitly marked as editorial. Seven names have trailing whitespace: `focus_0531`, `halflings1`, `gnomes1`, `goblins_tinker1`, `lizardmen1`, `lizardmen2`, and `orcs1`.

Duplicate “드워프 / Dwarves” titles represent different origins, not duplicate IDs. Use category/setting qualifiers in the UI and review text; do not merge mechanics based on names. The old Folie a Deux source mismatch is resolved: both levels now use `src: aotle`.

The current structural checks are reported under Coverage and Validation. They establish link integrity, not semantic correctness.

## Detailed Review

The following 21 retained items use their original review numbers. Current catalogue coverage is no longer represented by the remaining IDs lines alone. Four entries explicitly marked resolved below preserve recent implementation decisions; the other 17 remain open. Unencoded play-time effects are not by themselves translation errors.

## Bloodline Foci

### 015 바람처럼 걷다 / Walk Like Wind

**IDs:** `walk_like_wind1`, `walk_like_wind2`

**Priority:** P2

- **Name:** Optional 바람걸음 to make the title a noun; current wording is understandable.
- **Observation:** R: Level 1 permits vertical travel but omits ceiling traversal, falls when unable to end safely, and whether a handhold merely ends a move or the whole turn. Level 2 already assigns jumping to a Move action; clarify whether the scene-limited Move action is additional and how general movement rules apply.
- **Revision or ruling:** Use “자신의 턴이 끝날 때 서 있을 수 있는 수평면 또는 붙잡을 수 있는 지점에 도달해야 합니다.” Specify horizontal 20ft and vertical 10ft separately. Keep +10ft as a movement-speed increase, not an added free Move action.
- **Manual Review:** Done

### 016 야생의 혀 / Wildtongue

**IDs:** `wildtongue1`, `wildtongue2`

**Priority:** P2

- **Name:** Keep as imagery; 야생의 말 is a plainer alternative.
- **Observation:** R: The local definition deliberately includes magical animals; avoid narrowing it to mundane beasts. Level 1's “즉각적인 행동” may describe a short request rather than a formal Instant action. Level 2 needs an action cost, visible-target selection, the save timing, and what happens when commands become dangerous.
- **Revision or ruling:** Replace the casual action phrase with “그 자리에서 간단히 수행할 수 있는 부탁” if not a named action. State that only magical animals receive the listed Mental save, unless you intend otherwise. “하루에 한 번, 보이는 동물 한 마리에게 ... 한 장면 동안” preserves existing duration and target count.
- **Manual Review:** Done

## Mystic Secrets

### 017 예지술 / Divination

**IDs:** `divination1`

**Priority:** P2

- **Name:** Keep; this text concerns future events specifically, so 예지술 is more precise than a generic 점술 label.
- **Observation:** R: “첫 사용 후 일주일 내 재사용은 난이도를 +1” can mean cumulative +1 per use or one flat +1 for any repeat. Define the week/reset and what counts as the same question. The current text charges 1 System Strain on every use; do not invent a success-only exception.
- **Revision or ruling:** Use “같은 [7일 기간]의 두 번째 사용은 난이도 10, 세 번째는 11 ...” only if cumulative escalation is approved; otherwise state the fixed repeat difficulty. Preserve that the GM rolls secretly and failed readings sound plausible. The future horizon and retry restriction are distinct.
- **Manual Review:** Done

### 018 계약술 / Pacting

**IDs:** `pacting1`

**Priority:** P1

- **Name:** Keep.
- **Observation:** R/D: choosing a pantheon/domain is a persistent creation choice, but only Pray is encoded. The page-142 reference is not self-contained. Immediate bonuses and a later Main-action spell are conflated; duration and expiration of that permission are unstated. The caster level and authority selecting the domain-appropriate spell are missing.
- **Revision or ruling:** Split into “계약 대상을 선택합니다” and “하루에 한 번 ... 다음 효과 중 하나”. Give separate action/cost lines for +4 attack, +1 skill, and one level-1 spell. Identify the local domain list or include the allowed list. Do not equate mage archetype eligibility with automatically knowing/preparing spells; the text explicitly allows noncasters.
- **Manual Review:** Done

### 019 혈마술 / Hemomancy

**IDs:** `hemomancy1`

**Priority:** P2

- **Name:** Keep; 혈액 마법 would be less compressed but not more mechanically accurate.
- **Observation:** R: “하루에 한 번” and “사용할 때마다” coexist harmlessly if the latter describes cost, but the refund trigger after casting needs clarity. Define whether direct and indirect harm, mixed willing/unwilling targets, or a later harmful use disqualify the spell. Damage prevention and interrupted spells are unspecified.
- **Revision or ruling:** State “주문 시전을 완료한 직후 ... 그 주문의 레벨당 1d4 피해와 기관계 부담 1점을 받습니다. 그 주문은 일일 시전 횟수를 소비하지 않은 것으로 처리합니다.” This is conditional on that timing interpretation. Specify whether damage must actually be suffered to gain the refund.
- **Manual Review:** Done

### 020 문양술 / Sigilism

**IDs:** `sigilism1`

**Priority:** P2

- **Name:** Keep; 인장술 is optional if it fits the token terminology elsewhere.
- **Observation:** R: no token expiration, spell-selection rule, or handling of a second token is stated. Spending a cast now and recovering it while the token survives is significant, not merely alternate spell preparation. Clarify target/range and level determination when creating versus activating, armor restrictions, and whether silence/gesture exceptions alone are granted.
- **Revision or ruling:** Write “동시에 충전된 토큰은 1개만 보유할 수 있습니다. 새 토큰을 충전하면 기존 토큰은 [실효/제작 불가 중 확정]”. State that only the creator can activate it. If the token remains until used, say so rather than adding an invented daily expiration.
- **Manual Review:** Done

### 021 정신주술 / Mind-Sorcery

**IDs:** `mind_sorcery1`

**Priority:** P2

- **Name:** Suggested 정신 주술 for spacing; keep the term unless 마법/주술 are intentionally distinct systems.
- **Observation:** R: the exclusion for HP-damaging spells is broader than merely suppressing their nonmental damage, yet the next sentence suppresses secondary effects only. Define direct/secondary damage, hybrid spells, and whether the restriction forbids learning, preparing, or casting. E: 대게 -> 대개; 입은채로 -> 입은 채로.
- **Revision or ruling:** Separate “시전할 수 없는 주문” from “시전하되 발생하지 않는 부차적 효과”. Preserve the explicit remaining interruption/armor rules so silent casting does not imply universal stealth or armored casting. Link 비전 형태의 감정 to local spell ID apprehending_the_arcane_form.
- **Manual Review:** Done

## Nonhuman Origins

### 022 !인간 / English name absent

**IDs:** `focus_0221`

**Priority:** P2

- **Name:** Keep !인간 only if the programming-style negation is intentional. Add a pronunciation or explanatory subtitle; 인간 모사체 is a possible descriptive subtitle, not a recovered original title.
- **Observation:** R: “마법을 제외한 다른 기술” should explicitly mean one skill and does not exclude combat skills. The daily algorithm bonus lacks a before/after-roll decision window. Mental magical immunity needs scope: consent, beneficial effects, and mixed physical/mental effects.
- **Revision or ruling:** “마법 기술을 제외한 기술 1개를 보너스 기술로 얻습니다.” Distinguish fictional lack of self-awareness from removal of player choice; it must not silently change control of the PC. State that automaton traits are not granted rather than relying on a comparison readers may not know.
- **Manual Review:** Done

### 023 맹금류 나락종 / Accipiter 那落種

**IDs:** `accipiter1`

**Priority:** P1

- **Name:** Keep; alternatively 맹금형 나락종 if it denotes a humanoid form rather than a bird taxon. Preserve the setting label.
- **Observation:** R/E: flight's “절반의 반내림만 보다 적게” is not a usable inequality. Is a load exactly equal to floor(half normal stowed capacity) allowed? Flight maintenance needs an action interval; provoking “주위의 적” needs range and per-enemy limit. Carrying a cooperative adult with two flyers should specify encumbrance treatment.
- **Revision or ruling:** Publish an explicit inequality, e.g. “보관 하중이 floor(통상 한도 / 2) [이하/미만]이어야 합니다” after choosing the boundary. “매 [턴] 이동 행동 1회를 비행 유지에 사용하지 않으면 추락합니다” likewise needs the interval confirmed. Keep outdoor/large-room eligibility and 60 miles per 10 travel hours distinct from combat speed.

### 024 귀족 나락종 / Aristoi 那落種

**IDs:** `aristoi1`

**Priority:** P2

- **Name:** Keep; 귀족 is descriptive of the origin and need not prove an actual legal title in every setting.
- **Observation:** R: “마법을 제외한 다른 기술과 지휘” leaves choosing Lead again unclear; current bonus data permits Lead as the open choice in addition to its fixed grant, subject to allocation rules. WIS as weapon attribute needs to identify attack rolls, damage, and whether replacing STR/DEX is optional.
- **Revision or ruling:** “지휘와, 마법을 제외한 기술 1개를 보너스 기술로 얻습니다. 이 선택으로 지휘를 다시 고를 수 있는지는 [확정].” For the weapon effect say “...에 쓰는 근력/민첩 수정치 대신 지혜 수정치를 사용할 수 있습니다” and enumerate its affected calculations.

### 025 카피바라 수인 / English name absent

**IDs:** `focus_0251`

**Priority:** P2

- **Name:** Keep. Do not fabricate a source-language title for the blank English field.
- **Observation:** R: “당신이 있는 곳” gives the reaction bonus no presence/participation limit; clarify whether the NPC must perceive the character. Multiple capybaras and Well Met can create an undefined stacking case. The week's language exposure needs a proficiency definition and whether exposure must be active.
- **Revision or ruling:** State who benefits from the reaction-roll bonus and whether it applies once per roll regardless of how many sources are present. “일주일간 해당 언어에 노출되면 일상적인 의사소통이 가능한 수준으로 말할 수 있습니다” is a candidate only if that is the intended meaning of 쓸만한.
- **Manual Review:** Done

### 026 구울 / Ghoul

**IDs:** `ghoul1`

**Priority:** P1

- **Name:** Keep.
- **Observation:** D: effect requires one pound of fresh human flesh per month, while Ghoulish Vigor's imported text requires one pound per week. The 21-day save and automatic state at 30 days do not settle which interval the PC uses. R: does feeding reset the timer only after a full pound, and does “이 상태” mean the compulsion or automatic save failure?
- **Revision or ruling:** Do not average or select an interval. Add an explicit PC override if intended: “이 기원으로 얻는 구울의 생명력에는 다음 식사 주기가 적용됩니다: [확정].” Define the fresh-food requirement, timer reset, attack compulsion duration, and whether any stated immunity/trait applies to ordinary ghouls but not this origin.
- **Manual Review:** Done

### 028 전령 나락종 / Harbinger 那落種

**IDs:** `harbinger1`

**Priority:** P2

- **Name:** Keep; “Harbinger” can imply a portent, but 전령 is not demonstrably wrong from this local text.
- **Observation:** R: Harbinger's Face already specifies a village-sized population within 20 miles, an hour of concentration, the same sex and an average local appearance. The minimum population and duration/persistence remain open. “비마법적인 힘” plus detection immunity can read as immunity even to direct mundane contradictions. Language/custom knowledge may or may not persist after another transformation.
- **Revision or ruling:** Specify that an average local appearance is not impersonation of an individual. State whether transformation persists indefinitely, whether it changes anatomy versus appearance, and exactly what inspection cannot reveal. “변신한 집단의 언어와 일반 풍습을 [변신 중에만/영구히] 압니다” requires a choice.

### 042 자각인 / 自刻人

**IDs:** `focus_0421`

**Status:** Creation implementation resolved; retained for reference.

- **Name:** Keep the hanja on first mention: without it, 자각인 readily reads as 自覺 rather than 自刻. 스스로를 새긴 자 is an optional gloss, not a replacement imposed on the setting.
- **Observation:** Resolved with the translator on 2026-10-05. Allocation and background growth precede the mandatory CON replacement: below 14 becomes 14; otherwise 18. Modifier bonuses follow. Exert is preserved, +2 maximum Strain adjustment is encoded, and score/modifier/HP/saves and play notes appear on the sheet. Total maximum Strain remains a separate task.
- **Revision or ruling:** Confirmed: recovery requires exhaustion from labor/equivalent exertion at day's end. While exhausted by that activity, roll each whole attack/skill check twice and keep the lower result. Failure to meet the recovery condition adds 1 Strain nightly; death occurs strictly above the maximum. These are play-time notes. Thresholds, background growth, modifier ordering, fixed/rolled allocations, other-origin conflicts, removal and restoration are tested. See `PROJECT_RULES.md`.
- **Manual Review:** Done

## Other Creature Origins

### 044 소유품 포병종 / Chattel 抱病種

**IDs:** `chattel1`

**Status:** Creation implementation resolved; retained for reference.

- **Name:** Consider 재산 취급 포병종 or retain 소유품 포병종; the latter's dehumanizing force is consistent with its flavor, not an automatic mistranslation.
- **Observation:** Resolved on 2026-10-05 with the translator. Both allocation modes replace STR after optional replacement and background growth with a saved 1d4+2 result; modifier effects follow. Explicit rolling stores a raw integer 1–4 per focus instance, with no rerolls during rendering or restoration. Removing the focus restores the original allocation and growth.
- **Revision or ruling:** Encoded CON/CHA modifier +1 with separate maximum +3 permission, unconditional attack -2, and a social-check +1 sheet note. The restricted skill remains one allotment. Missing/invalid dice or modifier choices block completion, including older drafts. Tests cover both allocation modes, ordering, caps, invalid input, derived values, removal and restoration. See `PROJECT_RULES.md`.
- **Manual Review:** Done


### 045 기능성 포병종 / Functionary 抱病種

**IDs:** `functionary1`

**Status:** Creation implementation resolved; retained for reference.

- **Name:** Suggested 기능 특화 포병종; 기능성 sounds like a product-quality adjective rather than a being bred for a purpose. Keep if that clinical tone is intentional.
- **Observation:** Resolved with the translator on 2026-10-05: one skill allotment total and a free level-1 Specialist bound to it. Same-skill paid Specialist instances are removed with their choices and their picks refunded; other skills remain separate. The chosen -1 modifier (normal minimum -2) is now encoded. Grants are derived from eligible parents and are shown with source and bound skill.
- **Revision or ruling:** Parent changes/removal and saved restoration rebuild the grant; automatic instances cannot be edited or removed independently. Level-2 creation remains unavailable. The function-specific +1 and normal tool/equipment substitution are play notes, with no automatic raw-material waiver. See `PROJECT_RULES.md` for refund and validation details. Tests cover counts, ownership, skill changes, removal, malformed choices and restoration.
- **Manual Review:** Done


### 046 노동자 포병종 / Laborer 抱病種

**IDs:** `laborer1`

**Priority:** P1 R (modifier-bound ruling reopened); P2 for rest wording.

- **Name:** Keep.
- **Observation:** Reopened at the user's request on 2026-10-05: verify whether a modifier penalty can take the normal -2/+2 range down to -3 or stops at -2. Current Laborer prose and `cap_override.min` both say -2; agreement between them does not settle the intended source rule. Review similar foci and stacked cap permissions without assuming a -1 penalty itself extends the minimum. The conditional Mental-save penalty is already encoded separately from ordinary targets.
- **Revision or ruling:** Confirm the minimum and distinguish modifier contributions, permitted bounds and attribute scores before changing code/data. The task is tracked in `TASKS.md`. “절반의 휴식” still needs a scope decision if recovery systems are modeled; keep the mind-affecting condition on the Mental-save penalty.
- **Manual Review:** Done


## Other World Origins

### 059 노움 / Gnomes

**IDs:** `gnomes1`

**Status:** Creation implementation resolved; retained for reference.

- **Name:** Keep; use 숲/지하 노움 and 발명가 노움 as variant labels if the choice is retained.
- **Observation:** The current effect and `bonus` now offer exactly one choice between Sneak (`sneak`) and Craft (`craft`). `TASKS.md` marks this implementation complete; `backend/src/gnomes.test.ts` covers it. The old fixed-Sneak/no-choice finding is obsolete.
- **Revision or ruling:** Preserve the DEX bonus and STR/WIS penalty. Trailing name whitespace remains cosmetic; do not treat it as missing skill functionality. See `PROJECT_RULES.md` for restoration behavior.

## Other Demihuman Origins

### 065 엘프 / Elves, reincarnating variant

**IDs:** `elves1`, `elves2`

**Priority:** P2 for the remaining reroll wording; level-2 implementation is deferred.

- **Name:** Keep with a qualifier such as 환생 엘프 only if consistent with the setting; don't confuse it with the Civilized/Forest variants.
- **Observation:** Level-1 redistribution implemented after translator confirmation on 2026-10-05. It is optional: raise selected pre-focus scores below 9 exactly to 9, funding them with equal integer reductions from other scores whose final values remain at least 9. Allocation/replacement and background growth precede redistribution; modifier bonuses follow. Both allocation modes retain original saved scores and total points.
- **Revision or ruling:** Per-instance score transfers are persisted and validated atomically; invalid or stale transfers block completion, while absent transfers mean no redistribution. Tests cover derived values, removal, restoration and skill grants. Existing free-skill/Notice duplicate handling follows the shared allotment rules unchanged. Daily reroll result retention remains unresolved; rerolls, vision and reincarnation are sheet notes. Level 2 remains unavailable and its mental modifier +1 / maximum +3 is still deferred in `TASKS.md`.

## Additional Foci

### 101 일반 연금술 / Mundane Alchemy

**IDs:** `mundane_alchemy1`, `mundane_alchemy2`

**Priority:** P2

- **Name:** Consider 비마법 연금술 only if Mundane explicitly distinguishes nonmagical practice in your terminology; 일반 연금술 is safe if it is a system label rather than a power tier.
- **Observation:** E/R: Level 1 says Alchemy-0, while the approved builder treats this as one allotment that can instead produce level 1 or overflow points. Level 2's one week for 25 silver per level of reagents lacks a production cap and whether output can be accumulated, sold, or applied to all costs. The earlier improvised-lab permission may not cover advanced work.
- **Revision or ruling:** Reference the approved skill-allotment rule rather than resetting existing skill to 0. Distinguish basic/advanced recipe access from learned recipe lists. “캐릭터 레벨 x 25은화 상당의 재료 ... 자신의 작업에만 사용” preserves the stated value and personal-use limit without inventing resale rights or an automatic weekly stipend.

### 102 전통적 교육 / Traditional Education

**IDs:** `traditional_education1`

**Priority:** P1

- **Name:** Suggested 마법 전통 수련 or 비전 전통 교육. 전통적 교육 sounds like ordinary conservative schooling rather than training in one magical tradition.
- **Implementation follow-up (2026-10-04):** Tradition selection, Invoker-only school access, starting arts, and the Effort maximum are now encoded. The translator confirmed the Invoker's full/partial status determines the tradition's starting-art rule, including fixed arts; duplicates are learned once with no replacement. Starting spells remain two for partial Invoker and four for full Invoker, all first level. Maximum Effort uses Magic skill level with the existing minimum of 1; no attribute bonus is added. Prior verification is recorded in `TASKS.md`; this document-only pass did not rerun it. Cross-class Effort interaction is not modeled; the displayed value retains its focus source.
- **Remaining wording review:** Rewrite the focus prose to explicitly use the Invoker's full/partial status, include fixed arts without duplicate replacements, and expand allowed schools without increasing starting spell count, following the confirmed implementation above. “최대 분발 = max(1, 마법 기술 레벨)” still needs to specify its interaction with another class's Effort before shared pools or expenditure are implemented. Preserve the one-purchase limit and no later arts from this tradition. The Korean-name suggestions remain unapproved.

## Coverage and Validation

| Check | Result on 2026-10-05 |
|---|---:|
| Current catalogue entries | 155 |
| Original numbered review items | 102 |
| Completed manual-review items removed | 81 |
| Retained open review items | 17 |
| Retained resolved implementation notes (042, 044, 045, 059) | 4 |
| Unique current IDs in retained review items | 25 |
| Unknown/duplicate retained IDs | 0 |
| Dangling focus prerequisite references | 0 |
| Level-2 entries without a level-1 prerequisite | 0 |

The old 153-entry coverage matrix describes the original pass and is no longer a current completeness claim. `ss_undead1` carries the renamed identity of closed item 037. New `undead1`/`undead2` still require translation/review; they are not certified by that old item. The current catalogue hash is `870FB0662E19CAE9004683CF6859B3B5530047B71BD78FC849514E1CDE8B1D26`.

This reconciliation changes review/task documentation only. It does not execute or certify application behavior, retranslate manually approved entries, or infer complete `sheet_notes` coverage. `TASKS.md` retains the distinction between creation calculations, missing implementation and deferred play-time scope.

## Resolution Workflow

1. Resolve the remaining translator questions using the local entry and any applicable general rule; add source verification only when that review is authorized.
2. Record approved rules in `PROJECT_RULES.md` and implementation work in `TASKS.md`; keep translation approval separate from implementation completion.
3. After manual review is marked done, remove that detailed review item while preserving any explicit outstanding task. Preserve original numbers in the remaining entries.
4. For implemented changes, verify the relevant boundary cases, removal and saved-draft restoration. Play-time rulings need not become a simulator, and partial sheet-note coverage remains a scope issue.
