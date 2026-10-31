import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let server
let CharacterSheet
let makeProps
let cases

before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  ;({ CharacterSheet } = await server.ssrLoadModule('/src/CharacterSheet.tsx'))
  const { evaluateCharacter, readCharacterData } = await server.ssrLoadModule('../backend/src/character.ts')
  const { baseDraft, characterDraftCases } = await server.ssrLoadModule('../backend/src/fixtures/characterDrafts.ts')
  const { evaluatePreviewCore } = await server.ssrLoadModule('/src/characterPreview.ts')
  const { allocatedAttributes, restoreAttributeAllocation } = await server.ssrLoadModule('/src/attributeAllocation.ts')
  const { evaluateCreationEffects } = await server.ssrLoadModule('../shared/characterCreation.ts')
  const { evaluateClassChoices } = await server.ssrLoadModule('../shared/classSelection.ts')
  const { classBuildName } = await server.ssrLoadModule('../shared/classBuild.ts')
  const { evaluateArtChoices } = await server.ssrLoadModule('../shared/artSelection.ts')
  const data = readCharacterData()
  cases = new Map(characterDraftCases())
  makeProps = (source = baseDraft()) => {
    const character = { ...source, ...restoreAttributeAllocation(source) }
    const core = evaluatePreviewCore(character, data)
    const effects = evaluateCreationEffects(character, data, core, evaluateClassChoices(character.classChoices, data.CLASSES))
    return {
      character, catalogues: data, evaluation: evaluateCharacter(character),
      evaluationCurrent: true, backendOnline: true, evaluationError: '',
      allocatedScores: allocatedAttributes(character),
      resolvedClassBuild: classBuildName(character.classChoices, data.CLASSES, data.COMBINATIONS),
      displayedArmorClass: effects.equipmentInventory.armorClass, displayedSaves: effects.savingThrows,
      abilitySelection: effects.abilitySelection, equipmentInventory: effects.equipmentInventory,
      skillAllocation: core.skillAllocation, focusCreation: core.focusCreation,
      allFocusInstances: [...core.focusCreation.instances, ...core.focusCreation.grantedInstances],
      focusEffort: effects.focusEffort,
      artEvaluation: evaluateArtChoices(character.artChoicesByClass, character.classChoices,
        data.CLASSES, data.STARTING_ARTS, data.ARTS, effects.focusTraditions, core.focusCreation.applied),
    }
  }
})

after(async () => { await server?.close() })

const render = (props) => renderToStaticMarkup(createElement(CharacterSheet, props))
const withoutStatIcons = (html) => html.replace(/<span class="material-symbols-outlined sheet-stat-icon" aria-hidden="true">[^<]+<\/span>/g, '')
const vitals = (html) => withoutStatIcons(html).match(/<div class="sheet-vitals"[\s\S]*?<details/)[0]

test('sheet preserves its anchor, level, bilingual classes, skill icons and rule links', () => {
  const props = makeProps()
  const html = render(props)
  assert.match(html, /id="character-sheet" aria-labelledby="character-sheet-title" tabindex="-1"/)
  assert.match(html, /레벨 1/)
  assert.match(html, /Warrior \/ Expert/)
  assert.match(html, /data-skill-id="administer"/)
  assert.match(html, /aria-hidden="true">account_balance/)
  assert.match(html, /href="#rules-skills"/)
  assert.match(html, /<details class="sheet-disclosure" open="">/)
})

test('sheet displays supplied combat results without recalculating them from choices', () => {
  const props = structuredClone(makeProps())
  props.evaluation.derived.hitPoints = 123
  props.evaluation.derived.attackBonus = 42
  props.displayedArmorClass.value = 77
  props.displayedSaves.targets.mental = 88
  const html = render(props)
  assert.match(vitals(html), /<span>HP<\/span><strong>123<\/strong>/)
  assert.match(vitals(html), /<span>AC<\/span><strong>77<\/strong>/)
  assert.match(vitals(html), /<span>공격 보너스<\/span><strong>\+42<\/strong>/)
  assert.match(withoutStatIcons(html), /정신 내성 목표값<\/span><strong>88<\/strong>/)
})

