import type { AttributeKey } from './attributes.js';
import type { BackgroundData } from './background.js';
import type { SelectableClass } from './classSelection.js';
import type { FocusAllowance } from './focusAllowances.js';
import type { FocusData } from './focusBonuses.js';
import type { ClassCombinations } from './classBuild.js';
import type { AbilityDefinition, ClassAbilityRules } from './classAbilities.js';
import type { SpellOption } from './spellSelection.js';
import type { ArtOption, StartingArts } from './artSelection.js';
import type { EquipmentDefinition, EquipmentPackage, EquipmentProperty } from './startingEquipment.js';

export type DataAction = BackgroundData['free_skill'][number] & { filter?: { tags?: string[] } };
export type AttributeData = { id: AttributeKey; name: string; description: string; tags: string[] };
export type SkillData = { id: string; name: string; description: string; tags: string[] };
export type BackgroundOption = BackgroundData & { description: string; sugg_skill: DataAction[] };
export type ClassData = SelectableClass & {
  name: string;
  archetype: 'warrior' | 'expert' | 'mage';
  arts: boolean;
  spells: boolean;
  bonus: DataAction[];
};
export type ProgressionTable = { id: string; hd: string; ab: string; focus: FocusAllowance[] };

// Callers supply catalogues; shared rules never load files or browser assets.
export type CharacterData = {
  SKILLS: SkillData[];
  ATTRIBUTES: AttributeData[];
  CLASSES: ClassData[];
  COMBINATIONS: ClassCombinations;
  ABILITIES: AbilityDefinition[];
  CLASS_ABILITY_RULES: ClassAbilityRules;
  BACKGROUNDS: BackgroundOption[];
  FOCI: FocusData[];
  SPELLS: SpellOption[];
  EQUIPMENT: EquipmentDefinition[];
  EQUIPMENT_PROPERTIES: EquipmentProperty[];
  STARTING_EQUIPMENT: EquipmentPackage[];
  STARTING_ARTS: StartingArts;
  ARTS: ArtOption[];
  PROGRESSION_TABLES: ProgressionTable[];
};
