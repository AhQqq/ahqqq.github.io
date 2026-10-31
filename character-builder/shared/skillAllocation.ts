export type SkillGrant = {
  key: string
  skillId: string
  scope: 'background' | 'class' | 'focus' | 'freeSkill'
  kind: 'fixed' | 'choice'
  label: string
}

export type SkillState = {
  id: string
  level: number
  allotments: number
  advancementPoints: number
}

export type SkillIssue = {
  key: string
  scope: SkillGrant['scope']
  message: string
}

export function evaluateSkillGrants(grants: SkillGrant[], skillIds: string[]) {
  const states: Record<string, SkillState> = Object.fromEntries(skillIds.map((id) => [
    id, { id, level: -1, allotments: 0, advancementPoints: 0 },
  ]))
  const choiceCounts: Record<string, Record<string, number>> = {}
  const issues: SkillIssue[] = []
  for (const grant of grants) {
    if (grant.kind === 'choice') {
      choiceCounts[grant.key] = Object.fromEntries(Object.values(states).map((state) => [state.id, state.allotments]))
    }
    if (!grant.skillId) continue
    const state = Object.hasOwn(states, grant.skillId) ? states[grant.skillId] : undefined
    if (!state) {
      issues.push({ key: grant.key, scope: grant.scope, message: `${grant.label}: unknown skill ${grant.skillId}.` })
      continue
    }
    if (grant.kind === 'choice' && state.allotments >= 2) {
      issues.push({ key: grant.key, scope: grant.scope, message: `${grant.label}: ${grant.skillId} already has two allotments. Choose a different skill; starting skills cannot exceed level 1.` })
      continue
    }
    state.allotments++
    state.level = Math.min(1, state.allotments - 1)
    if (state.allotments === 3 && grant.scope === 'focus' && grant.kind === 'fixed') {
      state.advancementPoints = 2
    } else if (state.allotments > 2) {
      issues.push({ key: grant.key, scope: grant.scope, message: `${grant.label}: ${grant.skillId} has allotment ${state.allotments}. This forced overflow is not defined in PROJECT_RULES.md; manual review is required. Level remains 1 and no extra advancement points are awarded.` })
    }
  }
  return { states, choiceCounts, issues, complete: issues.length === 0 }
}

export type SkillAllocation = ReturnType<typeof evaluateSkillGrants>

export function skillChoiceReason(allocation: SkillAllocation, key: string, skillId: string) {
  return (allocation.choiceCounts[key]?.[skillId] ?? 0) >= 2
    ? 'Already has two allotments (level 1); choose another skill.' : ''
}

type SkillClass = { id: string; eng_name: string; bonus?: Array<{ action: string; id?: string; count?: number; exclude?: { ids?: string[] } }> }

export type ClassBonusChoices = Record<string, Record<string, string[]>>
export type ClassSkillGrant = SkillGrant & { classId: string; bonusIndex: number; slotIndex: number; excludedIds?: string[] }

function readClassChoice(source: unknown, classId: string, bonusIndex: number, slotIndex: number): string {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return ''
  const choices = (source as Record<string, unknown>)[classId]
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) return ''
  const slots = (choices as Record<string, unknown>)[String(bonusIndex)]
  return Array.isArray(slots) && typeof slots[slotIndex] === 'string' ? slots[slotIndex] : ''
}

export function classSkillGrants(classes: SkillClass[], choices?: unknown): ClassSkillGrant[] {
  // Duplicate slots describe one full class, not two copies of its class feature.
  const grants = [...new Map(classes.map((option) => [option.id, option])).values()].flatMap((option) =>
    (option.bonus ?? []).flatMap((bonus, index): ClassSkillGrant[] => {
      if (bonus.action !== 'fixed_skill' && bonus.action !== 'choice_skill') return []
      if (bonus.action === 'fixed_skill' && !bonus.id) return []
      const count = bonus.count ?? 1
      if (!Number.isInteger(count) || count < 1) return []
      return Array.from({ length: count }, (_, slot) => ({
        key: `class:${option.id}:${index}:${slot}`, scope: 'class',
        classId: option.id, bonusIndex: index, slotIndex: slot,
        skillId: bonus.action === 'fixed_skill' ? bonus.id! : (bonus.exclude?.ids?.includes(readClassChoice(choices, option.id, index, slot)) ? '' : readClassChoice(choices, option.id, index, slot)),
        ...(bonus.action === 'choice_skill' && bonus.exclude?.ids ? { excludedIds: bonus.exclude.ids } : {}),
        kind: bonus.action === 'fixed_skill' ? 'fixed' : 'choice',
        label: `${option.eng_name} skill bonus${bonus.action === 'choice_skill' ? ` (bonus ${index + 1}, choice ${slot + 1})` : ''}`,
      }))
    }))
  // Fixed grants from either class must count before any voluntary class choice.
  return [...grants.filter((grant) => grant.kind === 'fixed'), ...grants.filter((grant) => grant.kind === 'choice')]
}

export function normalizeClassBonusChoices(source: unknown, classes: SkillClass[]): ClassBonusChoices {
  const result: ClassBonusChoices = {}
  for (const grant of classSkillGrants(classes, source)) {
    if (grant.kind !== 'choice') continue
    const choices = result[grant.classId] ??= {}
    const slots = choices[String(grant.bonusIndex)] ??= []
    slots[grant.slotIndex] = grant.skillId
  }
  return result
}

export function evaluateCreationSkills(backgroundGrants: SkillGrant[], classes: SkillClass[], focusGrants: SkillGrant[], freeSkill: string, skillIds: string[], classBonusChoices?: unknown) {
  const classGrants = classSkillGrants(classes, classBonusChoices)
  // Creation-step order is authoritative, not the order UI controls were clicked.
  const allocation = evaluateSkillGrants([
    ...backgroundGrants, ...classGrants, ...focusGrants,
    { key: 'free-skill', skillId: freeSkill, scope: 'freeSkill', kind: 'choice', label: 'Free skill' },
  ], skillIds)
  for (const grant of classGrants) {
    if (grant.kind === 'choice' && !grant.skillId) {
      allocation.issues.push({ key: grant.key, scope: 'class', message: `${grant.label}: choose a skill.` })
    }
  }
  return { ...allocation, complete: allocation.issues.length === 0 }
}
