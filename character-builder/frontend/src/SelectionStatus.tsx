import { useEffect, useId, useRef, useState } from 'react'
import { ko } from './korean'

export type SelectionState = 'available' | 'selected' | 'granted' | 'locked'

export function selectionReason(reason: string) {
  if (reason === 'Both spell picks are used in this slot. Remove one to change your selection.') return '선택 한도 도달 — 다른 주문을 해제하면 선택할 수 있습니다.'
  if (reason === 'All picks in this section are used. Remove an art to change your selection.') return '선택 한도 도달 — 다른 기교를 해제하면 선택할 수 있습니다.'
  if (reason === 'Already selected in another art choice for this class.') return '다른 항목에서 습득 — 이미 습득한 기교입니다.'
  return ko(reason)
}

export function SelectionStatus({ state, name, detail }: { state: SelectionState; name: string; detail?: string }) {
  const id = useId()
  const root = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) { setOpen(false); setPinned(false) }
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  useEffect(() => { setOpen(false); setPinned(false) }, [state, detail])
  if (state === 'available') return null
  const label = state === 'locked' ? '선택 불가' : state === 'granted' ? '자동 습득' : '선택됨'
  return <span className={`selection-status is-${state}`} ref={root}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') setOpen(true) }}
    onPointerLeave={() => { if (!pinned && !root.current?.contains(document.activeElement)) setOpen(false) }}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setPinned(false) } }}
    onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); setPinned(false); event.stopPropagation() } }}>
    <button type="button" className="selection-status-button" aria-label={`${name}: ${label}`} aria-expanded={open}
      aria-describedby={open ? id : undefined} onFocus={() => setOpen(true)}
      onClick={() => { setPinned(!pinned); setOpen(!pinned) }}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {state === 'locked' ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></> : <path d="m5 12 4 4L19 6" />}
      </svg>
    </button>
    {open && <span id={id} role="tooltip" className="selection-status-tooltip">{detail || (state === 'granted' ? '자동 습득 — 선택권을 사용하지 않으며 개별 해제할 수 없습니다.' : label)}</span>}
  </span>
}
