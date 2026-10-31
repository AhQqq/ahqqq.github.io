import { evaluateScoreRedistribution } from '../../shared/scoreRedistribution'

export function ScoreRedistribution({ value, scores, attributes, target, onChange }: {
  value: unknown
  scores: Record<string, number>
  attributes: Array<{ id: string; name: string }>
  target: number
  onChange: (value: Record<string, number>) => void
}) {
  const result = evaluateScoreRedistribution(value, scores, target)
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return <fieldset><legend>엘프 능력치 재분배 (선택 사항)</legend>
    <p className="support-text">배정·배경 성장 후 {target} 미만인 능력치를 골라 정확히 {target}로 올립니다. 같은 점수를 다른 능력치에서 제공하되 {target} 이상을 유지하세요. 생략할 수 있습니다.</p>
    {attributes.map(({ id, name }) => {
      const before = scores[id]
      const options = before < target ? [0, target - before] : Array.from({ length: Math.max(0, before - target) + 1 }, (_, i) => -i)
      const current = Object.hasOwn(raw, id) ? raw[id] : 0
      const valid = typeof current === 'number' && options.includes(current)
      return <label key={id}><span>{name}: {before}</span>
        <select aria-label={`엘프 ${name} 재분배`} value={valid ? String(current) : 'invalid'} aria-invalid={!valid}
          onChange={(event) => onChange({ ...raw, [id]: Number(event.target.value) } as Record<string, number>)}>
          {!valid && <option value="invalid" disabled>유효하지 않은 배분</option>}
          {options.map((delta) => <option key={delta} value={delta}>{delta === 0 ? '유지' : delta > 0 ? `+${delta} 받아 ${target}로 증가` : `${-delta}점 제공 → ${before + delta}`}</option>)}
        </select>
      </label>
    })}
    <p className={result.valid ? 'support-text' : 'skill-choice-error'} role="status">{result.valid ? '총점이 보존됩니다.' : `재분배를 완성하세요. 받은 점수 − 제공한 점수: ${result.balance}. 올바른 배분이 완성될 때 적용됩니다.`}</p>
    <button type="button" onClick={() => onChange({})}>재분배 초기화</button>
  </fieldset>
}
