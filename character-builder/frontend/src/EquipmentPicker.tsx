import { RulesLink } from './RulesLink'
import { ko } from './korean'
import { evaluateStartingEquipment } from '../../shared/startingEquipment'
import type { EquipmentDefinition, EquipmentEvaluation, EquipmentPackage, GrantedEquipment, StartingEquipmentChoice } from '../../shared/startingEquipment'

export function EquipmentTable({ items, caption }: { items: GrantedEquipment[]; caption: string }) {
  return <table className="equipment-table">
    <caption>{caption}</caption>
    <thead><tr><th scope="col">장비</th><th scope="col">수량</th><th scope="col">합계 하중</th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.id}>
      <th scope="row">{item.name}{item.type === 'bundle' && <small>묶음 전체</small>}</th>
      <td>{item.count}</td><td>{item.encumbrance === null ? '미기재' : item.encumbrance}</td>
    </tr>)}</tbody>
  </table>
}

export function EquipmentPicker({ choice, packages, equipment, evaluation, notice, onChange, onRoll }: {
  choice: StartingEquipmentChoice
  packages: EquipmentPackage[]
  equipment: EquipmentDefinition[]
  evaluation: EquipmentEvaluation
  notice: string
  onChange: (choice: StartingEquipmentChoice) => void
  onRoll: () => void
}) {
  return <section className="card equipment-selection creation-section" id="stage-equipment" aria-labelledby="equipment-selection-title">
    <div className="card-header"><div><h2 id="equipment-selection-title">시작 장비 선택</h2></div><RulesLink topic="equipment" /></div>
    <p className="support-text">꾸러미 또는 3d6 × 10은화 중 하나를 받습니다. 방식을 바꾸면 구매·착용 내역이 초기화됩니다.</p>
    {notice && <p className="spell-notice" role="status">{ko(notice)}</p>}
    <div className="segmented equipment-method" role="group" aria-label="시작 장비 획득 방식">
      <button type="button" className={choice.method === 'package' ? 'active' : ''} aria-pressed={choice.method === 'package'}
        onClick={() => { if (choice.method !== 'package') onChange({ method: 'package', packageId: '' }) }}>꾸러미 선택</button>
      <button type="button" className={choice.method === 'silver' ? 'active' : ''} aria-pressed={choice.method === 'silver'}
        onClick={() => { if (choice.method !== 'silver') onChange({ method: 'silver', rolls: [] }) }}>시작 은화 굴리기</button>
    </div>
    {choice.method === 'package' && <div className="focus-grid equipment-packages">
      {packages.map((option) => {
        const preview = evaluateStartingEquipment({ method: 'package', packageId: option.id }, packages, equipment)
        const selected = choice.packageId === option.id
        return <article key={option.id} className={`equipment-package${selected ? ' is-selected' : ''}`} aria-label={option.name}>
          <h3>{option.name}</h3><p className="focus-english-name">{option.englishName}</p>
          {preview.complete ? <>
            <p className="equipment-package-meta">장비 {preview.items.length}종 / {preview.silver}은화</p>
            <details className="equipment-details">
              <summary>꾸러미 내용 보기</summary>
              <EquipmentTable items={preview.items} caption={option.name} />
              <p className="support-text">표기 하중 합계: {preview.encumbrance.listed}{!preview.encumbrance.complete && ' (일부만 합산; 미기재 하중은 0이 아닙니다)' }.</p>
            </details>
          </> : <ul className="issue-list">{preview.issues.map((issue) => <li key={issue}>{ko(issue)}</li>)}</ul>}
          <button type="button" className={`focus-level-button${selected ? ' selected' : ''}`} aria-pressed={selected} disabled={!preview.complete}
            onClick={() => onChange({ method: 'package', packageId: selected ? '' : option.id })}>
            {selected ? '꾸러미 선택 해제' : `${option.name} 선택`}
          </button>
        </article>
      })}
    </div>}
    {choice.method === 'silver' && <div className="roll-card">
      <h3>시작 자금</h3>
      <button type="button" onClick={onRoll}><span className="material-symbols-outlined ui-icon" aria-hidden="true">casino</span>{choice.rolls.length ? '3d6 다시 굴리기 (구매·착용 초기화)' : '3d6으로 시작 은화 굴리기'}</button>
      <div role="status" aria-live="polite">
        {evaluation.complete ? <p className="equipment-roll-result">({choice.rolls.join(' + ')}) &times; 10 = <strong>{evaluation.silver}은화</strong></p>
          : <p className="support-text">아직 굴리지 않았습니다.</p>}
      </div>
      <p className="support-text">아래에서 필요한 장비를 구매하고 착용하세요.</p>
    </div>}
    {evaluation.issues.length > 0 && <ul className="issue-list" role="status">{evaluation.issues.map((issue) => <li key={issue}>{ko(issue)}</li>)}</ul>}
  </section>
}
