import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import App from './App'
import { RulesPage } from './RulesPage'

const isRulesHash = (hash: string) => hash === '#rules' || hash.startsWith('#rules-')

export default function AppPages() {
  const [{ hash, returnTo }, setLocation] = useState(() => ({ hash: window.location.hash, returnTo: '#stage-attributes' }))
  const previousHash = useRef(hash)
  const returnPoint = useRef({ hash: '#stage-attributes', top: 0, focus: null as HTMLElement | null })
  const wasRules = useRef(false)
  const originalTitle = useRef(document.title)
  const rulesOpen = isRulesHash(hash)

  useEffect(() => {
    const navigate = () => {
      const next = window.location.hash
      const enteringRules = !isRulesHash(previousHash.current) && isRulesHash(next)
      if (enteringRules) {
        returnPoint.current = {
          hash: previousHash.current || '#stage-attributes',
          top: window.scrollY,
          focus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
        }
      }
      previousHash.current = next
      const returnHash = returnPoint.current.hash
      setLocation((current) => ({ hash: next, returnTo: enteringRules ? returnHash : current.returnTo }))
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useLayoutEffect(() => {
    document.title = rulesOpen ? '수 없는 세계 | 생성 규칙' : originalTitle.current
    if (rulesOpen) {
      const target = document.getElementById(hash.slice(1)) ?? document.getElementById('rules')
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    } else if (wasRules.current) {
      const previous = returnPoint.current
      if ((hash || '#stage-attributes') === previous.hash) {
        window.scrollTo({ top: previous.top, behavior: 'instant' })
        const target = previous.focus?.isConnected ? previous.focus : document.getElementById('builder-page')
        target?.focus({ preventScroll: true })
      } else {
        document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'instant' })
        document.getElementById('builder-page')?.focus({ preventScroll: true })
      }
    }
    wasRules.current = rulesOpen
  }, [hash, rulesOpen])

  return <>
    <nav aria-label="사이트 탐색" style={{ padding: "1rem" }}><a href="/">홈</a> · <a href="/database.html">자료집</a></nav>
    {/* Keep the draft, picker state, and open disclosures intact while reading rules. */}
    <div id="builder-page" hidden={rulesOpen} tabIndex={-1}><App /></div>
    {rulesOpen && <RulesPage returnTo={returnTo} />}
  </>
}
