import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createDataReader } from './dataReader.js';
import { evaluateCharacterWithData } from '../../shared/characterEvaluation.js';
import type { CharacterInput } from '../../shared/characterCreation.js';
import type { CharacterData, AttributeData, SkillData, ClassData, BackgroundOption, ProgressionTable } from '../../shared/characterData.js';
import type { FocusData } from '../../shared/focusBonuses.js';
import type { SpellOption } from '../../shared/spellSelection.js';
import type { ClassCombinations } from '../../shared/classBuild.js';
import type { ArtOption, StartingArts } from '../../shared/artSelection.js';
import type { AbilityDefinition, ClassAbilityRules } from '../../shared/classAbilities.js';
import type { EquipmentDefinition, EquipmentPackage, EquipmentProperty } from '../../shared/startingEquipment.js';

function resolveDataDir() {
  const fromBackend = join(process.cwd(), "..", "frontend", "data");
  if (existsSync(fromBackend)) return fromBackend;

  const fromRepoRoot = join(process.cwd(), "frontend", "data");
  if (existsSync(fromRepoRoot)) return fromRepoRoot;

  throw new Error("Could not locate frontend/data directory.");
}

const DATA_DIR = resolveDataDir();
const readData = createDataReader();

export function readCharacterData(): CharacterData {
  const SKILLS = readData<SkillData[]>(DATA_DIR, "skills.json");
  const ATTRIBUTES = readData<AttributeData[]>(DATA_DIR, "attributes.json");
  const CLASSES = readData<ClassData[]>(DATA_DIR, "classes.json");
  const COMBINATIONS = readData<ClassCombinations>(DATA_DIR, 'combinations.json');
  const ABILITIES = readData<AbilityDefinition[]>(DATA_DIR, 'abilities.json');
  const CLASS_ABILITY_RULES = readData<ClassAbilityRules>(DATA_DIR, 'fullclass_abilities.json');
  const BACKGROUNDS = readData<BackgroundOption[]>(DATA_DIR, "backgrounds.json");
  const FOCI = readData<FocusData[]>(DATA_DIR, "foci.json");
  const SPELLS = readData<SpellOption[]>(DATA_DIR, "spells.json");
  const EQUIPMENT = readData<EquipmentDefinition[]>(DATA_DIR, 'equipment.json');
  const EQUIPMENT_PROPERTIES = readData<EquipmentProperty[]>(DATA_DIR, 'equipment_properties.json');
  const STARTING_EQUIPMENT = readData<EquipmentPackage[]>(DATA_DIR, 'starting_equipment.json');
  const STARTING_ARTS = readData<StartingArts>(DATA_DIR, 'starting_arts.json');
  const ART_DIR = join(DATA_DIR, 'arts');
  const ARTS = existsSync(ART_DIR) ? readdirSync(ART_DIR).filter((file) => file.endsWith('_arts.json'))
    .flatMap((file) => readData<ArtOption[]>(ART_DIR, file)) : [];
  const PROGRESSION_TABLES = readData<ProgressionTable[]>(DATA_DIR, "progression_tables.json");

  return { SKILLS, ATTRIBUTES, CLASSES, COMBINATIONS, ABILITIES, CLASS_ABILITY_RULES, BACKGROUNDS,
    FOCI, SPELLS, EQUIPMENT, EQUIPMENT_PROPERTIES, STARTING_EQUIPMENT, STARTING_ARTS, ARTS, PROGRESSION_TABLES };
}

export function getDataCounts() {
  const { SKILLS, CLASSES, ABILITIES, BACKGROUNDS, FOCI, SPELLS, EQUIPMENT, EQUIPMENT_PROPERTIES,
    STARTING_EQUIPMENT, ARTS, PROGRESSION_TABLES } = readCharacterData();
  return {
    backgrounds: BACKGROUNDS.length, classes: CLASSES.length, foci: FOCI.length,
    skills: SKILLS.length, spells: SPELLS.length, progressions: PROGRESSION_TABLES.length,
    arts: ARTS.length, abilities: ABILITIES.length,
    equipment: EQUIPMENT.length, equipmentProperties: EQUIPMENT_PROPERTIES.length, startingEquipment: STARTING_EQUIPMENT.length,
  };
}

export function evaluateCharacter(draft: CharacterInput) {
  return evaluateCharacterWithData(draft, readCharacterData());
}
