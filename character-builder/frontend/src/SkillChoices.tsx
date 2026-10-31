import { ko } from './korean'
import { skillChoiceReason } from '../../shared/skillAllocation'
import type { SkillAllocation } from '../../shared/skillAllocation'

export function SkillChoiceOptions({ options, allocation, choiceKey, allocationForOption, excludedIds = [], excludedReason = '이 보너스에서 이미 선택함' }: {
  options: Array<{ id: string; label: string }>
  allocation: SkillAllocation
  choiceKey: string
  allocationForOption?: (id: string) => SkillAllocation
  excludedIds?: string[]
  excludedReason?: string
}) {
  return options.map((option) => {
    const effectiveAllocation = allocationForOption?.(option.id) ?? allocation
    const duplicate = excludedIds.includes(option.id)
    const reason = duplicate ? excludedReason : skillChoiceReason(effectiveAllocation, choiceKey, option.id)
    const previous = effectiveAllocation.choiceCounts[choiceKey]?.[option.id] ?? 0
    return <option key={option.id} value={option.id} disabled={Boolean(reason)}>
      {option.label}{reason ? ` - 선택 불가: ${duplicate ? ko(reason ?? '') : '시작 레벨 상한 1'}` : ` - 선택 후 ${Math.min(1, previous)}레벨`}
    </option>
  })
}

export function SkillChoiceFeedback({ allocation, choiceKey }: { allocation: SkillAllocation; choiceKey: string }) {
  const issue = allocation.issues.find((item) => item.key === choiceKey)
  return <small id={`${choiceKey}-feedback`} className={issue ? 'skill-choice-error' : 'skill-choice-hint'} aria-live="polite">
    {issue ? ko(issue.message) : null}
  </small>
}
