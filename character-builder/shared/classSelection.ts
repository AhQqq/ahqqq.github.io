export type SelectableClass = {
  id: string
  eng_name: string
  archetype: string
  can_be_full_class: boolean
  incompatible_archetypes?: string[]
  incompatible_classes?: string[]
}

export function classChoiceReason(id: string, otherId: string | undefined, classes: SelectableClass[]) {
  const option = classes.find((item) => item.id === id)
  if (!option) return 'Choose a known class.'
  if (id === otherId && !option.can_be_full_class) {
    return `${option.eng_name} is partial-only and can occupy only one class slot.`
  }
  const other = classes.find((item) => item.id === otherId)
  if (!other) return ''
  const reasons: string[] = []
  // Exclusions belong to the imposing class, not necessarily the candidate.
  for (const [source, partner] of [[option, other], [other, option]] as const) {
    if (source.incompatible_classes?.includes(partner.id)) {
      reasons.push(`${source.eng_name} cannot be paired with ${partner.eng_name}.`)
    }
    if (source.incompatible_archetypes?.includes(partner.archetype)) {
      reasons.push(`${source.eng_name} cannot be paired with ${partner.eng_name} (${partner.archetype} archetype).`)
    }
  }
  return [...new Set(reasons)].sort().join(' ')
}

export function evaluateClassChoices(source: unknown, classes: SelectableClass[]) {
  const issues: string[] = []
  if (!Array.isArray(source) || source.length !== 2) issues.push('Choose exactly two class slots.')
  const ids = [0, 1].map((slot) => {
    const id: unknown = Array.isArray(source) ? source[slot] : undefined
    if (typeof id !== 'string' || !classes.some((option) => option.id === id)) {
      issues.push(`Class slot ${slot === 0 ? 'A' : 'B'}: choose a known class.`)
      return ''
    }
    return id
  })
  if (ids[0] && ids[1]) {
    const reason = classChoiceReason(ids[0], ids[1], classes)
    if (reason) issues.push(reason)
  }
  return { ids, issues, complete: issues.length === 0 }
}
