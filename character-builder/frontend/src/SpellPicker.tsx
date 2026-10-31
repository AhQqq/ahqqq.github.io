import { RulesLink } from './RulesLink'
import { SelectionStatus, selectionReason } from './SelectionStatus'
import { ko, nameFor, rulesText } from './korean'
import { availableSpells, CLASS_SLOTS, isSpellcaster, spellSchoolLabel, spellSchools, spellSelectionReason } from '../../shared/spellSelection'
import type { ClassSlot, SpellChoices, SpellOption } from '../../shared/spellSelection'
import type { FocusTraditionGrant } from '../../shared/focusTraditions'

type Props = {
  classIds: string[]
  classes: Array<{ id: string; name: string; eng_name: string }>
  spells: SpellOption[]
  choices: SpellChoices
  traditions?: FocusTraditionGrant[]
  notice: string
  onToggle: (slot: ClassSlot, id: string) => void
}

export function SpellPicker({ classIds, classes, spells, choices, traditions = [], notice, onToggle }: Props) {
  const casterSlots = CLASS_SLOTS.filter((slot) => isSpellcaster(classIds[slot]))
  return (
    <section className="card spell-selection creation-section" id="stage-spells" aria-labelledby="spell-selection-title">
      <div className="card-header">
        <div><h2 id="spell-selection-title">1레벨 주문 습득</h2></div>
        <RulesLink topic="spells" />
      </div>
      {notice && <p className="spell-notice" role="status">{ko(notice)}</p>}
      {casterSlots.length === 0 ? <p className="info-panel">선택한 두 클래스는 주문을 시전하지 않으므로 주문 선택이 필요하지 않습니다.</p> : <>
        <p className="focus-pick-count" role="status">주문 {choices.flat().length}/{casterSlots.length * 2}개 습득</p>
        {CLASS_SLOTS.map((slot) => {
          const letter = slot + 1
          const classOption = classes.find((option) => option.id === classIds[slot])
          const className = classOption?.name || '클래스 미선택'
          const eligible = availableSpells(spells, classIds[slot], traditions)
          const caster = isSpellcaster(classIds[slot])
          const categories = [...new Set(eligible.map((spell) => spell.category))]
          return (
            <section key={slot} className="spell-class-slot" data-spell-slot={slot} aria-label={`${letter}번째 클래스 주문: ${className}`}>
              <div className="focus-category-header">
                <h3>{letter}번째 클래스: {className}</h3>
                <span role="status">{choices[slot].length}/{caster ? 2 : 0}개 습득</span>
              </div>
              {!caster ? <p className="support-text">주문 없음</p> : <>
                <p className="support-text">선택 가능한 학파: {spellSchools(classIds[slot], traditions).map((school) => ko(spellSchoolLabel(school))).join(', ')}.</p>
                {classIds[slot] === 'invoker' && traditions.map((grant) => <p className="support-text" key={grant.instanceId}>{nameFor(grant.focusId)}: {nameFor(grant.traditionId)}</p>)}
                <ol className="learned-spell-list" aria-label={`${letter}번째 클래스에서 습득한 주문`}>
                  {[0, 1].map((pick) => {
                    const spell = spells.find((item) => item.id === choices[slot][pick])
                    return <li key={pick}>
                      {spell ? <><span>{spell.name}</span>
                        <button type="button" onClick={() => onToggle(slot, spell.id)}
                          aria-label={`${letter}번째 클래스의 ${spell.name} 해제`}>해제</button></>
                        : <span className="empty-spell-pick">아래에서 {pick + 1}번째 주문을 선택하세요</span>}
                    </li>
                  })}
                </ol>
                {categories.map((category) => <section key={category} className="spell-school" aria-label={`${letter}번째 클래스: ${ko(spellSchoolLabel(category))}`}>
                  <h4>{ko(spellSchoolLabel(category))}</h4>
                  <div className="focus-grid">
                    {eligible.filter((spell) => spell.category === category).map((spell) => {
                      const selected = choices[slot].includes(spell.id)
                      const reason = spellSelectionReason(spell, slot, choices, classIds, traditions)
                      const locked = !selected && Boolean(reason)
                      return <article key={spell.id} data-spell-id={spell.id} className={`spell-option${selected ? ' is-learned' : ''}${locked ? ' is-unavailable' : ''}`}>
                        <div className="spell-option-heading">
                          <div className="spell-option-title">
                            <h5>{spell.name}</h5>
                            <p className="focus-english-name">{spell.englishName}</p>
                          </div>
                          <div className="selection-heading-status"><span className="focus-state-badge">1레벨</span>
                            <SelectionStatus state={selected ? 'selected' : locked ? 'locked' : 'available'} name={spell.name} detail={locked ? selectionReason(reason) : undefined} />
                          </div>
                        </div>
                        <details className="spell-description">
                          <summary>전체 설명 읽기</summary>
                          <p>{rulesText(spell.description) || '등록된 설명이 없습니다.'}</p>
                        </details>
                        <button type="button" className={`focus-level-button${selected ? ' selected' : ''}`}
                          aria-pressed={selected} disabled={!selected && Boolean(reason)}
                          onClick={() => onToggle(slot, spell.id)}>{selected ? '주문 해제' : '주문 습득'}</button>
                      </article>
                    })}
                  </div>
                </section>)}
              </>}
            </section>
          )
        })}
      </>}
    </section>
  )
}
