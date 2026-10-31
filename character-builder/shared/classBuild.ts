import { evaluateClassChoices } from './classSelection.js'
import type { SelectableClass } from './classSelection.js'

export type ClassCombinations = {
  default_name: string
  groups: Array<{ name: string; pairs: Array<[string, string]> }>
}

export function classBuildName(source: unknown, classes: Array<SelectableClass & { name: string }>, combinations: ClassCombinations): string {
  const selection = evaluateClassChoices(source, classes)
  if (!selection.complete) return 'Unfinished (invalid class selection)'

  const [first, second] = selection.ids
  if (first === second) return classes.find((option) => option.id === first)!.name

  const group = combinations.groups.find((entry) => entry.pairs.some(([left, right]) =>
    (left === first && right === second) || (left === second && right === first)))
  return group?.name ?? combinations.default_name
}
