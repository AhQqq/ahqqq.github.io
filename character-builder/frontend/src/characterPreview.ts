import { evaluateCreationCore } from '../../shared/characterCreation.js'
import type { CharacterInput } from '../../shared/characterCreation.js'
import type { CharacterData, ClassData } from '../../shared/characterData.js'
import { allocatedAttributes } from './attributeAllocation.js'
import type { AttributeAllocation } from './attributeAllocation.js'

export type PreviewDraft = CharacterInput & AttributeAllocation & { classChoices: string[] }

export function evaluatePreviewCore(draft: PreviewDraft, data: CharacterData) {
  const byId = new Map(data.CLASSES.map((option) => [option.id, option]))
  const classes = draft.classChoices.map((id) => byId.get(id)).filter((option): option is ClassData => Boolean(option))
  // Editing uses restored allocations; the API separately validates raw submitted scores.
  return evaluateCreationCore(draft, data, { attributes: allocatedAttributes(draft), classes })
}
