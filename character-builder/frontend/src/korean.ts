import attributes from '../data/attributes.json'
import skills from '../data/skills.json'
import classes from '../data/classes.json'
import foci from '../data/foci.json'
import spells from '../data/spells.json'
import abilities from '../data/abilities.json'
import equipment from '../data/equipment.json'
import type { FocusAllowanceType } from '../../shared/focusAllowances'

export const FOCUS_ALLOWANCE_LABELS: Record<FocusAllowanceType, string> = {
  warrior: '전사 (전투)', expert: '전문가 (비전투)', free: '자유',
}

type NamedEntry = { id: string; name: string; eng_name?: string; englishName?: string }
const names = new Map<string, string>()
for (const entry of [...attributes, ...skills, ...classes, ...foci, ...spells, ...abilities, ...equipment] as NamedEntry[]) {
  for (const alias of [entry.id, entry.eng_name, entry.englishName]) {
    if (alias) names.set(alias.toLowerCase(), entry.name)
  }
}
const terms: Record<string, string> = {
  mage: '마법사', physical: '육체 내성', evasion: '회피 내성', mental: '정신 내성', luck: '행운 내성',
  light: '경갑', medium: '평갑', heavy: '중갑', none: '없음',
  armor: '갑옷', shield: '방패', weapon: '무기', full: '순수', partial: '부분',
}
export function nameFor(value: string) {
  return names.get(value.toLowerCase()) ?? terms[value.toLowerCase()] ?? (/[가-힣]/.test(value) ? value : '알 수 없는 항목')
}

// Keep source descriptions intact; preserve HP/AC and expand other rule abbreviations only in the UI.
export function rulesText(value: string | undefined) {
  const abbreviations: Record<string, string> = {
    STR: '근력', DEX: '민첩', CON: '건강', INT: '지능', WIS: '지혜', CHA: '매력',
    HD: '히트 주사위', GM: '진행자', PC: '플레이어 캐릭터', NPC: '비플레이어 캐릭터',
  }
  return (value ?? '').replace(/\b(STR|DEX|CON|INT|WIS|CHA|HD|GM|PC|NPC)\b(?:(으로|로|은|는|이|가|을|를)(?=\s|[.,:;!?()0-9]|$))?/g, (_match, term: string, particle?: string) => {
    const label = abbreviations[term]!
    const finalConsonant = (label.charCodeAt(label.length - 1) - 0xac00) % 28
    if (!particle) return label
    if (particle === '으로' || particle === '로') return label + (finalConsonant && finalConsonant !== 8 ? '으로' : '로')
    const pair = ['은는', '이가', '을를'].find((value) => value.includes(particle))!
    return label + pair[finalConsonant ? 0 : 1]
  })
    .replace(/(\d)\s*ft\b/g, '$1피트')
}

