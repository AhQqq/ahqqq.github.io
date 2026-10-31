import { evaluateClassChoices } from './classSelection.js'
import type { SelectableClass } from './classSelection.js'
import type { FocusTraditionGrant } from './focusTraditions.js'

export type ArtOption = { id: string; name: string; eng_name: string; class_id: string; description: string; minimum_hit_dice?: string; unarmored_base_ac?: number; focus_grants?: string[] }
export type ArtClass = SelectableClass & { arts: boolean }
export type ArtGroup = { id?: string; label?: string; choose: number; options: string[]; exclusive?: boolean }
export type ArtRule = { fixed: string[]; choose: number; choice_groups: ArtGroup[] }
export type StartingArts = Array<{ character_level: number; classes: Record<string, { partial?: ArtRule; full?: ArtRule }> }>
export type ClassArtChoices = { groups: Record<string, string[]>; chosen: string[] }
export type ArtChoices = Record<string, ClassArtChoices>
export type ArtPlan = {
  focusGrant?: string
  source?: FocusTraditionGrant
  classId: string
  name: string
  mode: 'partial' | 'full'
  fixed: string[]
  choose: number
  groups: Array<ArtGroup & { key: string }>
  options: ArtOption[]
  issues: string[]
  configured: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function own(value: unknown, key: string): unknown {
  return record(value) && Object.hasOwn(value, key) ? value[key] : undefined
}

export function artGroupKey(group: ArtGroup, index: number) {
  return group.id ? `id:${group.id}` : `index:${index}`
}

export function getArtPlans(classIds: string[], classes: ArtClass[], rules: StartingArts, arts: ArtOption[], traditions: FocusTraditionGrant[] = [], appliedFoci: Array<{ focusId: string }> = []): ArtPlan[] {
  const level = rules.find((entry) => entry.character_level === 1)
  const plans = [...new Set(classIds.slice(0, 2))].flatMap<ArtPlan>((id) => {
    const option = classes.find((item) => item.id === id)
    if (!option?.arts) return []
    const mode = classIds.slice(0, 2).filter((item) => item === id).length === 2 ? 'full' : 'partial'
    const entries = level && Object.hasOwn(level.classes, id) ? level.classes[id] : undefined
    const rule = entries?.[mode]
    const issues: string[] = []
    const options = arts.filter((art) => art.class_id === id)
    const ids = new Set(options.map((art) => art.id))
    if (mode === 'full' && !option.can_be_full_class) issues.push(`${option.eng_name} is partial-only; choose a different second class.`)
    if (!rule) issues.push(`${option.eng_name}: starting arts not configured for this ${mode} class.`)
    if (!options.length) issues.push(`${option.eng_name}: art catalogue is missing.`)
    const fixed = rule?.fixed ?? []
    const groups = (rule?.choice_groups ?? []).map((group, index) => ({ ...group, key: artGroupKey(group, index) }))
    const choose = rule?.choose ?? 0
    if (rule) {
      const counts = [choose, ...groups.map((group) => group.choose)]
      if (counts.some((count) => !Number.isSafeInteger(count) || count < 0)) issues.push('Art allowance counts must be nonnegative integers.')
      if (new Set(fixed).size !== fixed.length || new Set(groups.map((group) => group.key)).size !== groups.length) {
        issues.push('Starting arts contain duplicate fixed grants or choice-group IDs.')
      }
      for (const artId of [...fixed, ...groups.flatMap((group) => group.options)]) {
        if (!ids.has(artId)) issues.push(`${option.eng_name}: unknown art reference ${artId}.`)
      }
      for (const group of groups) {
        if (new Set(group.options.filter((artId) => !fixed.includes(artId))).size < group.choose) {
          issues.push('A restricted art group has too few distinct, non-fixed options.')
        }
      }
      if (ids.size - fixed.length < choose + groups.reduce((sum, group) => sum + group.choose, 0)) {
        issues.push('The art catalogue has too few distinct options for this allowance.')
      }
    }
    return [{ classId: id, name: option.eng_name, mode, fixed, groups, choose, options, issues, configured: issues.length === 0 }]
  })
  if (evaluateClassChoices(classIds, classes).complete) {
    for (const grant of traditions) {
      const count = classIds.filter((id) => id === grant.classId).length
      if (!count || grant.mode !== (count === 2 ? 'full' : 'partial') || plans.some((plan) => plan.classId === grant.traditionId)) continue
      // Reuse the tradition's starting rules without changing the character's classes.
      const ids = grant.mode === 'full' ? [grant.traditionId, grant.traditionId] : [grant.traditionId]
      const borrowed = getArtPlans(ids, classes, rules, arts)[0]
      const name = classes.find((item) => item.id === grant.traditionId)?.eng_name ?? grant.traditionId
      plans.push(borrowed ? { ...borrowed, source: grant } : {
        classId: grant.traditionId, name, mode: grant.mode, source: grant, fixed: [], choose: 0,
        groups: [], options: [], configured: false, issues: [`${name}: art catalogue is missing.`],
      })
    }
  }
  if (evaluateClassChoices(classIds, classes).complete && appliedFoci.some((focus) => focus.focusId === 'kitsune_beastfolk1')) {
    const existing = plans.find((plan) => plan.classId === 'elem')
    if (existing) {
      existing.focusGrant = 'kitsune_beastfolk1'
      if (existing.fixed.includes('elemental_sparks')) existing.choose += 1
      else existing.fixed = [...existing.fixed, 'elemental_sparks']
    } else {
      const options = arts.filter((art) => art.class_id === 'elem')
      const configured = options.some((art) => art.id === 'elemental_sparks')
      plans.push({ classId: 'elem', name: classes.find((item) => item.id === 'elem')?.eng_name ?? 'Elementalist',
        mode: 'partial', focusGrant: 'kitsune_beastfolk1', fixed: ['elemental_sparks'], choose: 0, groups: [], options,
        configured, issues: configured ? [] : ['Elementalist: unknown art reference elemental_sparks.'] })
    }
  }
  return plans
}

export function artChoiceReason(plan: ArtPlan, choices: ClassArtChoices, groupKey: string | null, id: string) {
  if (!plan.configured) return 'Starting arts are not configured for this class selection.'
  const group = groupKey === null ? undefined : plan.groups.find((item) => item.key === groupKey)
  if (groupKey !== null && !group) return 'Unknown art choice group.'
  if (!plan.options.some((art) => art.id === id)) return 'This art does not belong to this class.'
  if (group && !group.options.includes(id)) return 'This art is not an option in this choice group.'
  if (plan.fixed.includes(id)) return 'Already granted by class; it does not use a pick.'
  const selected = groupKey === null ? choices.chosen : choices.groups[groupKey] ?? []
  if (selected.includes(id)) return ''
  if (choices.chosen.includes(id) || Object.values(choices.groups).some((ids) => ids.includes(id))) {
    return 'Already selected in another art choice for this class.'
  }
  if (plan.groups.some((item) => item.exclusive && item.key !== groupKey && item.options.includes(id))) {
    return 'This art can only be taken through its exclusive choice group.'
  }
  if (selected.length >= (group?.choose ?? plan.choose)) return 'All picks in this section are used. Remove an art to change your selection.'
  return ''
}

export function evaluateArtChoices(source: unknown, classIds: string[], classes: ArtClass[], rules: StartingArts, arts: ArtOption[], traditions: FocusTraditionGrant[] = [], appliedFoci: Array<{ focusId: string }> = []) {
  const plans = getArtPlans(classIds, classes, rules, arts, traditions, appliedFoci)
  const issues = [...evaluateClassChoices(classIds, classes).issues]
  const selected: ArtChoices = {}
  const input = source === undefined ? {} : source
  if (!record(input)) issues.push('Art selections must be an object keyed by class ID.')
  if (record(input)) {
    for (const id of Object.keys(input)) {
      if (!plans.some((plan) => plan.classId === id)) issues.push(`Art selections supplied for unselected or non-art class: ${id}.`)
    }
  }
  const results = plans.map((plan) => {
    const classIssues = [...plan.issues]
    const choices: ClassArtChoices = { groups: {}, chosen: [] }
    if (plan.configured) selected[plan.classId] = choices
    const raw = own(input, plan.classId)
    if (raw !== undefined && !record(raw)) classIssues.push('Art choices for a class must be an object.')
    if (record(raw) && Object.keys(raw).some((key) => key !== 'groups' && key !== 'chosen')) {
      classIssues.push('Only groups and chosen may be submitted; fixed grants are derived from the rules.')
    }
    const rawGroups = own(raw, 'groups')
    if (rawGroups !== undefined && !record(rawGroups)) classIssues.push('Art choice groups must be an object.')
    if (record(rawGroups)) {
      for (const key of Object.keys(rawGroups)) {
        if (!plan.groups.some((group) => group.key === key)) classIssues.push(`Unknown art choice group: ${key}.`)
      }
    }
    function readPicks(value: unknown, key: string | null, count: number, label: string) {
      const picks = value === undefined ? [] : value
      if (!Array.isArray(picks)) {
        classIssues.push(`${label}: provide an array of art IDs.`)
        return
      }
      if (picks.length !== count) classIssues.push(`${label}: choose exactly ${count} art(s).`)
      for (const id of picks) {
        const target = key === null ? choices.chosen : choices.groups[key]!
        const reason = typeof id !== 'string' ? 'Malformed art ID.'
          : target.includes(id) ? 'An art cannot be selected twice.'
          : artChoiceReason(plan, choices, key, id)
        if (reason) classIssues.push(`${label}: ${reason}`)
        else target.push(id)
      }
    }
    if (plan.configured) {
      // Resolve restricted groups first, so they retain priority during draft cleanup.
      for (const [index, group] of plan.groups.entries()) {
        choices.groups[group.key] = []
        readPicks(own(rawGroups, group.key), group.key, group.choose, group.label || `Restricted choice ${index + 1}`)
      }
      readPicks(own(raw, 'chosen'), null, plan.choose, 'Additional arts')
    }
    const fixed = plan.configured ? [...plan.fixed] : []
    const learned = [...fixed, ...Object.values(choices.groups).flat(), ...choices.chosen]
    const required = plan.configured ? fixed.length + plan.choose + plan.groups.reduce((sum, group) => sum + group.choose, 0) : 0
    issues.push(...classIssues.map((issue) => issue.startsWith(plan.name) ? issue : `${plan.name}: ${issue}`))
    return { classId: plan.classId, mode: plan.mode, ...(plan.source ? { source: plan.source } : {}), ...(plan.focusGrant ? { focusGrant: plan.focusGrant } : {}), fixed, choices, learned, required, complete: classIssues.length === 0, issues: classIssues }
  })
  return { complete: issues.length === 0, issues, selected, classes: results, required: results.reduce((sum, result) => sum + result.required, 0) }
}

export function normalizeArtChoices(source: unknown, classIds: string[], classes: ArtClass[], rules: StartingArts, arts: ArtOption[], traditions: FocusTraditionGrant[] = [], appliedFoci: Array<{ focusId: string }> = []): ArtChoices {
  return evaluateArtChoices(source, classIds, classes, rules, arts, traditions, appliedFoci).selected
}

export function restoreArtChoices(source: unknown, classIds: string[], classes: ArtClass[], rules: StartingArts, arts: ArtOption[], traditions: FocusTraditionGrant[] = [], appliedFoci: Array<{ focusId: string }> = []) {
  const choices = normalizeArtChoices(source, classIds, classes, rules, arts, traditions, appliedFoci)
  return { choices, notice: source !== undefined && JSON.stringify(source) !== JSON.stringify(choices)
    ? 'Saved arts were rechecked. Invalid, duplicate, or excess choices were removed; review your class arts.' : '' }
}

export function toggleArtChoice(source: ArtChoices, classId: string, groupKey: string | null, id: string,
  classIds: string[], classes: ArtClass[], rules: StartingArts, arts: ArtOption[], traditions: FocusTraditionGrant[] = [], appliedFoci: Array<{ focusId: string }> = []): ArtChoices {
  const choices = normalizeArtChoices(source, classIds, classes, rules, arts, traditions, appliedFoci)
  const plan = getArtPlans(classIds, classes, rules, arts, traditions, appliedFoci).find((item) => item.classId === classId)
  const current = choices[classId]
  if (!plan || !current) return choices
  const picks = groupKey === null ? current.chosen : current.groups[groupKey]
  if (!picks) return choices
  const next = picks.includes(id) ? picks.filter((item) => item !== id)
    : artChoiceReason(plan, current, groupKey, id) ? picks : [...picks, id]
  if (groupKey === null) current.chosen = next
  else current.groups[groupKey] = next
  return choices
}
