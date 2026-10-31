import type { FocusTraditionGrant } from './focusTraditions.js'

export type SpellOption = {
  id: string
  name: string
  englishName: string
  category: string
  level: string | number
  description: string
}

export type SpellChoices = [string[], string[]]
export type ClassSlot = 0 | 1
export const CLASS_SLOTS: ClassSlot[] = [0, 1]
export const SPELLS_PER_SLOT = 2
export const HIGH_MAGIC = '\uace0\ub9c8\ubc95'
export const ELEMENTAL_MAGIC = '\uc6d0\uc18c\ub9c8\ubc95'
export const NECROMANCER_MAGIC = '\uc0ac\ub839\ub9c8\ubc95'
const SPELLCASTERS = new Set(['invoker', 'high', 'elem', 'necro'])

export function isSpellcaster(classId: unknown): boolean {
  return typeof classId === 'string' && SPELLCASTERS.has(classId)
}

export function isFirstLevelSpell(spell: Pick<SpellOption, 'level'>): boolean {
  if (typeof spell.level === 'number') return spell.level === 1
  if (typeof spell.level !== 'string') return false
  const match = spell.level.trim().match(/^(\d+)(?:\s*\ub808\ubca8)?$/)
  return Boolean(match && Number(match[1]) === 1)
}

export function spellSchools(classId: unknown, traditions: FocusTraditionGrant[] = []): string[] {
  if (!isSpellcaster(classId)) return []
  const learned = classId === 'invoker' ? traditions.filter((grant) => grant.classId === classId).map((grant) => grant.traditionId) : []
  return [HIGH_MAGIC, ...(classId === 'elem' || learned.includes('elem') ? [ELEMENTAL_MAGIC] : []),
    ...(classId === 'necro' || learned.includes('necro') ? [NECROMANCER_MAGIC] : [])]
}

export function spellSchoolLabel(category: string): string {
  if (category === HIGH_MAGIC) return 'High Magic'
  if (category === ELEMENTAL_MAGIC) return 'Elementalist magic'
  if (category === NECROMANCER_MAGIC) return 'Necromancer magic'
  return category
}

export function canLearnSpell(spell: SpellOption, classId: unknown, traditions: FocusTraditionGrant[] = []): boolean {
  return isFirstLevelSpell(spell) && spellSchools(classId, traditions).includes(spell.category)
}

export function availableSpells(spells: SpellOption[], classId: unknown, traditions: FocusTraditionGrant[] = []): SpellOption[] {
  return spells.filter((spell) => canLearnSpell(spell, classId, traditions))
}

export function normalizeSpellChoices(source: unknown, classIds: string[], spells: SpellOption[], traditions: FocusTraditionGrant[] = []): SpellChoices {
  const byId = new Map(spells.map((spell) => [spell.id, spell]))
  const result: SpellChoices = [[], []]
  const seen = new Set<string>()
  for (const slot of CLASS_SLOTS) {
    const picks: unknown = Array.isArray(source) ? source[slot] : undefined
    if (!Array.isArray(picks)) continue
    for (const id of picks) {
      const spell = typeof id === 'string' ? byId.get(id) : undefined
      if (!spell || seen.has(spell.id) || !canLearnSpell(spell, classIds[slot], traditions) || result[slot].length >= SPELLS_PER_SLOT) continue
      result[slot].push(spell.id)
      seen.add(spell.id)
    }
  }
  return result
}

export function restoreSpellChoices(source: unknown, legacy: unknown, classIds: string[], spells: SpellOption[], traditions: FocusTraditionGrant[] = []) {
  if (source !== undefined) {
    const choices = normalizeSpellChoices(source, classIds, spells, traditions)
    const changed = JSON.stringify(source) !== JSON.stringify(choices)
    return { choices, notice: changed ? 'Saved spell choices were rechecked. Invalid, duplicate, higher-level, or excess selections were removed; review the two picks for each class slot.' : '' }
  }
  const ids: string[] = Array.isArray(legacy) ? [...new Set(legacy.filter((id): id is string => typeof id === 'string'))] : []
  const choices: SpellChoices = [[], []]
  const candidates = ids.map((id) => ({ id, spell: spells.find((spell) => spell.id === id) }))
    .map(({ id, spell }) => ({ id, slots: CLASS_SLOTS.filter((slot) => spell && canLearnSpell(spell, classIds[slot], traditions)) }))
    .filter((candidate) => candidate.slots.length > 0)
    .sort((a, b) => a.slots.length - b.slots.length)
  // Reserve specialist-only picks before assigning High Magic to either class.
  for (const candidate of candidates) {
    const slot = candidate.slots.find((index) => choices[index].length < SPELLS_PER_SLOT)
    if (slot !== undefined) choices[slot].push(candidate.id)
  }
  for (const slot of CLASS_SLOTS) choices[slot].sort((a, b) => ids.indexOf(a) - ids.indexOf(b))
  const removed = ids.length - choices.flat().length
  return { choices, notice: ids.length ? `Older spell selections were assigned to eligible class slots. ${removed ? `${removed} unavailable or excess selection(s) removed. ` : ''}Review each slot's two first-level picks.` : '' }
}

