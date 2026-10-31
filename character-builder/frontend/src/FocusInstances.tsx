import type { ReactNode } from 'react'
import { ScoreRedistribution } from './ScoreRedistribution'
import { ko, nameFor, rulesText } from './korean'
import type { FocusOption } from './focusSelection'
import { focusGrantLabel, focusInstanceLabel } from './focusSelection'
import { focusCreationLevelReason } from '../../shared/focusBonuses'
import type { FocusInstance, FocusRuleChoice, FocusRuleChoices } from '../../shared/focusCreation'
import { FOCUS_ALLOWANCE_LABELS } from './korean'
import type { FocusAllowanceType } from '../../shared/focusAllowances'

export function FocusInstances({ instances, foci, assignments, ruleChoices, scores, attributes, onRemove, onRuleChoice, onScoreRoll, onScoreTransfers, renderAdditional, renderEffects }: {
  renderEffects?: (instance: FocusInstance) => ReactNode
  renderAdditional?: (instance: FocusInstance) => ReactNode
  instances: FocusInstance[]
  foci: FocusOption[]
  assignments: Array<{ instanceId: string; type: FocusAllowanceType }>
  ruleChoices: FocusRuleChoices
  scores: Record<string, number>
  attributes: Array<{ id: string; name: string; tags: string[] }>
  onScoreTransfers: (id: string, value: Record<string, number>) => void
  onScoreRoll: (id: string) => void
  onRemove: (id: string) => void
  onRuleChoice: (id: string, key: keyof FocusRuleChoice, value: string) => void
}) {
  return <section aria-label="선택한 포커스 목록" className="focus-bonus-list">
    <h3>선택한 포커스</h3>
    {!instances.length && <p className="support-text">아래 목록에서 포커스를 선택하세요.</p>}
    {instances.map((instance) => {
      const focus = foci.find((item) => item.id === instance.focusId)
      const label = focusInstanceLabel(instance, instances, foci)
      const levelReason = focus && focusCreationLevelReason(focus)
      if (levelReason) return <section key={instance.instanceId} className="info-panel focus-bonus-panel selected-focus-editor" aria-label={`${label} 선택 오류`}>
        <h4>{label}</h4>
        <p className="skill-choice-error">{ko(levelReason)} 보너스는 적용되지 않습니다. 저장된 선택을 해제하세요.</p>
        <button type="button" onClick={() => onRemove(instance.instanceId)} className="icon-button" title={`${label} 해제`} aria-label={`${label} 해제`}><span className="material-symbols-outlined ui-icon" aria-hidden="true">close</span></button>
      </section>
      const choice = ruleChoices[instance.instanceId] ?? {}
      const effect = focus?.score_effect
      const physical = effect?.kind === 'raise_to' ? attributes.filter((item) => item.tags.some((tag) => effect.tags.includes(tag)) && scores[item.id] < effect.value) : []
      const high = effect?.kind === 'cap_except_one' ? attributes.filter((item) => scores[item.id] > effect.value) : []
      const parent = instances.find((item) => item.instanceId === instance.parentInstanceId)
      const assigned = assignments.find((item) => item.instanceId === instance.instanceId)
      return <section key={instance.instanceId} className="info-panel focus-bonus-panel selected-focus-editor" aria-label={`${label} 선택`}>
        <div className="selected-focus-layout"><div className="selected-focus-settings">
        <h4>{label}</h4>
        {instance.grantedBy ? <p className="support-text">자동 습득 · {focusGrantLabel(instance.grantedBy)} <span className="modifier-info" tabIndex={0} role="img" aria-label="선택권을 소모하지 않으며 개별 해제할 수 없습니다." title="선택권 소모 없음 · 개별 해제 불가"><span className="material-symbols-outlined ui-icon" aria-hidden="true">info</span><span className="modifier-tooltip" aria-hidden="true">선택권 소모 없음 · 개별 해제 불가</span></span></p>
          : <p className={assigned ? 'support-text' : 'skill-choice-error'}>{assigned ? `${FOCUS_ALLOWANCE_LABELS[assigned.type]} 선택권` : '배정할 수 있는 선택권이 없습니다. 아래 선택 오류를 확인하세요.'}</p>}
        {parent && <p>{focusInstanceLabel(parent, instances, foci)}에서 향상되었습니다.{foci.find((item) => item.id === parent.focusId)?.unique_skill ? ' 기존에 선택한 기술을 이어받으며 추가 기술을 얻지는 않습니다.' : ''}</p>}
        {instance.boundSkillId && <p>연결 기술: {nameFor(instance.boundSkillId)} · 부모 포커스의 기술 선택을 따릅니다.</p>}
        {!instance.grantedBy && <div className="focus-remove-action">
          <button type="button" onClick={() => onRemove(instance.instanceId)} className="icon-button" title={`${label}${instances.some((item) => item.parentInstanceId === instance.instanceId) ? '와 연결된 상위 레벨' : ''} 해제`} aria-label={`${label}${instances.some((item) => item.parentInstanceId === instance.instanceId) ? '와 연결된 상위 레벨' : ''} 해제`}><span className="material-symbols-outlined ui-icon" aria-hidden="true">close</span></button>
        </div>}
        {Boolean(focus?.extra_focus_picks) && <p className="support-text">자유 선택권 +{focus!.extra_focus_picks}. 해제 시 초과 선택도 해제될 수 있습니다.</p>}
        {focus?.tradition_choice && <label>
          <span>마법 전통</span>
          <select aria-label={`${label} 마법 전통`} value={choice.traditionId ?? ''}
            aria-invalid={!focus.tradition_choice.options.includes(choice.traditionId ?? '')}
            onChange={(event) => onRuleChoice(instance.instanceId, 'traditionId', event.target.value)}>
            <option value="">전통 선택</option>
            {choice.traditionId && !focus.tradition_choice.options.includes(choice.traditionId) && <option value={choice.traditionId} disabled>유효하지 않은 전통 (다시 선택하세요)</option>}
            {focus.tradition_choice.options.map((id) => <option key={id} value={id}>{nameFor(id)}</option>)}
          </select>
        </label>}
        {focus?.packages && <label>
          <span>{focus.packages.required ? '필수 선택 특성' : '선택 특성'}</span>
          <select aria-label={`${label} 특성 묶음`} value={choice.packageId ?? ''} aria-invalid={Boolean(focus.packages.required && !choice.packageId)}
            onChange={(event) => onRuleChoice(instance.instanceId, 'packageId', event.target.value)}>
            <option value="">{focus.packages.required ? '꾸러미 선택' : '추가 특성 없음'}</option>
            {choice.packageId && !focus.packages.options.some((option) => option.id === choice.packageId) && <option value={choice.packageId} disabled>유효하지 않은 특성 (다시 선택하세요)</option>}
            {focus.packages.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          {focus.packages.options.find((option) => option.id === choice.packageId)?.description &&
            <p className="support-text">{rulesText(focus.packages.options.find((option) => option.id === choice.packageId)!.description)}</p>}
        </label>}
        {effect?.kind === 'redistribute' && <ScoreRedistribution value={choice.scoreTransfers} scores={scores} attributes={attributes} target={effect.target} onChange={(value) => onScoreTransfers(instance.instanceId, value)} />}
        {effect?.kind === 'reroll' && <div>
          {Number.isInteger(choice.scoreDie) && choice.scoreDie! >= 1 && choice.scoreDie! <= effect.sides
            ? <p>{nameFor(effect.attribute_id)} 저장된 굴림: 1d{effect.sides} = {choice.scoreDie}, +{effect.bonus} → {choice.scoreDie! + effect.bonus}</p>
            : <button type="button" onClick={() => onScoreRoll(instance.instanceId)}>{nameFor(effect.attribute_id)} 1d{effect.sides}+{effect.bonus} 굴리기</button>}
          <p className="support-text">한 번 굴린 결과는 저장됩니다. 배정·배경 성장 후 근력을 교체하며, 포커스를 해제하면 원래 능력치로 돌아갑니다.</p>
        </div>}
        {effect?.kind === 'raise_to' && <label>
          <span>육체 능력치 하나를 {effect.value}(으)로 증가 (선택 사항)</span>
          <select aria-label={`${label} 능력치 증가`} value={choice.attributeId ?? ''} onChange={(event) => onRuleChoice(instance.instanceId, 'attributeId', event.target.value)}>
            <option value="">능력치를 선택하거나 증가를 포기하세요</option>
            {effect.optional && <option value="none">능력치를 증가시키지 않음</option>}
            {physical.map((item) => <option key={item.id} value={item.id}>{item.name}: {scores[item.id]} → {effect.value}</option>)}
            {choice.attributeId && choice.attributeId !== 'none' && !physical.some((item) => item.id === choice.attributeId) && <option value={choice.attributeId} disabled>조건에 맞지 않는 능력치 (다시 선택하세요)</option>}
          </select>
        </label>}
        {effect?.kind === 'cap_except_one' && <div>
          <p>{effect.value}보다 높은 능력치는 최대 하나만 유지할 수 있습니다. 다른 능력치의 초과분은 최종 시트에서 낮아지며, 원래 배정값은 보존됩니다.</p>
          {high.length > 1 ? <label><span>유지할 능력치</span>
            <select aria-label={`${label} 유지할 능력치`} value={choice.retainedAttribute ?? ''} onChange={(event) => onRuleChoice(instance.instanceId, 'retainedAttribute', event.target.value)}>
              <option value="">능력치 하나 선택</option>
              {choice.retainedAttribute && !high.some((item) => item.id === choice.retainedAttribute) && <option value={choice.retainedAttribute} disabled>조건에 맞지 않는 능력치 (다시 선택하세요)</option>}
              {high.map((item) => <option key={item.id} value={item.id}>{item.name}: {scores[item.id]}</option>)}
            </select>
          </label> : <p className="support-text">{high.length === 1 ? `${nameFor(high[0].id)}만 ${effect.value}보다 높으므로 자동으로 유지됩니다.` : '낮아지는 능력치가 없습니다.'}</p>}
        </div>}
        {renderAdditional?.(instance)}
        </div>{renderEffects?.(instance)}</div>
      </section>
    })}
  </section>
}
