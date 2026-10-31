export type AbilityEffect = {
  type: 'override_hit_dice';
  when: { class_pair: [string, string] };
  value: string;
};

export type AbilityDefinition = {
  id: string;
  name: string;
  englishName: string;
  desc: string;
  src: string;
  effects?: AbilityEffect[];
  manual_review?: string[];
};

export type AbilitySource = { type: 'class' | 'combination'; classIds: string[] } |
  { type: 'focus'; focusId: string; instanceId: string };
export type GrantedAbility = AbilityDefinition & { sources: AbilitySource[] };
export type AbilityEvaluation = { abilities: GrantedAbility[]; issues: string[]; complete: boolean };
export type AbilityGrant = { id: string | undefined; source: AbilitySource };

export function abilityById(id: string | undefined, catalogue: AbilityDefinition[]) {
  if (!id) return undefined;
  const matches = catalogue.filter((ability) => ability.id === id);
  return matches.length === 1 ? matches[0] : undefined;
}

function sourceKey(source: AbilitySource) {
  return source.type === 'focus' ? JSON.stringify([source.type, source.focusId, source.instanceId])
    : JSON.stringify([source.type, [...source.classIds].sort()]);
}

export function mergeAbilityEvaluations(...evaluations: AbilityEvaluation[]): AbilityEvaluation {
  const granted = new Map<string, GrantedAbility>();
  const issues = [...new Set(evaluations.flatMap((evaluation) => evaluation.issues))];
  for (const evaluation of evaluations) for (const ability of evaluation.abilities) {
    const entry: GrantedAbility = granted.get(ability.id) ?? { ...ability, sources: [] };
    for (const source of ability.sources) {
      if (!entry.sources.some((existing) => sourceKey(existing) === sourceKey(source))) entry.sources.push(source);
    }
    granted.set(ability.id, entry);
  }
  return { abilities: [...granted.values()], issues, complete: evaluations.every((evaluation) => evaluation.complete) };
}

export function resolveAbilityGrants(grants: AbilityGrant[], catalogue: AbilityDefinition[]): AbilityEvaluation {
  const abilities: GrantedAbility[] = [];
  const issues: string[] = [];
  for (const grant of grants) {
    const definition = abilityById(grant.id, catalogue);
    if (!definition) {
      issues.push(`Ability reference must resolve to exactly one definition: ${grant.id ?? '(missing ID)'}.`);
    } else abilities.push({ ...definition, sources: [grant.source] });
  }
  return mergeAbilityEvaluations({ abilities, issues, complete: issues.length === 0 });
}
