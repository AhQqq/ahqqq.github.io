import { useEffect, useState } from 'react'

const STAGES = [
  { id: 'stage-attributes', label: '능력치', keys: ['attributes'] },
  { id: 'stage-background', label: '배경', keys: ['background'] },
  { id: 'stage-class', label: '클래스', keys: ['classChoice'] },
  { id: 'stage-focus', label: '포커스', keys: ['focusChoice'] },
  { id: 'stage-free-skill', label: '자유 기술', keys: ['freeSkill'] },
  { id: 'stage-equipment', label: '장비', keys: ['equipment', 'armorClass'] },
  { id: 'stage-arts', label: '기교', keys: ['arts'] },
  { id: 'stage-spells', label: '주문', keys: ['spells'] },
  { id: 'stage-identity', label: '인물 정보', keys: ['identity', 'combat'] },
]

export function CreationNavigation({ steps, ready, offline }: {
  steps: Array<{ key: string; complete: boolean }>
  ready: boolean
  offline: boolean
}) {
  const [activeId, setActiveId] = useState(STAGES[0]!.id)
  const stages = STAGES.map((stage) => ({
    ...stage, complete: ready && stage.keys.every((key) => steps.some((step) => step.key === key && step.complete)),
  }))
  const complete = stages.filter((stage) => stage.complete).length
  const next = ready ? stages.find((stage) => !stage.complete) : undefined

  useEffect(() => {
    const sections = STAGES.map((stage) => document.getElementById(stage.id)).filter((section): section is HTMLElement => Boolean(section))
    let frame = 0
    const updateActive = () => {
      const current = sections.filter((section) => section.getBoundingClientRect().top <= 170).at(-1)
      setActiveId(current?.id ?? STAGES[0]!.id)
    }
    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        updateActive()
      })
    }
    updateActive()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  return <nav className="creation-navigation" aria-label="캐릭터 생성 단계">
    <div className="navigation-overview">
      <div className="creation-progress">
        <strong>모험의 시작</strong>
        <span role="status">{offline ? '검증 연결 필요' : ready ? complete + ' / ' + stages.length + '단계 완료' : '선택 확인 중'}</span>
        <progress aria-label="캐릭터 생성 진행도" max={stages.length} value={ready ? complete : undefined} />
      </div>
      <div className="navigation-actions">
        <a href="#rules">생성 규칙</a>
        {next && <a href={'#' + next.id} className="next-stage-link">이어 만들기 <span aria-hidden="true">→</span></a>}
        <a href="#character-sheet" className="sheet-shortcut">캐릭터 시트 <span aria-hidden="true">↗</span></a>
      </div>
    </div>
    <ol className="stage-links">
      {stages.map((stage, index) => <li key={stage.id}>
        <a href={'#' + stage.id} aria-current={activeId === stage.id ? 'location' : undefined}
          className={stage.complete ? 'stage-complete' : undefined}>
          <span className="stage-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          <span>{stage.label}</span>
          <span className="sr-only">{stage.complete ? ' 완료' : ready ? ' 미완료' : ' 확인 대기'}</span>
          {stage.complete && <svg className="stage-check" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>}
        </a>
      </li>)}
    </ol>
  </nav>
}
