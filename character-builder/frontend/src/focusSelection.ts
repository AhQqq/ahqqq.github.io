import { nameFor } from './korean'
import { eligibleSelectedFoci, focusCreationLevelReason, focusRequirementMet, originFamilyId } from '../../shared/focusBonuses.js'
import type { FocusBonus, FocusData } from '../../shared/focusBonuses.js'
import type { FocusInstance } from '../../shared/focusCreation.js'
import { evaluateFocusInstances } from '../../shared/focusCreation.js'
import type { FocusBudget } from '../../shared/focusAllowances.js'
import type { FocusGrant, FocusGrantSource } from '../../shared/artFocusGrants.js'
export type { FocusBonus } from '../../shared/focusBonuses.js'

export type FocusOption = FocusData & {
  id: string
  name: string
  englishName: string
  category: string
  desc: string
  type: string
  level: number
  effect: string
  bonus: FocusBonus[]
  requirements: Array<{ condition: string; id: string }>
  manual_review?: string[]
}

export type FocusClass = { id: string; name: string; eng_name: string; archetype: string }
export type FocusFamily = { id: string; category: string; levels: FocusOption[] }

export function focusGrantLabel(sources: FocusGrantSource[]) {
  return sources.map((source) => source.kind === 'art' ? `${nameFor(source.classId)} → ${source.name}` : `${source.name} → ${nameFor(source.skillId)}`).join(', ')
}

export function focusInstanceLabel(instance: FocusInstance, instances: FocusInstance[], foci: FocusOption[]) {
  const focus = foci.find((item) => item.id === instance.focusId)
  const owner = instances.find((item) => item.instanceId === instance.parentInstanceId) ?? instance
  const ordinal = instances.filter((item) => item.focusId === owner.focusId).findIndex((item) => item.instanceId === owner.instanceId) + 1
  return `${focus?.name || '알 수 없는 포커스'}${focus?.repeatable ? ` (${ordinal}번째)` : ''} ${focus?.level ?? 1}레벨`
}

export function buildFocusFamilies(foci: FocusOption[]): FocusFamily[] {
  const byId = new Map(foci.map((focus) => [focus.id, focus]))
  const families = new Map<string, FocusFamily>()
  for (const focus of foci) {
    let root = focus
    // Only explicit, unambiguous links join levels. Names are not unique.
    while (root.level > 1) {
      const parents = root.requirements.filter((rule) => rule.condition === 'has_focus')
      const parent = parents.length === 1 ? byId.get(parents[0]!.id) : undefined
      if (!parent || parent.category !== root.category || parent.level !== root.level - 1) break
      root = parent
    }
    const family = families.get(root.id) ?? { id: root.id, category: root.category, levels: [] }
    family.levels.push(focus)
    families.set(root.id, family)
  }
  return [...families.values()].map((family) => ({
    ...family, levels: family.levels.sort((a, b) => a.level - b.level),
  }))
}

function eligibleIds(ids: string[], foci: FocusOption[], classes: FocusClass[]) {
  return new Set(eligibleSelectedFoci(ids, foci, classes).map((focus) => focus.id))
}

export function requirementLabel(rule: FocusOption['requirements'][number], foci: FocusOption[], classes: FocusClass[]) {
  if (rule.condition === 'is_class' || rule.condition === 'not_class') {
    const option = classes.find((item) => item.id === rule.id)
    const name = option?.name || nameFor(rule.id)
    return `${rule.condition === 'is_class' ? '필요 클래스' : '선택 불가 클래스'}: ${name}`
  }
  if (rule.condition === 'has_focus' || rule.condition === 'not_focus') {
    const focus = foci.find((item) => item.id === rule.id)
    return `${rule.condition === 'has_focus' ? '선행 조건:' : '함께 선택 불가:'} ${focus ? `${focus.name} ${focus.level}레벨` : nameFor(rule.id)}`
  }
  return '자동으로 확인할 수 없는 선행 조건입니다. 규칙을 직접 확인하세요.'
}

export function focusLockReasons(focus: FocusOption, selected: string[], foci: FocusOption[], selectedClasses: FocusClass[], classes: FocusClass[], limit: number) {
  const levelReason = focusCreationLevelReason(focus)
  if (levelReason) return [levelReason]
  const eligible = eligibleIds(selected, foci, selectedClasses)
  const requested = new Set(selected)
  const reasons = focus.requirements.filter((rule) => !focusRequirementMet(rule, selectedClasses, eligible, requested))
    .map((rule) => requirementLabel(rule, foci, classes))
  if (focus.type === 'origin' && foci.some((item) => item.type === 'origin' && originFamilyId(item, foci) !== originFamilyId(focus, foci) && selected.includes(item.id))) {
    reasons.push('Only one origin focus family is allowed. Remove the selected origin first.')
  }
  const prospectiveLimit = limit + (selected.includes(focus.id) ? 0 : focus.extra_focus_picks ?? 0)
  if (!selected.includes(focus.id) && selected.length >= prospectiveLimit) reasons.push('No focus picks remaining. Remove a selected level first.')
  return reasons
}

export function focusInstanceLockReasons(focus: FocusOption, instances: FocusInstance[], foci: FocusOption[], selectedClasses: FocusClass[], classes: FocusClass[], budget: FocusBudget, grants: FocusGrant[] = []) {
  const levelReason = focusCreationLevelReason(focus)
  if (levelReason) return [levelReason]
  const grant = grants.find((item) => item.focusId === focus.id)
  if (grant && !focus.repeatable) return [`${focusGrantLabel(grant.grantedBy)}에서 자동 습득합니다. 선택권을 소모하지 않으며 중복 선택할 수 없습니다.`]
  if (!focus.repeatable && instances.some((item) => item.focusId === focus.id)) return []
  const reasons = focusLockReasons(focus, [...instances, ...grants].map((item) => item.focusId), foci, selectedClasses, classes, Infinity)
  if (reasons.length) return reasons
  const parentId = focus.level > 1 ? focus.requirements.find((rule) => rule.condition === 'has_focus')?.id : undefined
  const parent = instances.find((item) => item.focusId === parentId)
  let instanceId = 'preview_focus'
  while (instances.some((item) => item.instanceId === instanceId)) instanceId += '_'
  const candidate = { instanceId, focusId: focus.id, ...(parent ? { parentInstanceId: parent.instanceId } : {}) }
  return evaluateFocusInstances([...instances, candidate], undefined, foci, selectedClasses, budget, grants).issues
}

export function dependentFocusIds(id: string, selected: string[], foci: FocusOption[]) {
  const removed = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const focus of foci) {
      if (!selected.includes(focus.id) || removed.has(focus.id)) continue
      if (focus.requirements.some((rule) => rule.condition === 'has_focus' && removed.has(rule.id))) {
        removed.add(focus.id)
        changed = true
      }
    }
  }
  return selected.filter((item) => item !== id && removed.has(item))
}