const messages: Record<string, string> = {
  "Choose a known class.": "등록된 클래스를 선택하세요.",
  "Choose exactly two class slots.": "클래스를 두 칸 모두 선택하세요.",
  "Unfinished (invalid class selection)": "클래스 조합 미완료",
  "Choose a valid background.": "유효한 배경을 선택하세요.",
  "Background free skill": "배경 보너스 기술",
  "The background's fixed free skill cannot be changed.": "배경의 고정 보너스 기술은 바꿀 수 없습니다.",
  "Choose the background's free skill from its allowed options.": "배경에서 허용하는 보너스 기술을 선택하세요.",
  "Pick exactly two additional learning-table skills.": "학습 표에서 추가 기술을 정확히 두 개 고르세요.",
  "Allocate exactly three rolls between the growth and learning tables.": "성장 표와 학습 표에 주사위 세 번을 배정하세요.",
  "Roll all three allocated background dice.": "배정한 배경 주사위 세 개를 모두 굴리세요.",
  "Choose whether to pick two background skills or roll three times.": "배경 기술 두 개 선택 또는 주사위 세 번 굴리기 중 하나를 고르세요.",
  "Free skill": "자유 기술",
  "Choose a free skill.": "자유 기술을 하나 선택하세요.",
  "Already has two allotments (level 1); choose another skill.": "이미 두 번 배정되어 1레벨입니다. 다른 기술을 선택하세요.",
  "Only one origin focus family is allowed. Linked upgrades count as the same family but cost another pick.": "기원 포커스는 한 계열만 선택할 수 있습니다. 연결된 상위 레벨은 같은 계열이지만 선택권을 별도로 사용합니다.",
  "Only one origin focus family is allowed. Remove the selected origin first.": "기원 포커스는 한 계열만 선택할 수 있습니다. 기존 기원을 먼저 해제하세요.",
  "No focus picks remaining. Remove a selected level first.": "남은 포커스 선택권이 없습니다. 선택한 레벨을 먼저 해제하세요.",
  "Invalid legacy focus selections.": "이전 형식의 포커스 선택을 읽을 수 없습니다. 다시 선택하세요.",
  "Focus instances must be a list.": "저장된 포커스 선택 형식이 올바르지 않습니다. 다시 선택하세요.",
  "Malformed focus instance; remove it and select the focus again.": "포커스 선택 정보가 올바르지 않습니다. 해제한 뒤 다시 선택하세요.",
  "Invalid focus allowance configuration.": "포커스 선택권 설정이 올바르지 않습니다.",
  "Invalid focus allowance total.": "포커스 선택권 합계가 올바르지 않습니다.",
  "High Magic": "고마법",
  "Elementalist magic": "원소술",
  "Necromancer magic": "사령술",
  "This class cannot learn this spell at level 1.": "이 클래스는 1레벨에 이 주문을 배울 수 없습니다.",
  "Both spell picks are used in this slot. Remove one to change your selection.": "이 클래스의 주문 두 개를 모두 골랐습니다. 다른 주문을 고르려면 하나를 해제하세요.",
  "Spell selections must contain exactly two class-slot arrays.": "주문 선택은 두 클래스별로 구분되어야 합니다. 각 클래스에서 다시 선택하세요.",
  "Flat spell selections are no longer valid. Reload the builder to assign spells to their class slots.": "이전 주문 선택 형식은 더 이상 지원하지 않습니다. 새로고침한 뒤 클래스별로 주문을 배정하세요.",
  "Saved spell choices were rechecked. Invalid, duplicate, higher-level, or excess selections were removed; review the two picks for each class slot.": "저장된 주문 선택을 다시 확인했습니다. 유효하지 않거나 중복·상위 레벨·개수 초과인 주문을 해제했으니 클래스별로 두 주문을 확인하세요.",
  "Starting arts are not configured for this class selection.": "이 클래스 조합의 시작 기교 규칙이 아직 등록되지 않았습니다.",
  "Art allowance counts must be nonnegative integers.": "시작 기교 개수 설정이 올바르지 않습니다.",
  "Starting arts contain duplicate fixed grants or choice-group IDs.": "시작 기교의 고정 부여 또는 선택 그룹이 중복 등록되어 있습니다.",
  "A restricted art group has too few distinct, non-fixed options.": "지정 기교 목록의 선택지가 부족합니다. 고정 부여와 중복되지 않는 기교가 필요합니다.",
  "The art catalogue has too few distinct options for this allowance.": "허용된 선택 개수에 비해 등록된 기교가 부족합니다.",
  "Unknown art choice group.": "등록되지 않은 기교 선택 그룹입니다.",
  "This art does not belong to this class.": "이 클래스에 속하지 않는 기교입니다.",
  "This art is not an option in this choice group.": "이 선택 그룹에서 고를 수 없는 기교입니다.",
  "Already granted by class; it does not use a pick.": "클래스에서 자동 습득한 기교입니다. 선택권을 사용하지 않습니다.",
  "Already selected in another art choice for this class.": "이 클래스의 다른 선택에서 이미 고른 기교입니다.",
  "This art can only be taken through its exclusive choice group.": "이 기교는 전용 지정 목록에서만 고를 수 있습니다.",
  "All picks in this section are used. Remove an art to change your selection.": "이 항목의 기교를 모두 골랐습니다. 다른 기교를 고르려면 하나를 해제하세요.",
  "Art selections must be an object keyed by class ID.": "저장된 기교 선택 형식이 올바르지 않습니다. 클래스별로 다시 선택하세요.",
  "Art choices for a class must be an object.": "이 클래스의 기교 선택 정보가 올바르지 않습니다.",
  "Only groups and chosen may be submitted; fixed grants are derived from the rules.": "기교 선택 정보가 올바르지 않습니다. 고정 기교는 규칙에 따라 자동으로 부여됩니다.",
  "Art choice groups must be an object.": "기교 선택 그룹 정보가 올바르지 않습니다.",
  "Malformed art ID.": "기교 선택 정보가 올바르지 않습니다.",
  "An art cannot be selected twice.": "같은 기교를 두 번 선택할 수 없습니다.",
  "Additional arts": "추가 기교",
  "Saved arts were rechecked. Invalid, duplicate, or excess choices were removed; review your class arts.": "저장된 기교를 다시 확인했습니다. 유효하지 않거나 중복·개수 초과인 기교를 해제했으니 클래스 기교를 확인하세요.",
  "Equipment purchases must contain only item IDs and positive integer quantities.": "구매 장비와 수량을 확인하세요. 수량은 1 이상의 정수여야 합니다.",
  "Combine duplicate purchase rows into one quantity per item.": "같은 장비의 중복 구매 항목을 하나로 합쳐야 합니다.",
  "Equipped choices must contain only armorId, shieldId, and weaponId strings.": "착용 장비 정보가 올바르지 않습니다. 갑옷·방패·무기를 다시 선택하세요.",
  "Malformed saved purchases were cleared.": "형식이 올바르지 않은 저장 구매 내역을 초기화했습니다.",
  "Malformed saved equipped choices were cleared.": "형식이 올바르지 않은 저장 착용 내역을 초기화했습니다.",
  "Equipment purchases exceed the available starting funds.": "장비 구매 비용이 시작 자금을 초과합니다.",
  "Finish a valid starting equipment choice and purchases before calculating equipped AC.": "착용 장비를 반영한 AC를 계산하려면 시작 장비와 구매 내역을 완료하세요.",
  "The equipped armor has invalid AC or skill penalty data.": "착용한 갑옷의 AC 또는 기술 페널티 데이터가 올바르지 않습니다.",
  "The equipped shield has invalid AC data.": "손에 든 방패의 AC 데이터가 올바르지 않습니다.",
  "AC requires a valid final DEX modifier.": "AC 계산에 유효한 최종 민첩 수정치가 필요합니다.",
  "A two-handed active weapon cannot be used with a held shield. Stow the shield or change the weapon.": "양손 무기와 방패를 동시에 사용할 수 없습니다. 방패를 해제하거나 무기를 바꾸세요.",
  "To attack with a shield, select that same shield as your held shield.": "방패로 공격하려면 그 방패를 손에 든 방패로도 선택해야 합니다.",
  "Starting equipment must be a method selection.": "시작 장비 획득 방식을 선택하세요.",
  "Choose a starting package by its ID.": "시작 장비 꾸러미를 선택하세요.",
  "Starting silver requires exactly three d6 results, each an integer from 1 to 6.": "시작 은화를 정하려면 1부터 6까지의 주사위 결과가 정확히 세 개 필요합니다.",
  "Unknown starting equipment method. Choose a package or roll silver.": "장비 꾸러미 또는 시작 은화 굴리기 중 하나를 선택하세요.",
  "Starting equipment must contain only the active method and its choice; do not combine package grants with a silver roll or submit cached items or money.": "시작 장비에는 한 가지 획득 방식만 사용할 수 있습니다. 꾸러미와 은화 굴리기를 함께 적용할 수 없습니다.",
  "Saved equipment choices were malformed and were cleared. Choose a package or roll starting silver again.": "저장된 장비 선택 형식이 올바르지 않아 초기화했습니다. 꾸러미를 고르거나 시작 은화를 다시 굴리세요.",
  "The old armor selector has been removed. It does not represent a starting package; choose a package or roll starting silver. Other character choices were retained.": "이전 갑옷 선택은 시작 장비가 아니므로 제거되었습니다. 꾸러미를 고르거나 시작 은화를 굴리세요. 다른 캐릭터 선택은 유지했습니다.",
  "Choose a starting equipment package or roll starting silver.": "시작 장비 꾸러미를 고르거나 시작 은화를 굴리세요.",
  "Roll 3d6 for starting silver.": "시작 은화를 정하기 위해 3d6을 굴리세요.",
  "Choose one starting equipment package.": "시작 장비 꾸러미 하나를 선택하세요.",
  "Invalid base hit dice in the progression table.": "클래스 성장 표의 기본 히트 주사위가 올바르지 않습니다.",
  "Class ability rules must target character level 1.": "클래스 능력 규칙은 1레벨 캐릭터를 기준으로 해야 합니다.",
  "Invalid class combination in ability grant rules.": "능력 부여 규칙의 클래스 조합이 올바르지 않습니다.",
  "Array allocation must use 14, 12, 11, 10, 9, and 7 exactly once.": "고정 배정은 14, 12, 11, 10, 9, 7을 각각 한 번씩 사용해야 합니다.",
  "Choose fixed array or rolled attribute allocation.": "고정 수치 배정 또는 주사위 굴리기를 선택하세요.",
  "Only rolled attributes may use the optional replacement with 14.": "주사위로 정한 능력치만 하나를 14로 대체할 수 있습니다.",
  "Choose a single valid attribute to replace with 14.": "14로 대체할 능력치 하나를 선택하세요.",
  "1-2. Attributes and modifiers": "1-2. 능력치와 수정치",
  "3-4. Background and background skills": "3-4. 배경과 배경 기술",
  "5-6. Class and foci": "5-6. 클래스와 포커스",
  "7. Free skill": "7. 자유 기술",
  "8-9, 12. Hit points, attack, and saves": "8-9, 12. HP·공격·내성",
  "10. Starting equipment or silver": "10. 시작 장비 또는 은화",
  "11. Equipped armor, shield, and Armor Class": "11. 착용 갑옷·방패·AC",
  "13. Name and goal": "13. 이름과 목표",
  "14. Class arts": "14. 클래스 기교",
  "15. First-level spells (final stage)": "15. 1레벨 주문 (마지막 단계)",
  "Backgrounds, classes, foci, skills, equipment, arts, and spells are validated against frontend/data JSON files.": "배경·클래스·포커스·기술·장비·기교·주문은 등록된 규칙 데이터를 기준으로 확인합니다.",
  "Class selection uses two slots; only classes marked can_be_full_class may fill both slots.": "클래스는 두 칸에 선택합니다. 순수 클래스로 허용된 클래스만 양쪽에 같은 클래스를 고를 수 있습니다.",
  "Class pairing exclusions are checked in both directions using incompatible_classes and incompatible_archetypes.": "클래스와 원형의 조합 제한은 양쪽 클래스 모두를 기준으로 확인합니다.",
  "Starting arts are applied once per distinct class, using partial or full rules. Fixed grants, restricted choices, and additional picks are separate.": "시작 기교는 부분·순수 클래스 규칙에 따라 클래스별로 한 번씩 부여됩니다. 자동 습득·지정 목록·추가 선택은 별개입니다.",
  "Base hit dice, attack bonus, and focus count come from progression_tables.json; applicable encoded ability overrides determine effective hit dice before HP is calculated.": "기본 히트 주사위·공격 보너스·포커스 선택권은 클래스 성장 표를 따릅니다. 구현된 능력의 예외를 적용한 히트 주사위로 HP를 계산합니다.",
  "AC uses the highest eligible armor or focus base after encoded armor adjustments, then applies the usual shield rule and final DEX. Worn armor penalties remain. Legacy armor bonuses are ignored.": "해당되는 갑옷 보정을 적용하고, 갑옷과 포커스의 기본 AC 중 높은 값을 사용한 뒤 방패 규칙과 최종 민첩 수정치를 적용합니다. 착용 갑옷의 페널티는 유지하며, 이전 갑옷 보너스는 적용하지 않습니다.",
  "Base AC rules require a positive integer character level.": "기본 AC 계산에는 1 이상의 정수 캐릭터 레벨이 필요합니다.",
  "Starting equipment grants one fixed package or the sum of three saved d6 rolls multiplied by 10 silver, never both. Client-supplied grants and money totals are not authoritative.": "시작 장비는 고정 꾸러미 하나 또는 저장된 3d6 합계의 10배에 해당하는 은화 중 하나입니다. 장비와 자금 총액은 서버에서 다시 계산합니다.",
  "Catalogue purchases use 10 copper per silver and cannot exceed starting funds. Missing prices are not free items. Package grants cannot be sold for extra starting funds.": "구매는 10동화 = 1은화로 계산하며 시작 자금을 초과할 수 없습니다. 가격 미기재 장비는 무료가 아니며, 꾸러미 장비를 팔아 시작 자금을 늘릴 수 없습니다.",
  "Only owned equipment may be equipped. A held shield conflicts with an active two-handed weapon. Armor penalties affect Sneak/Exert checks, not learned skill levels.": "보유한 장비만 착용할 수 있습니다. 방패와 양손 무기를 동시에 사용할 수 없습니다. 갑옷의 페널티는 잠행·운동 판정에 적용되며 기술 레벨은 바꾸지 않습니다.",
  "Package row encumbrance already includes quantity. Catalogue purchase lots apply explicit groups of three or five; ambiguous footnotes remain flagged. These subtotals are not carried-load limits: storage, transport, and coin loads are not tracked.": "꾸러미 행별 하중은 수량을 포함합니다. 구매 장비에는 명시된 3개·5개 묶음 규칙을 적용하며 모호한 각주는 확인이 필요합니다. 보관·운송·동전 하중과 실제 운반 한도는 계산하지 않습니다.",
  "Equipment statistics and property descriptions are reference rules. Unencoded focus/art armor exceptions, attack rolls, damage modifiers, reloads, and situational effects require manual adjudication.": "장비 수치와 특성은 참고 규칙입니다. 미구현된 포커스·기교의 AC 예외, 명중 판정, 피해 보정, 재장전과 상황별 효과는 직접 적용하세요.",
  "Class skill bonuses apply once per distinct class. Skills start at -1 and cannot exceed level 1 at creation.": "클래스 기술 보너스는 클래스별로 한 번씩 적용합니다. 기술은 -1에서 시작하며 생성 시 1레벨을 넘을 수 없습니다.",
  "Named abilities resolve from one catalogue using class, exact class-pair, and eligible focus grants; descriptions do not automatically apply effects.": "능력은 클래스·클래스 조합·유효한 포커스 부여 규칙에 따라 통합 목록에서 가져옵니다. 설명에 적힌 효과가 모두 자동 적용되지는 않습니다.",
  "A third fixed skill allotment from a focus gives that skill 2 advancement points; other forced overflow requires manual review.": "포커스의 고정 부여로 같은 기술을 세 번째 받으면 성장 점수 2점을 얻습니다. 다른 강제 중복 부여는 별도 확인이 필요합니다.",
  "Only one origin family is allowed, including linked upgrades. Each instance or upgrade costs a pick; repeatable choices belong to specific instances.": "기원 포커스는 연결된 상위 레벨을 포함해 한 계열만 허용합니다. 각 선택과 레벨 향상은 선택권 하나를 사용하며, 반복 포커스의 선택은 개별 관리합니다.",
  "Positive focus save bonuses lower the displayed save target. Situational effects and crafting are recorded as play notes, not simulated.": "포커스의 양수 내성 보너스는 표시된 내성 목표값을 낮춥니다. 상황별 효과와 제작 규칙은 플레이 참고사항으로 표시하며 자동 처리하지 않습니다.",
  "This builder creates level-1 characters only. Each spellcasting class slot learns two first-level spells from its own allowed schools, with no duplicate spells.": "이 생성기는 1레벨 캐릭터 전용입니다. 주문 시전 클래스마다 허용된 학파에서 1레벨 주문 두 개를 배우며 주문은 중복 습득할 수 없습니다.",
  "Treat STR as 4 higher for encumbrance only; maximum System Strain is 2 higher. These adjustments do not change attribute scores or modifiers.": "하중을 계산할 때만 근력을 4 높게 취급하며, 최대 기관계 부담이 2 증가합니다. 능력치나 수정치 자체는 바뀌지 않습니다.",
  "See clearly regardless of illumination; require half normal food, water, and air.": "밝기에 관계없이 선명하게 볼 수 있으며 음식·물·공기는 일반적인 양의 절반만 필요합니다.",
  "Sunlight exposure to the eyes or a palm-sized area of skin requires a Physical save each round; failure adds 1 System Strain. Exceeding the maximum causes collapse and death in 1d6 minutes unless covered. Resolve exposure during play.": "눈이나 손바닥 크기 이상의 피부가 햇빛에 노출되면 매 라운드 육체 내성을 굴리고, 실패하면 기관계 부담 1점을 얻습니다. 최대치를 넘으면 쓰러지고, 노출 부위를 가리지 않으면 1d6분 후 사망합니다. 노출 여부는 플레이 중 판정하세요.",
  "Once per scene, double ground movement with an On Turn action. Once per week, automatically succeed on a Luck save with an Instant action. Track usage during play.": "장면마다 한 번 간단 행동으로 지상 이동속도를 두 배로 합니다. 일주일마다 한 번 즉시 행동으로 행운 내성에 자동 성공합니다. 사용 횟수는 플레이 중 기록하세요.",
  "Require half normal food and rest. Against mind-affecting effects only, take a -2 Mental saving-roll penalty (equivalent to raising the displayed Mental save target by 2). This is not a penalty to every Mental save.": "음식과 휴식은 일반적인 양의 절반만 필요합니다. 정신에 영향을 미치는 효과에 대한 정신 내성 굴림에만 -2 페널티를 받습니다(정신 내성 목표값을 2 높이는 것과 같음). 모든 정신 내성에 적용되는 페널티는 아닙니다.",
  "Take -1 on social checks unrelated to intimidation. The permanent +1 attack bonus is included separately from class base attack bonus on the sheet.": "협박과 무관한 사회적 판정에 -1을 받습니다. 상시 공격 보너스 +1은 클래스의 기본 공격 보너스와 구분해 시트에 반영합니다.",
  "See up to 30 feet in dim light, but not in complete darkness.": "희미한 빛에서도 30피트까지 볼 수 있지만, 완전한 어둠에서는 볼 수 없습니다.",
  "Optional linked adjustment: DEX modifier +1 and CON modifier -1.": "선택 가능한 연계 보정: 민첩 수정치 +1과 건강 수정치 -1을 함께 적용합니다.",
  "Immune to heat damage; smoke neither blocks vision nor interferes with breathing.": "열 피해에 면역이며, 연기는 시야나 호흡을 방해하지 않습니다.",
  "Breathe underwater, see underwater regardless of lighting with the 120-degree vision specified by the local description, and move at twice normal speed underwater.": "물속에서 호흡할 수 있고 밝기에 관계없이 볼 수 있습니다. 현재 설명에 명시된 120도 시야를 적용하며, 물속에서 일반 이동속도의 두 배로 움직입니다.",
  "Linked gravity adaptation: STR modifier +1 and DEX modifier -1.": "중력 적응 연계 보정: 근력 수정치 +1과 민첩 수정치 -1을 함께 적용합니다.",
  "Linked gravity adaptation: DEX modifier +1 and STR modifier -1.": "중력 적응 연계 보정: 민첩 수정치 +1과 근력 수정치 -1을 함께 적용합니다.",
  "Absorb radiation; require no food, sleep, or breathing, and see without a light source.": "방사선을 흡수하며, 음식·수면·호흡이 필요 없고 광원 없이도 볼 수 있습니다.",
  "Know recipes for common, uncomplicated alchemical work. Advanced recipes cannot yet be produced. Unless entirely cut off from equipment, scavenge or improvise a laboratory for lesser work. Recipe lists and crafting are resolved during play.": "흔하고 간단한 연금술 작업의 제조법을 알고 있지만, 고급 작업물은 아직 만들 수 없습니다. 설비와 완전히 단절된 상황이 아니라면 하급 작업에 필요한 실험기구를 구하거나 임시로 만들 수 있습니다. 제조법 목록과 제작은 플레이 중 처리하세요."
}

