// Validate all transfers before applying any, preserving the original allocation.
export function evaluateScoreRedistribution(source: unknown, scores: Record<string, number>, target: number) {
  const deltas: Record<string, number> = {};
  let valid = Number.isInteger(target) && target >= 3 && target <= 18;
  if (source !== undefined) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) valid = false;
    else for (const [id, delta] of Object.entries(source)) {
      const before = scores[id];
      if (!Object.hasOwn(scores, id) || !Number.isInteger(before) || before < 3 || before > 18 ||
          typeof delta !== 'number' || !Number.isSafeInteger(delta) ||
          (delta > 0 && !(before < target && before + delta === target)) ||
          (delta < 0 && !(before > target && before + delta >= target))) valid = false;
      else deltas[id] = delta;
    }
  }
  const balance = Object.values(deltas).reduce((sum, delta) => sum + delta, 0);
  return { valid: valid && balance === 0, balance, deltas };
}
