import { ATTRIBUTE_KEYS, ARRAY_VALUES } from '../../shared/attributes.js'
import type { AttributeKey } from '../../shared/attributes.js'
export { ATTRIBUTE_KEYS, ARRAY_VALUES } from '../../shared/attributes.js'
export type { AttributeKey } from '../../shared/attributes.js'

export type AttributeAllocation = {
  attributeMethod: 'array' | 'rolled'
  // Original scores stay intact when the optional replacement moves or is removed.
  attributes: Record<AttributeKey, number>
  attributeOverride: AttributeKey | ''
}

export function createArrayAllocation(): AttributeAllocation {
  return {
    attributeMethod: 'array',
    attributes: { STR: 14, DEX: 12, CON: 11, INT: 10, WIS: 9, CHA: 7 },
    attributeOverride: '',
  }
}

export function rollAttributeAllocation(rollDie = () => Math.floor(Math.random() * 6) + 1): AttributeAllocation {
  const attributes = {} as Record<AttributeKey, number>
  for (const key of ATTRIBUTE_KEYS) attributes[key] = rollDie() + rollDie() + rollDie()
  return { attributeMethod: 'rolled', attributes, attributeOverride: '' }
}

export function swapArrayScore(allocation: AttributeAllocation, key: AttributeKey, value: number): AttributeAllocation {
  if (allocation.attributeMethod !== 'array' || !ARRAY_VALUES.some((score) => score === value)) return allocation
  const other = ATTRIBUTE_KEYS.find((attribute) => allocation.attributes[attribute] === value)
  if (!other || other === key) return allocation
  return {
    ...allocation,
    attributes: { ...allocation.attributes, [key]: value, [other]: allocation.attributes[key] },
  }
}

export function selectAttributeOverride(allocation: AttributeAllocation, key: string): AttributeAllocation {
  if (allocation.attributeMethod !== 'rolled' || (key !== '' && !ATTRIBUTE_KEYS.some((attribute) => attribute === key))) return allocation
  return { ...allocation, attributeOverride: key as AttributeKey | '' }
}

export function allocatedAttributes(allocation: AttributeAllocation): Record<AttributeKey, number> {
  return allocation.attributeMethod === 'rolled' && allocation.attributeOverride
    ? { ...allocation.attributes, [allocation.attributeOverride]: 14 }
    : { ...allocation.attributes }
}

export function restoreAttributeAllocation(saved: Partial<AttributeAllocation>): AttributeAllocation {
  const fallback = createArrayAllocation()
  const scores = saved.attributes
  if (!scores || !ATTRIBUTE_KEYS.every((key) => Number.isInteger(scores[key]) && scores[key] >= 3 && scores[key] <= 18)) return fallback
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, scores[key]])) as Record<AttributeKey, number>
  if (saved.attributeMethod === 'rolled') {
    return selectAttributeOverride({ attributeMethod: 'rolled', attributes, attributeOverride: '' }, saved.attributeOverride ?? '')
  }
  const values = Object.values(attributes).sort((a, b) => b - a)
  if (!ARRAY_VALUES.every((score, index) => values[index] === score)) return fallback
  return { attributeMethod: 'array', attributes, attributeOverride: '' }
}