test('pending and offline states retain the existing placeholders and local AC fallback', () => {
  const props = makeProps()
  for (const offline of [false, true]) {
    const html = render({ ...props, evaluationCurrent: false, backendOnline: !offline,
      evaluationError: offline ? 'Offline' : '' })
    assert.ok(html.includes(`class="sheet-status">${offline ? '연결 필요' : '계산 중'}`))
    assert.match(vitals(html), /<span>HP<\/span><strong>--<\/strong>/)
    assert.match(vitals(html), /<span>공격 보너스<\/span><strong>--<\/strong>/)
    assert.ok(vitals(html).includes(`<span>AC</span><strong>${props.displayedArmorClass.value}</strong>`))
    assert.ok(html.includes(`aria-busy="${!offline}"`))
  }
})

test('completion requires both valid evaluation and every completed stage', () => {
  const props = makeProps()
  const evaluation = { ...props.evaluation, valid: true, stepStatus: [{ key: 'test', complete: true }] }
  assert.match(render({ ...props, evaluation }), /sheet-status is-complete">생성 완료/)
  assert.match(render({ ...props, evaluation: { ...evaluation, valid: false } }), /sheet-status">작성 중/)
  assert.match(render({ ...props, evaluation: { ...evaluation, stepStatus: [{ key: 'test', complete: false }] } }), /sheet-status">작성 중/)
})

test('focus modifier caps and automatic focus grants remain visible', () => {
  const caps = render(makeProps(cases.get('modifier-cap')))
  assert.match(caps, /한계 -2 ~ \+3/)
  const grants = render(makeProps(cases.get('free-focus-refund')))
  assert.match(grants, /자동 습득/)
  assert.match(grants, /무화자/)
})

test('rendering does not mutate character choices, catalogues or evaluated results', () => {
  const props = makeProps(cases.get('tradition-full-elem'))
  const original = structuredClone(props)
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze)
      Object.freeze(value)
    }
  }
  freeze(props)
  assert.equal(render(props), render(props))
  assert.deepEqual(props, original)
})

 test('Kitsune Sparks and its focus source appear on the sheet and disappear on removal', () => {
  const source = { ...makeProps().character, classChoices: ['warrior', 'expert'], focusInstances: [{ instanceId: 'kitsune', focusId: 'kitsune_beastfolk1' }], artChoicesByClass: {} }
  const props = makeProps(source)
  const html = render(props)
  assert.match(html, /<h4>원소 촉발<\/h4>[\s\S]*?자동 습득/)
  assert.match(html, /Elemental Sparks/)
  assert.match(html, /키츠네 수인.*로 기교 부여/)
  assert.doesNotMatch(render(makeProps({ ...source, focusInstances: [] })), /Elemental Sparks/)
})

test('gnome skill changes and removal appear in sheet skill levels', () => {
  const base = makeProps().character
  const source = { ...base, focusInstances: [{ instanceId: 'gnome', focusId: 'gnomes1' }] }
  for (const skill of ['sneak', 'craft']) {
    const props = makeProps({ ...source, focusBonusChoices: { gnome: { 0: [skill], 2: ['STR'] } } })
    const html = render(props)
    const sneakRow = html.match(/<tr[^>]*data-skill-id="sneak"[\s\S]*?<\/tr>/)?.[0]
    const craftRow = html.match(/<tr[^>]*data-skill-id="craft"[\s\S]*?<\/tr>/)?.[0]
    assert.ok(sneakRow)
    assert.ok(craftRow)
    assert.equal(props.skillAllocation.states.sneak.allotments, skill === 'sneak' ? 1 : 0)
    assert.equal(props.skillAllocation.states.craft.allotments, skill === 'craft' ? 2 : 1)
    assert.match(sneakRow, new RegExp('>' + (skill === 'sneak' ? '0' : '-1') + '<'))
    assert.match(craftRow, new RegExp('>' + (skill === 'craft' ? '1' : '0') + '<'))
  }
  const removed = makeProps({ ...source, focusInstances: [], focusBonusChoices: { gnome: { 0: ['craft'] } } })
  assert.equal(removed.skillAllocation.states.craft.allotments, 1)
  assert.doesNotMatch(render(removed), /lang="en">Gnomes/)
})

