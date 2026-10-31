import { useState } from 'react'
import { ATTRIBUTE_KEYS } from '../../shared/attributes'
import type { AttributeScores } from '../../shared/attributes'
import type { CharacterData } from '../../shared/characterData'
import type { CharacterEvaluation } from '../../shared/characterEvaluation'
import type { CreationCore } from '../../shared/characterCreation'
import type { AbilityEvaluation } from '../../shared/abilities'
import type { ArmorClassEvaluation, InventoryEvaluation } from '../../shared/equipment'
import type { FocusInstance } from '../../shared/focusCreation'
import type { SavingThrows } from '../../shared/savingThrows'
import type { SkillAllocation } from '../../shared/skillAllocation'
import type { SpellChoices } from '../../shared/spellSelection'
import type { evaluateArtChoices } from '../../shared/artSelection'
import { AbilitySheet } from './AbilitySheet'
import { InventorySummary } from './EquipmentInventory'
import { RulesLink } from './RulesLink'
import { focusGrantLabel, focusInstanceLabel } from './focusSelection'
import type { FocusOption } from './focusSelection'
import { plusModifier } from './formatting'
import { ko, nameFor, rulesText } from './korean'
import { SKILL_ICONS } from './skillIcons'

export type CharacterSheetProps = {
  character: { name: string; goal?: string; background?: string; classChoices: string[]; spellChoicesByClassSlot: SpellChoices }
  catalogues: Pick<CharacterData, 'CLASSES' | 'SKILLS' | 'ARTS' | 'SPELLS' | 'EQUIPMENT' | 'EQUIPMENT_PROPERTIES'> & { FOCI: FocusOption[]; BACKGROUNDS?: CharacterData['BACKGROUNDS'] }
  evaluation: Pick<CharacterEvaluation, 'valid' | 'stepStatus' | 'derived' | 'modifiers' | 'attributes' |
    'backgroundAttributeBonuses' | 'focusModifierBonuses' | 'baseModifiers' | 'modifierCaps'>
  evaluationCurrent: boolean
  backendOnline: boolean
  evaluationError: string
  allocatedScores: AttributeScores
  resolvedClassBuild: string
  displayedArmorClass: ArmorClassEvaluation
  displayedSaves: SavingThrows
  abilitySelection: AbilityEvaluation
  equipmentInventory: InventoryEvaluation
  skillAllocation: SkillAllocation
  focusCreation: Pick<CreationCore['focusCreation'], 'instances' | 'limit' | 'scoreChanges' | 'notes'>
  allFocusInstances: FocusInstance[]
  focusEffort: CharacterEvaluation['focusEffort']
  artEvaluation: ReturnType<typeof evaluateArtChoices>
}