type MessagePattern = [RegExp, (...parts: string[]) => string]
const patterns: MessagePattern[] = [
  [/^(.+): invalid base AC rule in foci\.json\.$/, (name) => nameFor(name) + ': 기본 AC 규칙 데이터가 올바르지 않습니다.'],
  [/^(.+): invalid tradition rule configuration\.$/, (name) => nameFor(name) + ': 마법 전통 규칙 설정을 확인하세요.'],
  [/^(.+): a valid Invoker class selection is required\.$/, (name) => nameFor(name) + ': 소언사가 포함된 유효한 클래스 조합이 필요합니다.'],
  [/^(.+): choose one allowed magical tradition\.$/, (name) => nameFor(name) + ': 마법 전통 하나를 선택하세요.'],
  [/^(.+) must be an integer between 3 and 18\.$/, (id) => nameFor(id) + ': 3부터 18까지의 정수여야 합니다.'],
  [/^Class slot ([AB]): choose a known class\.$/, (slot) => (slot === 'A' ? '첫 번째' : '두 번째') + ' 클래스를 선택하세요.'],
  [/^(.+) is partial-only(?: and can occupy only one class slot\.|; choose a different second class\.)$/, (name) => nameFor(name) + ': 부분 클래스 전용입니다. 다른 클래스와 조합하세요.'],
  [/^(.+) cannot be paired with (.+) \((.+) archetype\)\.$/, (a, b, type) => nameFor(a) + ' / ' + nameFor(b) + ': 함께 선택할 수 없습니다 (' + nameFor(type) + ' 계열 제한).'],
  [/^(.+) cannot be paired with (.+)\.$/, (a, b) => nameFor(a) + ' / ' + nameFor(b) + ': 함께 선택할 수 없습니다.'],
  [/^(.+): starting arts not configured for this (full|partial) class\.$/, (name, mode) => nameFor(name) + '의 ' + nameFor(mode) + ' 클래스 시작 기교 규칙이 등록되지 않았습니다.'],
  [/^(.+): art catalogue is missing\.$/, (name) => nameFor(name) + '의 기교 목록이 없습니다.'],
  [/^(.+): unknown art reference .+\.$/, (name) => nameFor(name) + '의 시작 기교에 목록에 없는 기교가 포함되어 있습니다.'],
  [/^Restricted choice (\d+)$/, (n) => '지정 목록 ' + n],
  [/^Background pick (\d+)$/, (n) => '배경 기술 선택 ' + n],
  [/^Background roll (\d+)$/, (n) => '배경 주사위 ' + n],
  [/^Background pick (\d+) must be a learning-table skill, excluding Any Skill\.$/, (n) => '배경 선택 ' + n + ': 학습 표의 기술을 고르세요. 아무 기술 항목은 선택할 수 없습니다.'],
  [/^Background roll (\d+) does not match its allocated table\.$/, (n) => '배경 주사위 ' + n + '의 결과와 배정한 표가 일치하지 않습니다.'],
  [/^Background roll (\d+) must be between 1 and (\d+)\.$/, (n, max) => '배경 주사위 ' + n + '은(는) 1부터 ' + max + '까지여야 합니다.'],
  [/^Resolve background roll (\d+) using its allowed options\.$/, (n) => '배경 주사위 ' + n + '의 결과를 허용된 선택지에서 골라 적용하세요.'],
  [/^Background roll (\d+) has an invalid attribute increase\.$/, (n) => '배경 주사위 ' + n + '의 능력치 상승량이 올바르게 등록되지 않았습니다.'],
  [/^(.+) skill bonus \(bonus (\d+), choice (\d+)\)$/, (name, bonus, choice) => nameFor(name) + ' 보너스 기술 (보너스 ' + bonus + ', 선택 ' + choice + ')'],
  [/^(.+) bonus (\d+)$/, (name, n) => nameFor(name) + ' 보너스 ' + n],
  [/^(.+): unknown skill (.+)\.$/, (label) => ko(label) + ': 등록되지 않은 기술입니다. 다시 선택하세요.'],
  [/^(.+): (.+) already has two allotments\. Choose a different skill; starting skills cannot exceed level 1\.$/, (label, skill) => ko(label) + ': ' + nameFor(skill) + ': 이미 두 번 배정되었습니다. 시작 기술은 1레벨을 넘을 수 없으므로 다른 기술을 고르세요.'],
  [/^(.+): (.+) has allotment (\d+)\. This forced overflow is not defined in PROJECT_RULES\.md; manual review is required\. Level remains 1 and no extra advancement points are awarded\.$/, (label, skill, n) => ko(label) + ': ' + nameFor(skill) + '의 ' + n + '번째 강제 배정 규칙은 아직 정해지지 않았습니다. 직접 확인하세요. 레벨은 1로 유지되며 추가 성장 점수는 부여하지 않습니다.'],
  [/^(.+): choose a skill\.$/, (label) => ko(label) + ': 기술을 선택하세요.'],
  [/^minimum ([+-]?\d+)$/, (n) => '최소 ' + n],
  [/^maximum ([+-]?\d+)$/, (n) => '최대 ' + n],
  [/^(.+) requires exactly (\d+) choice\(s\)\.$/, (label, n) => ko(label) + ': 정확히 ' + n + '개를 선택하세요.'],
  [/^(.+): choose an allowed (skill|attribute) for choice (\d+)\.$/, (label, kind, n) => ko(label) + ': 선택 ' + n + '에서 허용된 ' + (kind === 'skill' ? '기술' : '능력치') + '를 고르세요.'],
  [/^(.+) (?:has an invalid|uses legacy|references an unknown|uses an unsupported) .+$/, (label) => ko(label) + ': 보너스 규칙 데이터가 올바르지 않거나 아직 지원하지 않는 형식입니다.'],
  [/^Unknown focus: .+\.$/, () => '등록되지 않은 포커스입니다. 해제한 뒤 다시 선택하세요.'],
  [/^Duplicate focus instance ID: .+\.$/, () => '저장된 포커스 선택이 중복되었습니다. 해당 항목을 다시 선택하세요.'],
  [/^(.+) cannot be selected more than once\.$/, (name) => nameFor(name) + ': 중복 선택할 수 없습니다.'],
  [/^(.+): only level-1 foci can be selected at character creation\.$/, (name) => nameFor(name) + ': 캐릭터 생성 시에는 1레벨 포커스만 선택할 수 있습니다.'],
  [/^(.+): select a valid parent focus instance for this upgrade\.$/, (name) => nameFor(name) + ': 먼저 연결할 하위 레벨 포커스를 선택하세요.'],
  [/^(.+): a focus instance can receive this upgrade only once\.$/, (name) => nameFor(name) + ': 같은 항목에 이 상위 레벨을 두 번 적용할 수 없습니다.'],
  [/^Focus requirements not met: (.+)\.$/, (name) => nameFor(name) + ': 포커스의 선행 조건을 충족하지 못했습니다.'],
  [/^Too many foci selected: (\d+)\/(\d+)\.$/, (used, max) => '포커스를 너무 많이 선택했습니다: ' + used + '/' + max + '개.'],
  [/^(.+): each instance must choose a different skill\.$/, (name) => nameFor(name) + ': 반복 선택한 항목마다 서로 다른 기술을 골라야 합니다.'],
  [/^(.+): choose one valid package\.$/, (name) => nameFor(name) + ': 유효한 특성 묶음 하나를 선택하세요.'],
  [/^(.+): choose an eligible attribute( or decline the optional increase)?\.$/, (name, optional) => nameFor(name) + ': 조건에 맞는 능력치를 선택하세요.' + (optional ? ' 증가를 포기할 수도 있습니다.' : '')],
  [/^(.+): choose the one attribute allowed above (\d+)\.$/, (name, n) => nameFor(name) + ': ' + n + '보다 높게 유지할 능력치 하나를 선택하세요.'],
  [/^(.+): no compatible focus allowance remaining\. Requires (.+)\.$/, (name, allowed) => nameFor(name) + ': 조건에 맞는 선택권이 남지 않았습니다. 필요: ' + allowed.replaceAll('Warrior (combat)', FOCUS_ALLOWANCE_LABELS.warrior).replaceAll('Expert (non-combat)', FOCUS_ALLOWANCE_LABELS.expert).replaceAll('Free (any focus)', FOCUS_ALLOWANCE_LABELS.free).replaceAll(' or ', ' 또는 ')],
  [/^Already learned in slot ([AB])\. A spell can only be learned once\.$/, (slot) => (slot === 'A' ? '첫 번째' : '두 번째') + ' 클래스에서 이미 배웠습니다. 같은 주문은 한 번만 배울 수 있습니다.'],
  [/^Spell slot ([AB])$/, (slot) => (slot === 'A' ? '첫 번째' : '두 번째') + ' 클래스 주문'],
  [/^(.+): choose exactly (\d+) first-level spells for this class\.$/, (label, n) => ko(label) + ': 1레벨 주문을 정확히 ' + n + '개 선택하세요.'],
  [/^(.+): (.+) is selected more than once across the class slots\.$/, (label, spell) => ko(label) + ': ' + nameFor(spell) + ' 주문이 중복 선택되었습니다.'],
  [/^(.+): only first-level spells can be learned\.$/, (label) => ko(label) + ': 1레벨 주문만 배울 수 있습니다.'],
  [/^(.+): (.+) is not available to this class\.$/, (label, school) => ko(label) + ': 이 클래스는 ' + ko(school) + ' 학파를 선택할 수 없습니다.'],
  [/^(.+): (?:provide a spell ID array|unknown or malformed spell ID)\.$/, (label) => ko(label) + ': 주문 선택 정보가 올바르지 않습니다. 다시 선택하세요.'],
  [/^Older spell selections were assigned to eligible class slots\. (?:(\d+) unavailable or excess selection\(s\) removed\. )?Review each slot's two first-level picks\.$/, (n) => '이전 주문 선택을 배울 수 있는 클래스에 배정했습니다. ' + (n ? '선택 불가 또는 개수 초과인 ' + n + '개를 해제했습니다. ' : '') + '클래스별로 1레벨 주문 두 개를 확인하세요.'],
  [/^(.+): choose exactly (\d+) art\(s\)\.$/, (label, n) => ko(label) + ': 기교를 정확히 ' + n + '개 선택하세요.'],
  [/^(.+): provide an array of art IDs\.$/, (label) => ko(label) + ': 기교 선택 정보가 올바르지 않습니다. 다시 선택하세요.'],
  [/^Art selections supplied for unselected or non-art class: (.+)\.$/, (id) => nameFor(id) + ': 선택하지 않았거나 기교가 없는 클래스에 기교가 배정되었습니다.'],
  [/^Unknown art choice group: .+\.$/, () => '등록되지 않은 기교 선택 그룹입니다. 다시 선택하세요.'],
  [/^Cannot purchase (.+): missing, ambiguous, unpriced, or invalid catalogue data\.$/, (name) => nameFor(name) + ': 가격이나 장비 정보가 없거나 올바르지 않아 구매할 수 없습니다.'],
  [/^Invalid purchase total for (.+)\.$/, (name) => nameFor(name) + ': 구매 합계가 올바르지 않습니다.'],
  [/^Unknown or invalid equipped (.+): .+\.$/, (kind) => '선택한 ' + nameFor(kind) + ' 정보가 올바르지 않습니다. 다시 선택하세요.'],
  [/^You do not own the equipped (.+): (.+)\.$/, (kind, name) => '보유하지 않은 ' + nameFor(kind) + '입니다: ' + nameFor(name)],
  [/^(?:Unknown or ambiguous starting equipment package|Invalid starting equipment package data): .+\.$/, () => '시작 꾸러미 데이터가 없거나 올바르지 않습니다. 다른 꾸러미를 선택하세요.'],
  [/^(.+): (?:invalid item count or row encumbrance in the package data|duplicate package item .+|missing, ambiguous, or invalid equipment definition .+|invalid listed encumbrance total)\.$/, (name) => nameFor(name) + ': 꾸러미의 장비·수량·하중 데이터에 오류가 있습니다.'],
  [/^No progression table found for selected class archetypes: .+\.$/, () => '선택한 클래스 조합의 성장 표가 아직 등록되지 않았습니다.'],
  [/^Ability reference must resolve to exactly one definition: .+\.$/, () => '부여할 능력의 정의가 누락되었거나 중복되었습니다.'],
  [/^(.+): (?:effects must be a list|unsupported or malformed ability effect|invalid override_hit_dice condition or dice expression)\.$/, (name) => nameFor(name) + ': 능력 효과 데이터가 올바르지 않습니다.'],
  [/^Conflicting hit-dice overrides: .+\. Resolve the ability data before completing the character\.$/, () => '히트 주사위 변경 효과가 서로 충돌합니다. 캐릭터를 완성하기 전에 능력 규칙 데이터를 확인해야 합니다.'],
  [/^Unknown ability-granting focus: .+\.$/, () => '능력을 부여하는 포커스를 찾을 수 없습니다.'],
  [/^(.+): ability_ids must be a list of nonempty ability IDs\.$/, (name) => nameFor(name) + ': 부여 능력 목록이 올바르지 않습니다.'],
  [/^Duplicate class ability combination: .+\.$/, () => '클래스 능력 규칙에 같은 조합이 중복 등록되어 있습니다.'],
  [/^(.+): invalid (?:extra focus allowance|score effect|derived bonus|conditional saves) in foci\.json\.$/, (name) => nameFor(name) + ': 포커스 효과 데이터가 올바르지 않습니다.'],
  [/^(.+): invalid focus grants in arts data\.$/, (name) => nameFor(name) + ': 기교의 포커스 부여 데이터가 올바르지 않습니다.'],
  [/^(.+): grants must reference an existing level-1 focus\.$/, (name) => nameFor(name) + ': 부여 목록에는 등록된 1레벨 포커스만 지정할 수 있습니다.'],
  [/^(.+): the granted focus does not meet class requirements\.$/, (name) => nameFor(name) + ': 부여할 포커스의 클래스 조건을 충족하지 못했습니다.'],
  [/^Specialist \((.+)\): roll 3d6 and discard the lowest die on checks using this skill\. Resolve dice during play\.$/, (skill) => '특성화 인재 (' + nameFor(skill) + '): 이 기술 판정은 3d6을 굴리고 가장 낮은 주사위를 버립니다. 플레이 중 적용하세요.'],
  [/^Specialist Level 2 \((.+)\): roll 4d6 and discard the lowest die, following the current local description\. Resolve dice during play\.$/, (skill) => '특성화 인재 2레벨 (' + nameFor(skill) + '): 현재 설명에 따라 4d6을 굴리고 가장 낮은 주사위를 버립니다. 플레이 중 적용하세요.'],
]

// Translate at the display boundary so validation and saved drafts keep their original contracts.
export function ko(message: string): string {
  if (!message) return ''
  const exact = messages[message]
  if (exact) return exact
  for (const [pattern, format] of patterns) {
    const match = pattern.exec(message)
    if (match) return format(...match.slice(1))
  }
  if (/^(minimum|maximum) /.test(message) && message.includes(', ')) return message.split(', ').map(ko).join(', ')
  if (message.includes(': invalid score redistribution;')) return message.split(': ')[0] + ': 능력치 재분배를 확인하세요. 선택한 낮은 능력치는 9로 올리고, 제공하는 능력치는 9 이상으로 유지하며 총점을 보존해야 합니다.'
  const scoreDie = /^(.+): roll and save a valid d(\d+) score die\.$/.exec(message)
  if (scoreDie) return `${nameFor(scoreDie[1])}: 능력치용 d${scoreDie[2]} 주사위를 굴려 결과를 저장하세요.`
  const separator = message.indexOf(': ')
  if (separator > 0) {
    const label = message.slice(0, separator)
    return (names.has(label.toLowerCase()) ? nameFor(label) : ko(label)) + ': ' + ko(message.slice(separator + 2))
  }
  if (names.has(message.toLowerCase())) return nameFor(message)
  if (/[가-힣]/.test(message)) return rulesText(message)
  return '선택 조건이나 규칙 데이터를 확인해 주세요. 이 항목은 자동으로 처리할 수 없습니다.'
}
