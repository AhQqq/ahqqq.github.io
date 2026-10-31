import { ko, nameFor, rulesText, FOCUS_ALLOWANCE_LABELS } from './korean'
import { saveModifierLabel } from './SaveSummary'
import { SelectionStatus, selectionReason } from './SelectionStatus'
import { validConditionalSaves, validSaveModifiers } from '../../shared/savingThrows'
import { useDeferredValue, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { buildFocusFamilies, dependentFocusIds, focusGrantLabel, focusInstanceLockReasons, requirementLabel } from './focusSelection'
import type { FocusBonus, FocusClass, FocusOption } from './focusSelection'
import { focusCreationLevelReason, modifierLimitText } from '../../shared/focusBonuses'
import { abilityById } from '../../shared/abilities'
import type { AbilityDefinition } from '../../shared/abilities'
import type { FocusInstance } from '../../shared/focusCreation'
import type { FocusGrant } from '../../shared/artFocusGrants'
import { compatibleFocusAllowances } from '../../shared/focusAllowances'
import type { FocusAllowance } from '../../shared/focusAllowances'

type NamedOption = { id: string; name: string; tags: string[] }
type Props = {
  foci: FocusOption[]
  classes: FocusClass[]
  selectedClasses: FocusClass[]
  selectedIds: string[]
  instances: FocusInstance[]
  grants?: FocusGrant[]
  budget: FocusAllowance[]
  limit: number
  skills: NamedOption[]
  attributes: NamedOption[]
  abilities: AbilityDefinition[]
  onToggle: (id: string) => void
}

const focusName = (focus: FocusOption) => focus.name
const signed = (value: number) => value >= 0 ? `+${value}` : String(value)

function containDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return
  const targets = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]')
  const first = targets[0]
  const last = targets[targets.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

function bonusDescription(bonus: FocusBonus, skills: NamedOption[], attributes: NamedOption[]) {
  const isSkill = bonus.action === 'fixed_skill' || bonus.action === 'choice_skill'
  const catalog = isSkill ? skills : attributes
  const label = (id: string) => catalog.find((item) => item.id === id)?.name ?? nameFor(id)
  const limits = modifierLimitText(bonus)
  const suffix = limits ? `; 수정치 한계: ${ko(limits)} (수정치 자체를 추가로 높이지 않음)` : ''
  if (bonus.action === 'fixed_skill') return `기술 배정: ${label(bonus.id ?? '?')} ${bonus.count ?? 1}회`
  if (bonus.action === 'attribute_modifier') return `${label(bonus.id ?? '?')} ${bonus.value === undefined ? '한계만 변경' : `수정치 ${signed(bonus.value)}`}${suffix}`
  if (bonus.action === 'choice_skill' || bonus.action === 'choice_attribute_modifier') {
    const options = catalog.filter((item) =>
      (!bonus.ids || bonus.ids.includes(item.id)) &&
      (!bonus.filter?.ids || bonus.filter.ids.includes(item.id)) &&
      (!bonus.filter?.tags?.length || bonus.filter.tags.some((tag) => item.tags.includes(tag))) &&
      !bonus.exclude?.ids?.includes(item.id) &&
      !bonus.exclude?.tags?.some((tag) => item.tags.includes(tag)))
    return `${isSkill ? '기술' : `능력치 (${bonus.value === undefined ? '한계만 변경' : `수정치 ${signed(bonus.value)}`}${suffix})`} ${bonus.count ?? 1}개를 중복 없이 선택: ${options.map((item) => label(item.id)).join(', ') || '등록된 선택지 없음'}`
  }
  return '자동 적용되지 않는 효과입니다. 규칙을 직접 확인하세요.'
}

function LevelAction({ focus, context, location }: { focus: FocusOption; context: Props; location: string }) {
  const { selectedIds, instances, budget, foci, selectedClasses, classes, onToggle, grants = [] } = context
  const grant = grants.find((item) => item.focusId === focus.id && !focus.repeatable)
  const selected = selectedIds.includes(focus.id)
  const reasons = focusInstanceLockReasons(focus, instances, foci, selectedClasses, classes, budget, grants)
  const repeatRoot = focus.repeatable && focus.level === 1
  const levelReason = focusCreationLevelReason(focus)
  const dependents = selected ? dependentFocusIds(focus.id, selectedIds, foci) : []
  const noteId = `${location}-${focus.id}-status`
  const label = grant ? `${focus.level}레벨 자동 습득` : repeatRoot && selected ? '1레벨 하나 더 선택' : selected ? `${focus.level}레벨${dependents.length ? ' 및 상위 레벨' : ''} 해제` : `${focus.level}레벨 ${levelReason ? '선택 불가' : '선택'}`
  if (grant) return null
  return (
    <div className="focus-level-action">
      {location !== 'card' && reasons.length > 0 && (!selected || repeatRoot) && <SelectionStatus state="locked" name={`${focus.name} ${focus.level}레벨`} detail={reasons.map(selectionReason).join('\n')} />}
      <button type="button" className={selected || grant ? 'focus-level-button selected' : 'focus-level-button'}
        disabled={Boolean(grant) || ((!selected || repeatRoot) && reasons.length > 0)} aria-pressed={selected || Boolean(grant)}
        aria-describedby={noteId} onClick={() => onToggle(focus.id)}>
        {label}
      </button>
      <span id={noteId} className="sr-only">
        {levelReason ? `${ko(levelReason)}${selected ? ' 저장된 선택을 해제하세요.' : ''}` : reasons.length && (!selected || repeatRoot) ? `선택 불가: ${reasons.map(ko).join(' ')}` : selected ? repeatRoot ? '반복 선택 가능. 추가로 선택할 때마다 선택권 하나를 사용합니다.' : '선택됨' : '선택 가능: 포커스 선택권 하나를 사용합니다.'}
        {dependents.length > 0 && <span className="focus-removal-warning">해제 시 다음 포커스도 함께 해제됩니다: {dependents.map((id) => {
          const dependent = foci.find((item) => item.id === id)!
          return `${focusName(dependent)} ${dependent.level}레벨`
        }).join(', ')} (관련 보너스와 선택 포함).</span>}
      </span>
    </div>
  )
}

export function FocusPicker(props: Props) {
  const { foci, classes, selectedClasses, selectedIds, instances, budget, limit, skills, attributes, grants = [] } = props
  const learnedIds = [...selectedIds, ...grants.map((grant) => grant.focusId)]
  const [openFamilyId, setOpenFamilyId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)
  const deferredSearch = useDeferredValue(search)
  const needle = deferredSearch.trim().toLocaleLowerCase()
  const families = buildFocusFamilies(foci).sort((a, b) => Number(b.category === '기본') - Number(a.category === '기본'))
  const categories = [...new Set(families.map((family) => family.category))]
  const matching = families.filter((family) =>
    (categoryFilter === 'all' || family.category === categoryFilter) &&
    (!selectedOnly || family.levels.some((focus) => learnedIds.includes(focus.id))) &&
    family.levels.some((focus) => [focus.name, focus.englishName, focus.desc, focus.effect]
      .some((text) => (text ?? '').toLocaleLowerCase().includes(needle))))
  const visible = matching.slice(0, visibleCount)
  const groups = new Map<string, typeof families>()
  for (const family of visible) {
    const group = groups.get(family.category) ?? []
    group.push(family)
    groups.set(family.category, group)
  }
  const activeFamily = families.find((family) => family.id === openFamilyId)
  const activeFocus = activeFamily?.levels[0]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!openFamilyId || !dialog) return
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [openFamilyId])

  return (
    <>
      <div className="focus-library-toolbar">
        <div className="focus-library-heading">
          <div><p className="subheading">포커스 도감</p><h3>어떤 재능을 지녔나요?</h3></div>
          <p className="focus-budget" role="status"><strong>{selectedIds.length}<small> / {limit}</small></strong><span>선택권 사용</span></p>
        </div>
        <div className="catalogue-search" role="search" aria-label="포커스 찾기">
          <label><span>이름이나 효과 검색</span>
            <input type="search" value={search} placeholder="예: 특성화, 전투, Specialist"
              onChange={(event) => { setSearch(event.target.value); setVisibleCount(6) }} />
          </label>
          <label><span>포커스 분류</span>
            <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setVisibleCount(6) }}>
              <option value="all">전체 분류</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        </div>
        <div className="catalogue-toolbar-bottom">
          <button type="button" className="filter-toggle" aria-pressed={selectedOnly}
            onClick={() => { setSelectedOnly(!selectedOnly); setVisibleCount(6) }}>선택한 포커스만</button>
          <span className="support-text" role="status" aria-live="polite">
            {search !== deferredSearch ? '검색 중' : matching.length + '종 중 ' + visible.length + '종 표시'}
          </span>
          {(search || categoryFilter !== 'all' || selectedOnly) && <button type="button" className="text-button"
            onClick={() => { setSearch(''); setCategoryFilter('all'); setSelectedOnly(false); setVisibleCount(6) }} title="필터 초기화" aria-label="필터 초기화"><span className="material-symbols-outlined ui-icon" aria-hidden="true">filter_alt_off</span></button>}
        </div>
        <p className="support-text">선택 불가 항목도 설명을 읽을 수 있습니다.</p>
      </div>
      {!matching.length && <div className="catalogue-empty" role="status">
        <strong>{selectedOnly ? '조건에 맞는 선택한 포커스가 없습니다.' : '검색 결과가 없습니다.'}</strong>
        <p>다른 검색어를 입력하거나 분류와 필터를 바꿔 보세요.</p>
      </div>}
      <div className="focus-categories" aria-busy={search !== deferredSearch}>
        {[...groups].map(([category, group]) => (
          <section key={category} className="focus-category" aria-label={`포커스 분류: ${category}`}>
            <div className="focus-category-header"><h3>{category}</h3><span>{group.length}종 표시</span></div>
            <div className="focus-grid">
              {group.map((family) => {
                const first = family.levels[0]!
                const selectedLevels = family.levels.filter((focus) => learnedIds.includes(focus.id))
                const autoGranted = family.levels.some((focus) => grants.some((grant) => grant.focusId === focus.id))
                const statusNotes = family.levels.map((focus) => {
                  const grant = grants.find((item) => item.focusId === focus.id && !focus.repeatable)
                  const selected = learnedIds.includes(focus.id)
                  const reasons = focusInstanceLockReasons(focus, instances, foci, selectedClasses, classes, budget, grants)
                  const state = grant ? `자동 습득 (${focusGrantLabel(grant.grantedBy)}) · 선택권 소모 없음`
                    : selected ? '선택됨' : reasons.length ? '선택 불가' : '선택 가능'
                  return `${focus.level}레벨: ${state}${!grant && reasons.length ? '\n' + reasons.map(selectionReason).join('\n') : ''}`
                }).join('\n\n')
                const locked = selectedLevels.length === 0 && family.levels.every((focus) =>
                  focusInstanceLockReasons(focus, instances, foci, selectedClasses, classes, budget, grants).length > 0)
                return (
                  <article key={family.id} data-focus-family={family.id}
                    className={`focus-family-card${selectedLevels.length ? ' has-selection' : ''}${locked ? ' is-unavailable' : ''}`}
                    aria-label={`${focusName(first)} (${category})`}>
                    <div className="focus-family-heading">
                      <h4>{first.name}</h4>
                      <SelectionStatus state={selectedLevels.length ? autoGranted ? 'granted' : 'selected' : locked ? 'locked' : 'available'} name={first.name} detail={statusNotes} />
                    </div>
                    {first.englishName && <p className="focus-english-name">{first.englishName}</p>}
                    <p className="focus-preview">{rulesText(first.desc || first.effect)}</p>
                    <button type="button" className="focus-read-button" aria-haspopup="dialog"
                      aria-label={`자세히 보기: ${focusName(first)} (${category})`} onClick={() => setOpenFamilyId(family.id)}>
                      자세히 보기
                    </button>
                    <div className="focus-level-actions">
                      {family.levels.map((focus) => <LevelAction key={focus.id} focus={focus} context={props} location="card" />)}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      {visible.length < matching.length && <div className="catalogue-more">
        <p>{matching.length - visible.length}종의 포커스가 더 있습니다.</p>
        <button type="button" onClick={() => setVisibleCount(visibleCount + 12)}>포커스 {Math.min(12, matching.length - visible.length)}종 더 보기 <span className="material-symbols-outlined ui-icon" aria-hidden="true">expand_more</span></button>
        <button type="button" className="text-button" onClick={() => setVisibleCount(matching.length)}><span className="material-symbols-outlined ui-icon" aria-hidden="true">unfold_more</span>전체 펼치기</button>
      </div>}
      <dialog ref={dialogRef} className="focus-dialog" aria-labelledby="focus-dialog-title" aria-describedby="focus-dialog-help"
        onClose={() => setOpenFamilyId(null)} onKeyDown={containDialogFocus}>
        {activeFamily && activeFocus && <>
          <header className="focus-dialog-header">
            <div>
              <p className="eyebrow">{activeFamily.category}</p>
              <h3 id="focus-dialog-title">{activeFocus.name}</h3>
              {activeFocus.englishName && <p className="focus-english-name">{activeFocus.englishName}</p>}
            </div>
            <button type="button" autoFocus onClick={() => dialogRef.current?.close()} aria-label="포커스 설명 닫기" title="포커스 설명 닫기"><span className="material-symbols-outlined ui-icon" aria-hidden="true">close</span></button>
          </header>
          <div className="focus-dialog-body" tabIndex={0} role="region" aria-label="포커스 전체 설명">
            <p id="focus-dialog-help" className="support-text">설명을 읽는 것만으로는 포커스가 선택되지 않습니다. 등록된 각 레벨의 효과를 아래에서 확인하세요.</p>
            <h4>설명</h4>
            <p className="focus-full-text">{rulesText(activeFocus.desc) || '등록된 설명이 없습니다.'}</p>
            {activeFamily.levels.map((focus) => (
              <section key={focus.id} className="focus-detail-level" aria-label={`${focusName(focus)} ${focus.level}레벨 설명`}>
                <h4>{focus.level}레벨 <span className="focus-state-badge">{focusCreationLevelReason(focus) ? '생성 시 선택 불가' : grants.some((grant) => grant.focusId === focus.id) ? '자동 습득 · 선택권 소모 없음' : selectedIds.includes(focus.id) ? '선택됨' : '선택권 1개'}</span></h4>
                {focus !== activeFocus && focus.desc && focus.desc !== activeFocus.desc && <p className="focus-full-text">{rulesText(focus.desc)}</p>}
                <p className="focus-full-text">{rulesText(focus.effect) || '등록된 레벨 효과가 없습니다.'}</p>
                {focus.ability_ids?.map((id) => {
                  const ability = abilityById(id, props.abilities)
                  return ability ? <section key={id} aria-label={`부여 능력: ${ability.name}`}>
                    <h5>{ability.name}</h5><p className="focus-english-name">{ability.englishName}</p>
                    <p className="focus-full-text" lang="ko">{rulesText(ability.desc)}</p>
                    {Boolean(ability.manual_review?.length) && <div className="skill-review">
                      <strong>규칙 문구 또는 효과 확인 필요</strong>
                      <ul>{ability.manual_review!.map((note) => <li key={note}>{ko(note)}</li>)}</ul>
                    </div>}
                  </section> : <p className="skill-choice-error" key={id}>능력의 정의가 누락되었거나 중복되었습니다.</p>
                })}
                <h5>선택 조건</h5>
                <p>사용 가능한 선택권: {compatibleFocusAllowances(focus).map((type) => FOCUS_ALLOWANCE_LABELS[type]).join(' 또는 ')}.</p>
                {focus.requirements.length ? <ul>{focus.requirements.map((rule, index) =>
                  <li key={index}>{requirementLabel(rule, foci, classes)}</li>)}</ul> : <p>등록된 선행 조건이 없습니다.</p>}
                <h5>자동 적용 보너스</h5>
                {focus.bonus.length ? <ul>{focus.bonus.map((bonus, index) =>
                  <li key={index}>{bonusDescription(bonus, skills, attributes)}</li>)}</ul> : <p>등록된 기술·수정치 보너스가 없습니다.</p>}
                {focus.base_ac && <p>기본 AC: {focus.base_ac.base}{focus.base_ac.level_divisor !== undefined && <> + 캐릭터 레벨 ÷ {focus.base_ac.level_divisor} (나눗셈 결과 올림)</>}.
                  {focus.base_ac.better_armor_bonus !== undefined && <> 착용 갑옷 자체의 기본 AC가 이보다 높으면 그 갑옷 AC에 +{focus.base_ac.better_armor_bonus}.</>}
                  갑옷과 다른 포커스의 기본 AC 중 높은 값만 사용하고, 방패와 최종 민첩 수정치를 적용합니다. 착용 갑옷의 기술 판정 페널티는 유지됩니다.</p>}
                {focus.repeatable && <p>{focusCreationLevelReason(focus)
                  ? '이 레벨은 원문상 반복 습득할 수 있지만, 현재 1레벨 캐릭터 생성기에서는 선택할 수 없습니다.'
                  : <>1레벨 포커스는 반복 선택할 수 있으며, 각 항목의 선택 결과는 개별적으로 관리됩니다.{focus.unique_skill ? ' 각 항목은 서로 다른 기술을 선택해야 합니다.' : ''}</>}</p>}
                {focus.type === 'origin' && <p>기원 포커스는 한 계열만 선택할 수 있습니다.</p>}
                {focus.packages && <><h5>{focus.packages.required ? '특성 묶음 하나 선택' : '선택 특성'}</h5><ul>{focus.packages.options.map((option) => <li key={option.id}><strong>{option.name}:</strong> {rulesText(option.description)}</li>)}</ul></>}
                {focus.tradition_choice && <><h5>마법 전통 하나 선택</h5>
                  <p>{focus.tradition_choice.options.map(nameFor).join(' · ')} 중 하나를 선택합니다. 소언사의 순수·부분 여부에 맞는 시작 기교를 얻고 해당 전통의 주문을 배울 수 있습니다. 시작 주문 수는 부분 소언사 2개, 순수 소언사 4개로 유지됩니다.</p>
                  <p>최대 분발은 마법 기술 레벨과 같으며 최소 {focus.tradition_choice.effort.minimum}점입니다. 이 전통에서는 이후 추가 기교를 얻지 않습니다.</p>
                </>}
                {focus.score_effect && <p>능력치 규칙: {focus.score_effect.kind === 'redistribute' ? `총점을 보존하여 ${focus.score_effect.target} 미만인 능력치를 선택적으로 ${focus.score_effect.target}로 증가; 제공하는 능력치도 ${focus.score_effect.target} 이상 유지` : focus.score_effect.kind === 'reroll' ? `${nameFor(focus.score_effect.attribute_id)}: 배정·배경 성장 적용 후 1d${focus.score_effect.sides}+${focus.score_effect.bonus}(으)로 교체 (굴림 결과 저장)` : focus.score_effect.kind === 'threshold_replace' ? `${nameFor(focus.score_effect.attribute_id)}: 배정·배경 성장 적용 후 ${focus.score_effect.threshold} 미만이면 ${focus.score_effect.below}, 이상이면 ${focus.score_effect.at_or_above}(으)로 변경` : focus.score_effect.kind === 'raise_to' ? `조건에 맞는 ${focus.score_effect.value} 미만의 육체 능력치 하나를 ${focus.score_effect.value}(으)로 높일 수 있음` : `${focus.score_effect.value}보다 높은 능력치는 최대 하나만 유지하고 나머지 초과분은 낮춤`}. 수정치 보너스와는 별개로 적용합니다.</p>}
                {Boolean(focus.extra_focus_picks) && <p>추가 포커스 선택권: {focus.extra_focus_picks}개 (이 포커스도 선택권 하나를 사용합니다).</p>}
                {focus.derived_bonus?.hit_die_penalty !== undefined && <p>클래스·기교로 결정한 HD 결과에 −{focus.derived_bonus.hit_die_penalty}. 건강 수정치와 HP 보너스를 합산한 뒤 최소 HP 1을 적용합니다.</p>}
                {focus.derived_bonus?.hit_points_per_level !== undefined && <p>캐릭터 레벨당 최대 HP +{focus.derived_bonus.hit_points_per_level}. 현재 1레벨에서는 +{focus.derived_bonus.hit_points_per_level}을 적용하며, 건강 수정치와 합산한 뒤 최소 HP 1을 적용합니다.</p>}
                {focus.derived_bonus?.base_attack_bonus !== undefined && <p>기본 공격 보너스 조정: {signed(focus.derived_bonus.base_attack_bonus)}. 선택 가능한 포커스에 한해 일반 공격 보너스보다 먼저 클래스 성장 수치에 적용합니다.</p>}
                {focus.derived_bonus && Boolean(focus.derived_bonus.attack || focus.derived_bonus.saves || focus.derived_bonus.encumbrance_str || focus.derived_bonus.system_strain_max) && <p>시트에 적용되는 상시 보정: {focus.derived_bonus.attack ? `공격 ${signed(focus.derived_bonus.attack)}. ` : ''}{validSaveModifiers(focus.derived_bonus.saves) ? `내성굴림: ${saveModifierLabel(focus.derived_bonus.saves)} (목표값에 반영). ` : ''}{focus.derived_bonus.encumbrance_str ? `하중 계산용 근력 ${signed(focus.derived_bonus.encumbrance_str)}. ` : ''}{focus.derived_bonus.system_strain_max ? `최대 기관계 부담 ${signed(focus.derived_bonus.system_strain_max)}.` : ''}</p>}
                {validConditionalSaves(focus.conditional_saves) && focus.conditional_saves.length > 0 && <>
                  <h5>조건부 내성굴림 보정</h5>
                  <ul>{focus.conditional_saves.map((rule, index) => <li key={index}>
                    {saveModifierLabel(rule.saves)} · {rule.condition}{rule.scope && ` (${rule.scope})`}
                  </li>)}</ul>
                  <p>기본 내성 목표값에는 합산하지 않습니다.</p>
                </>}
                {Boolean(focus.sheet_notes?.length) && <><h5>플레이 참고사항</h5><ul>{focus.sheet_notes!.map((note) => <li key={note}>{ko(note.replaceAll('{skill}', '선택한 기술'))}</li>)}</ul></>}
                {Boolean(focus.manual_review?.length) && <div className="skill-review">
                  <h5>수동으로 적용할 규칙</h5>
                  <ul>{focus.manual_review!.map((note) => <li key={note}>{ko(note)}</li>)}</ul>
                </div>}
              </section>
            ))}
            <p className="support-text">보너스 선택은 포커스를 고른 뒤 생성 화면에서 지정하세요.</p>
          </div>
          <footer className="focus-dialog-footer">
            <p className="focus-pick-count" role="status" aria-live="polite">선택권 {selectedIds.length}/{limit}개 사용. 캐릭터 생성 시에는 1레벨 포커스만 선택할 수 있습니다.</p>
            <div className="focus-level-actions">
              {activeFamily.levels.map((focus) => <LevelAction key={focus.id} focus={focus} context={props} location="dialog" />)}
            </div>
          </footer>
        </>}
      </dialog>
    </>
  )
}