export function CharacterSheet({
  character, catalogues, evaluation, evaluationCurrent, backendOnline, evaluationError,
  allocatedScores, resolvedClassBuild, displayedArmorClass, displayedSaves, abilitySelection,
  equipmentInventory, skillAllocation, focusCreation, allFocusInstances, focusEffort, artEvaluation,
}: CharacterSheetProps) {
  const [activeTab, setActiveTab] = useState('basic')
  const tabs = [{ id: 'basic', label: '기본' }, { id: 'skills', label: '기술' }, { id: 'abilities', label: '능력' }, { id: 'inventory', label: '소지품' }]
  const { CLASSES, FOCI, SKILLS, ARTS, SPELLS, EQUIPMENT, EQUIPMENT_PROPERTIES } = catalogues
  const CLASS_BY_ID = new Map(CLASSES.map((option) => [option.id, option]))
  const FOCUS_BY_ID = new Map(FOCI.map((focus) => [focus.id, focus]))
  const SPELL_BY_ID = new Map(SPELLS.map((spell) => [spell.id, spell]))
  const displayedAC = displayedArmorClass.value
  const archetypes = character.classChoices
    .map((id) => CLASS_BY_ID.get(id)?.archetype)
    .filter((archetype) => archetype !== undefined)
  const archetypeOrder = ['warrior', 'expert', 'mage']
  archetypes.sort((left, right) => archetypeOrder.indexOf(left) - archetypeOrder.indexOf(right))
  const firstArchetype = archetypes[0] ?? 'neutral'
  const secondArchetype = archetypes[1] ?? firstArchetype

  return (
    <section className="card summary-card" id="character-sheet" aria-labelledby="character-sheet-title" tabIndex={-1}>
      <div className="sheet-status-row">
        <span className={evaluationCurrent && evaluation.valid && evaluation.stepStatus.every((step) => step.complete) ? 'sheet-status is-complete' : 'sheet-status'}>
          {evaluationError ? '연결 필요' : !evaluationCurrent ? '계산 중' : evaluation.valid && evaluation.stepStatus.every((step) => step.complete) ? '생성 완료' : '작성 중'}
        </span>
      </div>

      <div className="sheet-scroll-content" tabIndex={0} role="region" aria-label="캐릭터 시트 상세">
      <section className="class-build-summary" data-archetype-first={firstArchetype} data-archetype-second={secondArchetype} aria-label="클래스 조합" aria-live="polite">
        <div className="sheet-name-row">
          <h2 className="character-name" id="character-sheet-title">{character.name.trim() || '이름 없는 모험가'}</h2>
          <span className="sheet-level">레벨 1</span>
        </div>
        <div className="sheet-identity-line">
          <span className="sheet-background">{catalogues.BACKGROUNDS?.find((option) => option.id === character.background)?.name || '배경 미선택'}</span>
          <span className="sheet-identity-divider" aria-hidden="true">·</span>
          <strong className="class-build-name">{ko(resolvedClassBuild)}</strong>
        </div>
        <div className="sheet-class-details">
          <p className="support-text">{[0, 1].map((slot) => CLASS_BY_ID.get(character.classChoices[slot])?.name ?? '미선택').join(' / ')}</p>
          <p className="focus-english-name" lang="en">{[0, 1].map((slot) => CLASS_BY_ID.get(character.classChoices[slot])?.eng_name).filter(Boolean).join(' / ')}</p>
        </div>
      </section>

      <div className="sheet-tabs" role="tablist" aria-label="캐릭터 시트 페이지">
        {tabs.map((tab, index) => <button key={tab.id} type="button" role="tab"
          id={`sheet-tab-${tab.id}`} aria-controls={`sheet-panel-${tab.id}`}
          aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => setActiveTab(tab.id)}
          onKeyDown={(event) => {
            const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
              : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
            if (next < 0) return
            event.preventDefault()
            setActiveTab(tabs[next]!.id)
            document.getElementById(`sheet-tab-${tabs[next]!.id}`)?.focus()
          }}>{tab.label}</button>)}
      </div>
      <div className="sheet-tab-panel" role="tabpanel" id="sheet-panel-basic" aria-labelledby="sheet-tab-basic" hidden={activeTab !== 'basic'} tabIndex={0}>
      <div className="sheet-vitals" aria-label="주요 전투 수치" aria-busy={!evaluationCurrent && !evaluationError}>
        <div><span>HP</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">favorite</span>{evaluationCurrent ? evaluation.derived.hitPoints : '--'}</strong></div>
        <div><span>AC</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">shield</span>{displayedAC ?? '미정'}</strong>
          {(displayedArmorClass.baseSource?.kind === 'focus' || displayedArmorClass.baseSource?.kind === 'art') && <small>{displayedArmorClass.baseSource.name}</small>}
          {displayedArmorClass.baseSource?.armorBonus && <small>{displayedArmorClass.baseSource.armorBonus.name} +{displayedArmorClass.baseSource.armorBonus.value}</small>}
        </div>
        <div><span>공격 보너스</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">colorize</span>{evaluationCurrent ? plusModifier(evaluation.derived.attackBonus) : '--'}</strong></div>
      </div>
      <div className="sheet-secondary-vitals" aria-label="이동과 우선권 및 기관계 부담" aria-busy={!evaluationCurrent && !evaluationError}>
        <div><span>이동 속도</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">steps</span>{evaluationCurrent ? `${evaluation.derived.movementSpeed} ft` : '--'}</strong></div>
        <div><span>우선권</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">bolt</span>{evaluationCurrent ? plusModifier(evaluation.derived.initiative) : '--'}</strong></div>
        <div><span>기관계 부담</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">health_metrics</span>{evaluationCurrent ? `${evaluation.derived.systemStrain.current} / ${evaluation.derived.systemStrain.maximum}` : '--'}</strong></div>
      </div>
      <div className="sheet-saves" aria-label="내성 굴림 목표값">
        <div><span>육체 내성 목표값</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">accessibility_new</span>{displayedSaves.targets.physical}</strong></div>
        <div><span>회피 내성 목표값</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">sprint</span>{displayedSaves.targets.evasion}</strong></div>
        <div><span>정신 내성 목표값</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">cognition</span>{displayedSaves.targets.mental}</strong></div>
        <div><span>행운 내성 목표값</span><strong><span className="material-symbols-outlined sheet-stat-icon" aria-hidden="true">flare</span>{displayedSaves.targets.luck}</strong></div>
      </div>
      {(!evaluationCurrent || evaluationError) && <p className="sheet-update-notice" role="status">
        {evaluationError ? '서버 연결 필요' : '계산 중'}
      </p>}
      <div className="summary-block">
        <h3>능력치 수정치</h3>
        <div className="modifier-grid">
          {ATTRIBUTE_KEYS.map((key) => (
            <div key={key}>
              <span>{nameFor(key)}</span>
              <strong>{backendOnline ? plusModifier(evaluation.modifiers[key]) : '--'}</strong>
              <small>능력치 {backendOnline ? evaluation.attributes?.[key] ?? allocatedScores[key] : allocatedScores[key]}</small>
              {backendOnline && evaluation.attributes?.[key] !== undefined && (evaluation.attributes[key] !== allocatedScores[key] || Boolean(evaluation.backgroundAttributeBonuses?.[key])) && <small>배정 {allocatedScores[key]}{Boolean(evaluation.backgroundAttributeBonuses?.[key]) && ` · 배경 +${evaluation.backgroundAttributeBonuses[key]}`}</small>}
              {backendOnline && Boolean(evaluation.focusModifierBonuses?.[key]) && <small>기본 {plusModifier(evaluation.baseModifiers?.[key] ?? 0)} / 포커스 {plusModifier(evaluation.focusModifierBonuses?.[key] ?? 0)}</small>}
              {backendOnline && evaluation.modifierCaps?.[key] && (evaluation.modifierCaps[key].min !== -2 || evaluation.modifierCaps[key].max !== 2) && <small>한계 {plusModifier(evaluation.modifierCaps[key].min)} ~ {plusModifier(evaluation.modifierCaps[key].max)}</small>}
            </div>
          ))}
        </div>
      </div>

      <details className="sheet-disclosure">
        <summary>기타 수치</summary>
      <div className="sheet-grid">
        <div><span>반응 판정 수정치</span><strong>{evaluationCurrent ? plusModifier(evaluation.derived.reactionRollModifier) : '--'}</strong></div>
        <div><span>히트 주사위</span><strong>{evaluation.derived.hitDice || `d${evaluation.derived.hitDie || 0}`}</strong></div>
        <div><span>기본 공격 보너스</span><strong>{plusModifier(evaluation.derived.baseAttackBonus)}</strong></div>
        <div><span>포커스 공격 보너스</span><strong>{plusModifier(evaluation.derived.focusAttackBonus ?? 0)}</strong></div>
      </div>

      <details className="sheet-disclosure">
        <summary>계산 내역</summary>
        <RulesLink topic="combat">계산 규칙</RulesLink>
        {displayedArmorClass.complete && displayedArmorClass.baseSource && <p aria-label="AC 계산 내역">
          기본 AC {displayedArmorClass.base} ({displayedArmorClass.baseSource.name.trim()}{displayedArmorClass.baseSource.armorBonus && <>
            {' '}{displayedArmorClass.armor?.armor?.baseAc} + {displayedArmorClass.baseSource.armorBonus.name.trim()} {displayedArmorClass.baseSource.armorBonus.value}</>})
          {' '}· 방패 {plusModifier(displayedArmorClass.shieldBonus)} · 민첩 {plusModifier(displayedArmorClass.dexterity)} = AC {displayedAC}
        </p>}

      {evaluationCurrent && <div aria-label="HP 계산 내역">
        <p>HD 최댓값 {evaluation.derived.hitPointBreakdown.hitDiceMaximum} · 건강 {plusModifier(evaluation.derived.hitPointBreakdown.constitutionModifier)}
          {' '}· 포커스 {plusModifier(evaluation.derived.hitPointBreakdown.focusBonus)}
          {evaluation.derived.hitPointBreakdown.minimumAdjustment > 0 && <> · 최소 HP 1 보정 {plusModifier(evaluation.derived.hitPointBreakdown.minimumAdjustment)}</>}
          {' '}= HP {evaluation.derived.hitPoints}</p>
        {evaluation.derived.hitPointBreakdown.sources.length > 0 && <ul>{evaluation.derived.hitPointBreakdown.sources.map((source) =>
          <li key={source.instanceId}>{source.name} · {FOCUS_BY_ID.get(source.focusId)?.category} · 최대 HP {plusModifier(source.value)}</li>)}</ul>}
      </div>}
      {backendOnline && Boolean(evaluation.derived.hitDiceAdjustments?.length) && <div aria-label="히트 주사위 조정">
        <strong>히트 주사위 조정</strong>
        <p>{evaluation.derived.baseHitDice} &rarr; {evaluation.derived.hitDice}: {evaluation.derived.hitDiceAdjustments.map((item) => (item.name || nameFor(item.abilityId))).join(', ')}.</p>
      </div>}

      {backendOnline && Boolean(evaluation.derived.baseAttackAdjustments?.length) && <div aria-label="기본 공격 보너스 조정">
        <strong>기본 공격 보너스 조정</strong>
        <p>클래스 성장 수치 {plusModifier(evaluation.derived.progressionAttackBonus)} + 조정 ({plusModifier(evaluation.derived.baseAttackBonusAdjustment)}) = 기본 공격 보너스 {plusModifier(evaluation.derived.baseAttackBonus)}.</p>
        <ul>{evaluation.derived.baseAttackAdjustments.map((item) => <li key={item.instanceId}>{FOCUS_BY_ID.get(item.focusId)?.name || '알 수 없는 포커스'}: {plusModifier(item.value)}</li>)}</ul>
      </div>}

      {Boolean(evaluation.derived.encumbranceStrengthBonus || evaluation.derived.systemStrainMaxBonus) && <div>
        <p>하중 계산용 근력 보정: {plusModifier(evaluation.derived.encumbranceStrengthBonus ?? 0)}</p>
        <p>최대 기관계 부담 보정: {plusModifier(evaluation.derived.systemStrainMaxBonus ?? 0)}</p>
      </div>}

      </details>
      </details>

      </div>

      <div className="sheet-tab-panel" role="tabpanel" id="sheet-panel-skills" aria-labelledby="sheet-tab-skills" hidden={activeTab !== 'skills'} tabIndex={0}>
      <div className="summary-block">
        <h3>능력치 수정치</h3>
        <div className="modifier-grid">
          {ATTRIBUTE_KEYS.map((key) => (
            <div key={key}>
              <span>{nameFor(key)}</span>
              <strong>{backendOnline ? plusModifier(evaluation.modifiers[key]) : '--'}</strong>
              <small>능력치 {backendOnline ? evaluation.attributes?.[key] ?? allocatedScores[key] : allocatedScores[key]}</small>
              {backendOnline && evaluation.attributes?.[key] !== undefined && (evaluation.attributes[key] !== allocatedScores[key] || Boolean(evaluation.backgroundAttributeBonuses?.[key])) && <small>배정 {allocatedScores[key]}{Boolean(evaluation.backgroundAttributeBonuses?.[key]) && ` · 배경 +${evaluation.backgroundAttributeBonuses[key]}`}</small>}
              {backendOnline && Boolean(evaluation.focusModifierBonuses?.[key]) && <small>기본 {plusModifier(evaluation.baseModifiers?.[key] ?? 0)} / 포커스 {plusModifier(evaluation.focusModifierBonuses?.[key] ?? 0)}</small>}
              {backendOnline && evaluation.modifierCaps?.[key] && (evaluation.modifierCaps[key].min !== -2 || evaluation.modifierCaps[key].max !== 2) && <small>한계 {plusModifier(evaluation.modifierCaps[key].min)} ~ {plusModifier(evaluation.modifierCaps[key].max)}</small>}
            </div>
          ))}
        </div>
      </div>

      <details className="sheet-disclosure" open>
        <summary>기술 레벨 <span>{SKILLS.filter((skill) => skillAllocation.states[skill.id]!.level >= 0).length}종 습득</span></summary>
        <RulesLink topic="skills">기술 레벨 규칙</RulesLink>
        <div className="sheet-skill-columns">
        {[SKILLS.slice(0, Math.ceil(SKILLS.length / 2)), SKILLS.slice(Math.ceil(SKILLS.length / 2))].map((skills, column) => <table className="skill-table" key={column}>
          <caption className="sr-only">기술 레벨 · {column + 1}열</caption>
          <thead><tr><th scope="col">기술</th><th scope="col">레벨</th></tr></thead>
          <tbody>{skills.map((skill) => {
            const state = skillAllocation.states[skill.id]!
            return <tr key={skill.id} data-skill-id={skill.id} className={state.level === -1 ? 'untrained' : 'trained'}>
              <th scope="row">
                <span className="skill-name">
                  {SKILL_ICONS[skill.id] && <span className="material-symbols-outlined skill-icon" aria-hidden="true">{SKILL_ICONS[skill.id]}</span>}
                  <span className="skill-name-text">{skill.name}<small>{skill.id}</small></span>
                </span>
              </th>
              <td><strong aria-describedby={state.allotments >= 3 ? 'skill-overflow-note' : undefined}>{state.level}{state.allotments >= 3 && '*'}</strong></td>
            </tr>
          })}</tbody>
        </table>)}
        </div>
        {Object.values(skillAllocation.states).some((state) => state.allotments >= 3) && <p className="support-text skill-overflow-note" id="skill-overflow-note">
          * 3회 이상 배정된 기술입니다. 레벨은 1로 유지됩니다.
          {Object.values(skillAllocation.states).filter((state) => state.advancementPoints > 0).map((state) =>
            <span key={state.id}> {SKILLS.find((skill) => skill.id === state.id)?.name}: 2레벨을 위한 성장 점수 {state.advancementPoints}점.</span>)}
        </p>}
        {skillAllocation.issues.length > 0 && <div className="skill-review" role="status">
          <strong>기술 선택을 확인하세요</strong>
          <ul>{skillAllocation.issues.map((issue) => <li key={issue.key}>{ko(issue.message)}</li>)}</ul>
        </div>}
      </details>

      </div>

      <div className="sheet-tab-panel" role="tabpanel" id="sheet-panel-abilities" aria-labelledby="sheet-tab-abilities" hidden={activeTab !== 'abilities'} tabIndex={0}>
      <section className="sheet-disclosure sheet-ability-section">
        <AbilitySheet evaluation={abilitySelection} classes={CLASSES} foci={FOCI} instances={allFocusInstances} />
      </section>

      <div className="summary-block selected-focus-summary">
        <h3>포커스</h3>
        {!allFocusInstances.length && <p className="support-text">아직 포커스를 선택하지 않았습니다. <a href="#stage-focus">포커스 고르기 →</a></p>}
        <div className="sheet-feature-list">
          {allFocusInstances.map((instance) => {
            const focus = FOCUS_BY_ID.get(instance.focusId)
            return <article key={instance.instanceId} className="class-ability">
              <h4>{focusInstanceLabel(instance, allFocusInstances, FOCI)}</h4>
              {focus?.englishName && <p className="focus-english-name" lang="en">{focus.englishName}</p>}
              <p className="support-text">획득 경로: {instance.grantedBy ? `자동 습득 (${focusGrantLabel(instance.grantedBy)})` : '포커스 선택'}</p>
              {instance.boundSkillId && <p>연결 기술: {nameFor(instance.boundSkillId)} · 기술 배분은 부여한 포커스에서 총 1회</p>}
              <details className="sheet-feature-description">
                <summary title="효과 펼치기·접기"><span className="material-symbols-outlined ui-icon" aria-hidden="true">expand_more</span><span className="sr-only">효과 자세히 보기 · {focusInstanceLabel(instance, allFocusInstances, FOCI)}</span></summary>
                {focus?.desc && <p>{rulesText(focus.desc)}</p>}
                <p>{focus?.effect ? rulesText(focus.effect) : '등록된 효과 설명이 없습니다.'}</p>
              </details>
            </article>
          })}
        </div>
      </div>
      {focusCreation.scoreChanges.length > 0 && <section className="summary-block" aria-label="포커스로 인한 능력치 변화">
        <h3>포커스로 인한 능력치 변화</h3>
        <ul>{focusCreation.scoreChanges.map((change) => <li key={`${change.instanceId}-${change.id}`}>{nameFor(change.id)}: {change.before} → {change.after}</li>)}</ul>
      </section>}
      {focusCreation.notes.length > 0 && <section className="sheet-disclosure sheet-ability-section">
        <h3 className="sheet-section-heading">포커스 플레이 참고사항 <span>{focusCreation.notes.length}개</span></h3>
        <ul>{focusCreation.notes.map((note, index) => <li key={`${note.instanceId}-${index}`}>{ko(note.text)}</li>)}</ul>
      </section>}

      {focusEffort.map((effort) => <section className="summary-block" key={effort.instanceId} aria-label="전통적 교육 분발">
        <h3>{nameFor(effort.focusId)} · {nameFor(effort.traditionId)}</h3>
        <p><strong>최대 분발 {effort.maximum}점</strong></p>
        <RulesLink topic="foci">전통적 교육 규칙</RulesLink>
      </section>)}
      <section className="summary-block sheet-arts">
        <h3>기교</h3>
        {!artEvaluation.classes.some((result) => result.learned.length > 0) && <p className="support-text">습득한 기교가 없습니다.</p>}
        {artEvaluation.classes.map((result) => <div className="sheet-feature-list" key={result.classId}>
          {result.learned.map((id) => {
            const art = ARTS.find((option) => option.class_id === result.classId && option.id === id)
            return <article className="class-ability" key={id}>
              <h4>{art?.name ?? '알 수 없는 기교'}</h4>
              {art?.eng_name && <p className="focus-english-name" lang="en">{art.eng_name}</p>}
              <p className="support-text">{CLASS_BY_ID.get(result.classId)?.name ?? nameFor(result.classId)}
                {result.fixed.includes(id) && ' · 자동 습득'}
                {result.focusGrant && ` · ${nameFor(result.focusGrant)}로 기교 부여`}
                {result.source && ` · ${nameFor(result.source.focusId)}로 습득`}
              </p>
              <details className="sheet-feature-description">
                <summary title="효과 펼치기·접기"><span className="material-symbols-outlined ui-icon" aria-hidden="true">expand_more</span><span className="sr-only">효과 자세히 보기 · {art?.name ?? '알 수 없는 기교'}</span></summary>
                <p>{art?.description ? rulesText(art.description) : '등록된 설명이 없습니다.'}</p>
              </details>
            </article>
          })}
          {!result.complete && <p className="warning-text">시작 기교 선택을 확인하세요.</p>}
        </div>)}
      </section>
      {character.spellChoicesByClassSlot.flat().length > 0 ? (
        <div className="summary-block">
          <p className="subheading">습득한 1레벨 주문</p>
          {character.spellChoicesByClassSlot.map((ids, slot) => ids.length > 0 && <div key={slot} className="learned-spell-summary">
            <h4>{slot + 1}번째 클래스: {CLASS_BY_ID.get(character.classChoices[slot])?.name} ({ids.length}/2)</h4>
            <div className="tag-row">{ids.map((spellId) => {
              const spell = SPELL_BY_ID.get(spellId)
              return <span key={spellId} className="tag">{spell?.name ?? '알 수 없는 주문'} / 1레벨</span>
            })}</div>
          </div>)}
        </div>
      ) : null}

      </div>

      <div className="sheet-tab-panel" role="tabpanel" id="sheet-panel-inventory" aria-labelledby="sheet-tab-inventory" hidden={activeTab !== 'inventory'} tabIndex={0}>
      <details className="sheet-disclosure" open>
        <summary>시작 장비와 소지품 <span>{equipmentInventory.items.length}종</span></summary>
        <InventorySummary evaluation={equipmentInventory} equipment={EQUIPMENT} properties={EQUIPMENT_PROPERTIES} />
      </details>

      </div>
      <footer className="sheet-footer"><RulesLink topic="scope">자동 적용 범위</RulesLink></footer>
      </div>
    </section>
  )
}
