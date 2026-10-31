import { ko, rulesText } from './korean'
import type { AbilitySource, AbilityEvaluation } from '../../shared/abilities'
import type { FocusInstance } from '../../shared/focusCreation'
import { focusInstanceLabel } from './focusSelection'
import type { FocusOption } from './focusSelection'

export function AbilitySheet({ evaluation, classes, foci, instances }: {
  evaluation: AbilityEvaluation
  classes: Array<{ id: string; name: string }>
  foci: FocusOption[]
  instances: FocusInstance[]
}) {
  function sourceLabel(source: AbilitySource) {
    if (source.type === 'focus') {
      const instance = instances.find((item) => item.instanceId === source.instanceId)
      return `${instance ? focusInstanceLabel(instance, instances, foci) : '알 수 없는 포커스'} (포커스 부여)`
    }
    const names = source.classIds.map((id) => classes.find((option) => option.id === id)?.name ?? '알 수 없는 클래스')
    if (source.type === 'class') return `${names[0]} (클래스 부여)`
    if (source.classIds[0] === source.classIds[1]) return `순수 ${names[0]}`
    return `${names.join(' / ')} (클래스 조합)`
  }

  return <section className="summary-block class-abilities" aria-label="능력">
    <h3>능력</h3>
    {evaluation.issues.length > 0 && <div className="skill-review" role="status">
      <strong>능력 부여를 확인하세요</strong>
      <ul>{evaluation.issues.map((issue, index) => <li key={index}>{ko(issue)}</li>)}</ul>
    </div>}
    {evaluation.complete && evaluation.abilities.length === 0 && <p>현재 선택으로 부여되는 별도 능력이 없습니다.</p>}
    {evaluation.abilities.map((ability) => <article className="class-ability" key={ability.id}>
      <h4>{ability.name}</h4>
      <p className="focus-english-name">{ability.englishName}</p>
      <p className="support-text">획득 경로: {ability.sources.map(sourceLabel).join('; ')}</p>
      {Boolean(ability.manual_review?.length) && <div className="skill-review">
        <strong>규칙 문구 또는 효과 확인 필요</strong>
        <ul>{ability.manual_review!.map((note, index) => <li key={index}>{ko(note)}</li>)}</ul>
      </div>}
      <p className="class-ability-description" lang="ko">{rulesText(ability.desc)}</p>
    </article>)}
  </section>
}
