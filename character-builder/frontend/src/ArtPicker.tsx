import { RulesLink } from './RulesLink'
import { SelectionStatus, selectionReason } from './SelectionStatus'
import type { SelectionState } from './SelectionStatus'
import { ko, nameFor, rulesText } from './korean'
import { artChoiceReason } from '../../shared/artSelection'
import type { ArtChoices, ArtOption, ArtPlan, ClassArtChoices } from '../../shared/artSelection'

type Props = {
  plans: ArtPlan[]
  choices: ArtChoices
  notice: string
  onToggle: (classId: string, groupKey: string | null, id: string) => void
}

function ArtHeading({ art, state = 'available', reason }: { art: ArtOption; state?: SelectionState; reason?: string }) {
  return <div className="art-option-heading">
    <div className="art-option-title"><h5>{art.name}</h5><p className="focus-english-name">{art.eng_name}</p></div>
    <SelectionStatus state={state} name={art.name} detail={reason ? selectionReason(reason) : undefined} />
  </div>
}

function ArtDescription({ art }: { art: ArtOption }) {
  return <details className="spell-description">
    <summary>전체 설명 읽기</summary>
    <p>{rulesText(art.description) || '등록된 설명이 없습니다.'}</p>
    {art.minimum_hit_dice && <p>생성 시 HD 최솟값 {art.minimum_hit_dice}을 적용합니다.</p>}
    {art.unarmored_base_ac !== undefined && <p>갑옷·방패가 없으면 기본 AC {art.unarmored_base_ac}. 다른 기본 AC와 높은 값을 사용한 뒤 민첩 수정치를 더합니다.</p>}
    {Boolean(art.focus_grants?.length) && <p className="support-text">생성 시 자동 습득: {art.focus_grants!.map(nameFor).join(', ')} 1레벨.
      선택권을 소모하지 않으며 중복 선택권은 반환합니다. 2레벨 상승과 다른 포커스로의 대체는 이 생성기에서 적용하지 않습니다.</p>}
  </details>
}

export function ArtPicker({ plans, choices, notice, onToggle }: Props) {
  function choiceSection(plan: ArtPlan, current: ClassArtChoices, key: string | null,
    label: string, required: number, options: ArtOption[]) {
    const selected = key === null ? current.chosen : current.groups[key] ?? []
    return <section className="art-choice-section" key={key ?? 'additional'} aria-label={`${nameFor(plan.classId)}: ${ko(label)}`}>
      <div className="focus-category-header">
        <h4>{ko(label)}</h4><span role="status">{selected.length}/{required}개 선택</span>
      </div>
      <div className="focus-grid">
        {options.map((art) => {
          const picked = selected.includes(art.id)
          const reason = artChoiceReason(plan, current, key, art.id)
          const locked = !picked && Boolean(reason)
          return <article key={art.id} className={`spell-option art-option${picked ? ' is-learned' : ''}${locked ? ' is-unavailable' : ''}`} data-art-id={art.id}>
            <ArtHeading art={art} state={picked ? 'selected' : locked ? 'locked' : 'available'} reason={locked ? reason : undefined} />
            <ArtDescription art={art} />
            <button type="button" className={`focus-level-button${picked ? ' selected' : ''}`}
              aria-pressed={picked} disabled={!picked && Boolean(reason)}
              onClick={() => onToggle(plan.classId, key, art.id)}>{picked ? '기교 해제' : '기교 선택'}</button>
          </article>
        })}
      </div>
    </section>
  }

  return <section className="card art-selection creation-section" id="stage-arts" aria-labelledby="art-selection-title">
    <div className="card-header">
      <div><h2 id="art-selection-title">기교 선택</h2></div>
      <RulesLink topic="arts" />
    </div>
    {notice && <p className="spell-notice" role="status">{ko(notice)}</p>}
    {!plans.length && <p className="info-panel">현재 클래스와 포커스에서는 선택할 기교가 없습니다.</p>}
    {plans.map((plan) => {
      const current = choices[plan.classId] ?? { groups: {}, chosen: [] }
      const picked = Object.values(current.groups).flat().length + current.chosen.length
      const required = plan.groups.reduce((sum, group) => sum + group.choose, plan.choose)
      return <section className="spell-class-slot" key={plan.classId} data-art-class={plan.classId}
        aria-label={`${nameFor(plan.classId)} 기교`}>
        <div className="focus-category-header"><h3>{nameFor(plan.classId)}{plan.source || plan.focusGrant ? ' 기교' : ` / ${plan.mode === 'full' ? '순수 클래스' : '부분 클래스'}`}</h3>
          {plan.configured && <span role="status">자동 습득 {plan.fixed.length}개 / {picked}/{required}개 선택</span>}
        </div>
        {plan.focusGrant && <p className="support-text">{nameFor(plan.focusGrant)} · 원소 촉발 자동 습득. 이미 습득했다면 원소술사 기교 1개 추가 선택.</p>}
        {plan.source && <p className="support-text">{nameFor(plan.source.focusId)} · {plan.mode === 'full' ? '순수' : '부분'} 소언사 기준</p>}
        {!plan.configured ? <div className="skill-review" role="status">
          <strong>클래스 기교 선택 불가</strong>
          <ul>{plan.issues.map((issue, index) => <li key={index}>{ko(issue)}</li>)}</ul>
        </div> : <>
          {plan.fixed.length > 0 && <section className="art-choice-section" aria-label={`${nameFor(plan.classId)}: 자동 습득 기교`}>
            <h4>{plan.source || (plan.focusGrant && plan.choose === 0) ? '포커스로 자동 습득' : '클래스에서 자동 습득'}</h4>
            <div className="focus-grid">{plan.fixed.map((id) => {
              const art = plan.options.find((option) => option.id === id)!
              return <article key={id} className="spell-option art-option is-granted" data-art-id={id}>
                <ArtHeading art={art} state="granted" />
                <ArtDescription art={art} />
              </article>
            })}</div>
          </section>}
          {plan.groups.map((group, index) => <div key={group.key}>
            <p className="support-text">{group.exclusive
              ? '전용 목록: 추가 기교로 선택 불가'
              : '남은 항목은 추가 기교로 선택 가능'}</p>
            {choiceSection(plan, current, group.key, group.label || `지정 목록 ${index + 1}`,
              group.choose, plan.options.filter((art) => group.options.includes(art.id)))}
          </div>)}
          {plan.choose > 0 && choiceSection(plan, current, null, '추가 기교', plan.choose,
            plan.options.filter((art) => !plan.fixed.includes(art.id)))}
          {required === 0 && <p className="support-text">모두 자동 습득</p>}
        </>}
      </section>
    })}
  </section>
}