test('Lizardmen AC shows the winning source and calculation for armor, shields and offline previews', () => {
  const source = { ...makeProps().character, focusInstances: [{ instanceId: 'lizard', focusId: 'lizardmen1' }],
    focusBonusChoices: { lizard: { 2: ['STR'], 3: ['DEX'] } } }
  for (const armorId of ['', 'partial_armor']) {
    const props = makeProps({ ...source, equipmentLoadout: { armorId, shieldId: 'large_shield', weaponId: 'short_sword' } })
    for (const offline of [false, true]) {
      const html = render({ ...props, evaluationCurrent: !offline, backendOnline: !offline, evaluationError: offline ? 'Offline' : '' })
      const calculation = html.match(/<p aria-label="AC 계산 내역">([\s\S]*?)<\/p>/)?.[1].replace(/\s+/g, ' ')
      assert.ok(calculation)
      assert.match(calculation, new RegExp('기본 AC ' + (armorId ? 15 : 14)))
      assert.match(calculation, new RegExp('방패 \\+' + (armorId ? 1 : 0) + ' · 민첩 -1 = AC ' + (armorId ? 15 : 13)))
      if (armorId) {
        assert.match(calculation, /14 \+ 리자드맨 1/)
        assert.match(vitals(html), /리자드맨.*\+1/)
      } else {
        assert.match(calculation, /큰 방패/)
        assert.doesNotMatch(calculation, /리자드맨 1/)
      }
    }
  }
  const natural = render(makeProps({ ...source, equipmentLoadout: { armorId: '', shieldId: '', weaponId: '' } }))
  assert.match(natural, /기본 AC 13 \(리자드맨\)/)
  const removed = render(makeProps({ ...source, focusInstances: [], equipmentLoadout: { armorId: 'partial_armor', shieldId: 'large_shield', weaponId: '' } }))
  assert.doesNotMatch(removed, /리자드맨/)
  assert.match(removed, /민첩 \+0 = AC 15/)
})


test('Dwarves HP shows its source and calculation, then removes the bonus with the focus', () => {
  const source = { ...makeProps().character, focusInstances: [{ instanceId: 'dwarf', focusId: 'dwarves_21' }] }
  const props = makeProps(source)
  const html = render(props)
  assert.match(vitals(html), /HP<\/span><strong>9<\/strong>/)
  assert.match(html, /HD 최댓값 8 · 건강 \+0 · 포커스 \+1 = HP 9/)
  assert.match(html, /드워프 · 다른 아인 · 최대 HP \+1/)
  const removed = render(makeProps({ ...source, focusInstances: [] }))
  assert.match(vitals(removed), /HP<\/span><strong>8<\/strong>/)
  assert.doesNotMatch(removed, /드워프 · 다른 아인 · 최대 HP/)
  const pending = render({ ...props, evaluationCurrent: false })
  assert.doesNotMatch(pending, /aria-label="HP 계산 내역"/)
  assert.match(vitals(pending), /HP<\/span><strong>--<\/strong>/)
})


test('Self-Carved shows changed CON, HP, Strain adjustment and the confirmed play conditions', () => {
  const source = { ...makeProps().character, focusInstances: [{ instanceId: 'self', focusId: 'focus_0421' }] }
  const props = makeProps(source)
  assert.equal(props.evaluation.attributes.CON, 14)
  assert.equal(props.evaluation.modifiers.CON, 1)
  assert.equal(props.displayedSaves.targets.physical, 14)
  const html = render(props)
  assert.match(html, /건강: 11 → 14/)
  assert.match(vitals(html), /HP<\/span><strong>9<\/strong>/)
  assert.match(html, /최대 기관계 부담 보정: \+2/)
  assert.match(html, /최대치와 같을 때가 아니라 최대치를 초과했을 때 사망/)
  assert.match(html, /명중 판정과 기술 판정 전체를 각각 두 번/)
  assert.match(html, /회복 조건: 기관계 부담·분발·HP·주문/)
  const removed = render(makeProps({ ...source, focusInstances: [] }))
  assert.doesNotMatch(removed, /건강: 11 → 14|최대 기관계 부담 보정: \+2|회복 조건:/)
})


