import { SAVE_IDS } from '../../shared/savingThrows'
import type { SaveModifiers, SavingThrows } from '../../shared/savingThrows'
import { nameFor } from './korean'
import { focusGrantLabel } from './focusSelection'

const signed = (value: number) => value >= 0 ? `+${value}` : String(value)

export function saveModifierLabel(modifiers: SaveModifiers) {
  const first = modifiers.physical
  if (first && SAVE_IDS.every((id) => modifiers[id] === first)) return `모든 내성 ${signed(first)}`
  return SAVE_IDS.filter((id) => modifiers[id]).map((id) => `${nameFor(id)} ${signed(modifiers[id]!)}`).join(', ')
}

export function SaveSummary({ saves }: { saves: SavingThrows }) {
  const changed = SAVE_IDS.filter((id) => saves.sources.some((source) => source.saves[id]))
  return <>
    {saves.sources.length > 0 && <div className="info-panel" aria-label="상시 내성 보정 출처">
      <strong>상시 내성굴림 보정 · 목표값에 반영됨</strong>
      <ul>{saves.sources.map((source) => <li key={source.instanceId}>
        {source.name}{source.grantedBy && ` (${focusGrantLabel(source.grantedBy)})`}: {saveModifierLabel(source.saves)}
      </li>)}</ul>
      {changed.map((id) => <p className="support-text" key={id}>
        {nameFor(id)}: 능력치 기준 {saves.attributeTargets[id]} → 최종 목표값 {saves.targets[id]}
      </p>)}
    </div>}
    {saves.conditional.length > 0 && <div className="info-panel" aria-label="조건부 내성 보정 출처">
      <strong>조건부 내성굴림 보정 · 목표값에 미반영</strong>
      <ul>{saves.conditional.map((source, index) => <li key={`${source.instanceId}-${index}`}>
        {source.name}{source.grantedBy && ` (${focusGrantLabel(source.grantedBy)})`}: {saveModifierLabel(source.saves)} · {source.condition}{source.scope && ` (${source.scope})`}
      </li>)}</ul>
    </div>}
  </>
}