export function spellSelectionReason(spell: SpellOption, slot: ClassSlot, choices: SpellChoices, classIds: string[], traditions: FocusTraditionGrant[] = []) {
  if (!canLearnSpell(spell, classIds[slot], traditions)) return 'This class cannot learn this spell at level 1.'
  if (choices[slot].includes(spell.id)) return ''
  const other: ClassSlot = slot === 0 ? 1 : 0
  if (choices[other].includes(spell.id)) return `Already learned in slot ${other === 0 ? 'A' : 'B'}. A spell can only be learned once.`
  if (choices[slot].length >= SPELLS_PER_SLOT) return 'Both spell picks are used in this slot. Remove one to change your selection.'
  return ''
}

export function toggleSpellChoice(choices: SpellChoices, slot: ClassSlot, id: string, classIds: string[], spells: SpellOption[], traditions: FocusTraditionGrant[] = []): SpellChoices {
  const next: SpellChoices = [[...choices[0]], [...choices[1]]]
  if (next[slot].includes(id)) {
    next[slot] = next[slot].filter((selected) => selected !== id)
    return next
  }
  const spell = spells.find((item) => item.id === id)
  if (!spell || spellSelectionReason(spell, slot, choices, classIds, traditions)) return choices
  next[slot].push(id)
  return next
}

export function evaluateSpellChoices(source: unknown, classIds: string[], spells: SpellOption[], legacy?: unknown, traditions: FocusTraditionGrant[] = []) {
  const issues: string[] = []
  const selected: SpellChoices = [[], []]
  const byId = new Map(spells.map((spell) => [spell.id, spell]))
  const seen = new Set<string>()
  const input = source === undefined ? [[], []] : source
  if (!Array.isArray(input) || input.length !== 2) issues.push('Spell selections must contain exactly two class-slot arrays.')
  if (legacy !== undefined && (!Array.isArray(legacy) || legacy.length > 0)) {
    issues.push('Flat spell selections are no longer valid. Reload the builder to assign spells to their class slots.')
  }
  const slots = CLASS_SLOTS.map((slot) => {
    const label = `Spell slot ${slot === 0 ? 'A' : 'B'}`
    const required = isSpellcaster(classIds[slot]) ? SPELLS_PER_SLOT : 0
    const startIssues = issues.length
    const raw: unknown = Array.isArray(input) ? input[slot] : undefined
    const picks: unknown[] = Array.isArray(raw) ? raw : []
    if (!Array.isArray(raw)) issues.push(`${label}: provide a spell ID array.`)
    if (picks.length !== required) issues.push(`${label}: choose exactly ${required} first-level spells for this class.`)
    picks.forEach((id, index) => {
      const spell = typeof id === 'string' ? byId.get(id) : undefined
      if (!spell) {
        issues.push(`${label}: unknown or malformed spell ID.`)
        return
      }
      if (seen.has(spell.id)) {
        issues.push(`${label}: ${spell.englishName || spell.name} is selected more than once across the class slots.`)
        return
      }
      seen.add(spell.id)
      if (!isFirstLevelSpell(spell)) issues.push(`${label}: only first-level spells can be learned.`)
      else if (!spellSchools(classIds[slot], traditions).includes(spell.category)) issues.push(`${label}: ${spellSchoolLabel(spell.category)} is not available to this class.`)
      else if (index < required) selected[slot].push(spell.id)
    })
    return { slot, required, selected: selected[slot], complete: issues.length === startIssues }
  })
  return { complete: issues.length === 0, issues, slots, selected, required: slots.reduce((sum, slot) => sum + slot.required, 0) }
}