test('Functionary sheet identifies the free Specialist source and its bound skill without a second allotment', () => {
  const source = { ...makeProps().character, focusInstances: [{ instanceId: 'functionary', focusId: 'functionary1' }],
    focusBonusChoices: { functionary: { 0: ['perform'], 1: ['DEX'] } } }
  const props = makeProps(source)
  const html = render(props)
  assert.equal(props.skillAllocation.states.perform.allotments, 1)
  assert.equal(props.allFocusInstances.length, 2)
  assert.match(html, /자동 습득 \(기능성 포병종 → 공연\)/)
  assert.match(html, /연결 기술: 공연 · 기술 배분은 부여한 포커스에서 총 1회/)
  assert.match(html, /3d6/)
  const removed = render(makeProps({ ...source, focusInstances: [] }))
  assert.doesNotMatch(removed, /연결 기술: 공연|자동 습득 \(기능성 포병종/)
})

test('App restores Functionary drafts with the duplicate paid Specialist refunded and other skills selectable', async () => {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const saved = { ...makeProps().character,
    focusInstances: [{ instanceId: 'paid', focusId: 'specialist1' }, { instanceId: 'functionary', focusId: 'functionary1' }],
    focusBonusChoices: { paid: { 0: ['craft'] }, functionary: { 0: ['craft'], 1: ['DEX'] } } }
  const previous = globalThis.localStorage
  globalThis.localStorage = { getItem: () => JSON.stringify(saved) }
  try {
    const html = renderToStaticMarkup(createElement(App))
    assert.match(html, /포커스 선택권 \(1\/3\)/)
    assert.match(html, /자동 습득 1개/)
    assert.match(html, /연결 기술: 제작/)
    assert.doesNotMatch(html, /특기자 \(2번째\)/)
    saved.focusBonusChoices.functionary[0] = ['']
    const pending = renderToStaticMarkup(createElement(App))
    const choices = pending.match(/<select[^>]*aria-label="기능성 포병종 1레벨: 추가로 배울 기술, 선택 1"[\s\S]*?<\/select>/)?.[0]
    assert.ok(choices)
    assert.match(choices, /<option value="craft">/)

  } finally {
    if (previous === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previous
  }
})


test('Chattel sheet shows replaced STR, CON-derived HP and social note', () => {
  const source = { ...makeProps().character, focusInstances: [{ instanceId: 'chattel', focusId: 'chattel1' }],
    focusRuleChoices: { chattel: { scoreDie: 1 } }, focusBonusChoices: { chattel: { 0: ['perform'], 1: ['CON'] } } }
  const props = makeProps(source)
  const html = render(props)
  assert.match(html, /근력: 14 → 3/)
  assert.equal(props.evaluation.derived.focusAttackBonus, -2)
  assert.match(vitals(html), /HP<\/span><strong>9<\/strong>/)
  assert.match(html, /모든 사회적 판정에 \+1 보너스/)
  const removed = render(makeProps({ ...source, focusInstances: [] }))
  assert.doesNotMatch(removed, /근력: 14 → 3|모든 사회적 판정에 \+1 보너스/)
})

test('App restores Chattel dice without rerolling and requires a roll for old drafts', async () => {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const saved = { ...makeProps().character, focusInstances: [{ instanceId: 'chattel', focusId: 'chattel1' }],
    focusRuleChoices: { chattel: { scoreDie: 4 } }, focusBonusChoices: { chattel: { 0: ['perform'], 1: ['CHA'] } } }
  const previous = globalThis.localStorage
  const random = Math.random
  globalThis.localStorage = { getItem: () => JSON.stringify(saved) }
  Math.random = () => { throw new Error('Rendering must not roll dice') }
  try {
    const html = renderToStaticMarkup(createElement(App))
    assert.match(html, /근력 저장된 굴림: 1d4 = 4, \+2 → 6/)
    assert.doesNotMatch(html, />근력 1d4\+2 굴리기<\/button>/)
    saved.focusRuleChoices = {}
    const pending = renderToStaticMarkup(createElement(App))
    assert.match(pending, />근력 1d4\+2 굴리기<\/button>/)
    assert.doesNotMatch(pending, /근력 저장된 굴림/)
  } finally {
    Math.random = random
    if (previous === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previous
  }
})


test('Elves sheet displays redistribution and play notes and restores scores on removal', () => {
  const source = { ...makeProps().character, focusInstances: [{ instanceId: 'elf', focusId: 'elves1' }],
    focusRuleChoices: { elf: { scoreTransfers: { STR: -2, CHA: 2 } } }, focusBonusChoices: { elf: { 0: ['perform'] } } }
  const html = render(makeProps(source))
  assert.match(html, /근력: 14 → 12/)
  assert.match(html, /매력: 7 → 9/)
  assert.match(html, /하루에 한 번 실패한 기술 판정/)
  assert.match(html, /완전한 어둠이 아닌 이상/)
  assert.doesNotMatch(render(makeProps({ ...source, focusInstances: [] })), /근력: 14 → 12|매력: 7 → 9/)
})

test('App restores Elves transfer controls and flags stale redistribution without silently discarding it', async () => {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const saved = { ...makeProps().character, focusInstances: [{ instanceId: 'elf', focusId: 'elves1' }],
    focusRuleChoices: { elf: { scoreTransfers: { STR: -2, CHA: 2 } } }, focusBonusChoices: { elf: { 0: ['perform'] } } }
  const previous = globalThis.localStorage
  globalThis.localStorage = { getItem: () => JSON.stringify(saved) }
  try {
    const html = renderToStaticMarkup(createElement(App))
    assert.match(html, /엘프 능력치 재분배/)
    assert.match(html, /총점이 보존됩니다/)
    assert.match(html, /value="-2" selected=""/)
    saved.focusRuleChoices.elf.scoreTransfers = { STR: -2, CHA: 1 }
    const invalid = renderToStaticMarkup(createElement(App))
    assert.match(invalid, /재분배를 완성하세요/)
    assert.match(invalid, /유효하지 않은 배분/)
    assert.doesNotMatch(invalid, /근력: 14 → 12/)
  } finally {
    if (previous === undefined) delete globalThis.localStorage
    else globalThis.localStorage = previous
  }
})


test('Vowed sheet shows Martial Style HD provenance and Unarmored Defense AC', () => {
  const source = { ...makeProps().character, classChoices: ['vowed', 'healer'],
    artChoicesByClass: { vowed: { groups: {}, chosen: ['faultless_awareness'] } } }
  const html = render(makeProps(source))
  assert.match(html, /1d6-1 → 1d6: 무예/)
  assert.match(html, /기본 AC 13 \(맨몸 방어술\)/)
  const shielded = render(makeProps({ ...source, equipmentLoadout: { armorId: '', shieldId: 'large_shield', weaponId: '' } }))
  assert.doesNotMatch(shielded, /기본 AC 13 \(맨몸 방어술\)/)
  const removed = render(makeProps({ ...source, classChoices: ['high', 'healer'], artChoicesByClass: {} }))
  assert.doesNotMatch(removed, /1d6-1 → 1d6: 무예|기본 AC 13 \(맨몸 방어술\)/)
})


test('spell and art pickers share locked/selected/granted states and keep removal enabled at the limit', async () => {
  const { SpellPicker } = await server.ssrLoadModule('/src/SpellPicker.tsx')
  const { ArtPicker } = await server.ssrLoadModule('/src/ArtPicker.tsx')
  const props = makeProps()
  const spells = props.catalogues.SPELLS.filter((spell) => spell.category === '고마법' && spell.level === '1레벨').slice(0, 3)
  assert.equal(spells.length, 3)
  const spellHtml = renderToStaticMarkup(createElement(SpellPicker, { classIds: ['high', 'expert'], classes: props.catalogues.CLASSES,
    spells, choices: [[spells[0].id, spells[1].id], []], notice: '', onToggle() {} }))
  assert.match(spellHtml, /selection-status is-selected/)
  assert.match(spellHtml, /selection-status is-locked/)
  assert.match(spellHtml, /spell-option is-unavailable/)
  assert.equal((spellHtml.match(/>주문 해제<\/button>/g) || []).length, 2)
  assert.doesNotMatch(spellHtml, /disabled=""[^>]*>주문 해제/)
  assert.doesNotMatch(spellHtml, /이 클래스의 주문 두 개를 모두 골랐습니다/)
  const arts = ['fixed', 'picked', 'other'].map((id) => ({ id, class_id: 'demo', name: id, eng_name: id, description: '' }))
  const plan = { classId: 'demo', name: 'Demo', mode: 'partial', fixed: ['fixed'], choose: 1, groups: [], options: arts, issues: [], configured: true }
  const artHtml = renderToStaticMarkup(createElement(ArtPicker, { plans: [plan], choices: { demo: { groups: {}, chosen: ['picked'] } }, notice: '', onToggle() {} }))
  assert.match(artHtml, /selection-status is-granted/)
  assert.match(artHtml, /selection-status is-selected/)
  assert.match(artHtml, /selection-status is-locked/)
  assert.doesNotMatch(artHtml, /disabled=""[^>]*>기교 해제/)
  assert.equal((artHtml.match(/>기교 해제<\/button>/g) || []).length, 1)
  assert.doesNotMatch(artHtml, /이 항목의 기교를 모두 골랐습니다/)
})
