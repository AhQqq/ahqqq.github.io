import type { ReactNode } from 'react'

export type RuleTopic = 'attributes' | 'background' | 'skills' | 'classes' | 'foci' | 'equipment' | 'combat' | 'arts' | 'spells' | 'scope'

export function RulesLink({ topic, children }: { topic: RuleTopic; children?: ReactNode }) {
  return <a className={children ? 'rules-link' : 'rules-link rules-icon-link'} href={'#rules-' + topic}
    title={children ? undefined : '관련 규칙'} aria-label={children ? undefined : '관련 규칙'}>
    {children}<span className="material-symbols-outlined ui-icon" aria-hidden="true">menu_book</span>
  </a>
}
