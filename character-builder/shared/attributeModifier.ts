export function getModifier(score: number): number {
  if (!Number.isInteger(score) || score < 3 || score > 18) return 0
  if (score === 3) return -2
  if (score <= 7) return -1
  if (score <= 13) return 0
  if (score <= 17) return 1
  return 2
}
