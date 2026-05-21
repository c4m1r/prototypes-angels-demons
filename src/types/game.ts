export type FactionType = 'angels' | 'demons' | 'undead' | 'machines';
export type MapSize = 'small' | 'medium' | 'large';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type LevelUpStat = 'movementSpeed' | 'health' | 'damage' | 'attackSpeed' | 'mana' | 'range' | 'evasion';
export type AIPersonality = 'turtle' | 'balanced' | 'rusher';

export interface Position {
  x: number;
  y: number;
}

export interface Tile {
  type: TileType;
  passable: boolean;
  movementCost: number;
  resourceAmount: number;
  ascii: string;
  color: string;
  bgColor: string;
}

export type TileType = 'grass' | 'dirt' | 'rock' | 'forest' | 'crystal' | 'water' | 'ruins' | 'control_point';

export interface ControlPoint {
  id: string;
  position: Position;
  owner: number | null;
  captureProgress: number[];
  resourceRate: number;
  ascii: string;
}

export interface Unit {
  id: string;
  type: UnitType;
  faction: FactionType;
  teamId: number;
  position: Position;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  damage: number;
  range: number;
  attackSpeed: number;
  movementSpeed: number;
  evasion: number;
  squadSize: number;
  maxSquadSize: number;
  selected: boolean;
  moving: boolean;
  targetPosition?: Position;
  targetUnit?: string;
  targetBuilding?: string;
  lastAttackTime: number;
  isHero: boolean;
  level: number;
  experience: number;
  experienceToLevel: number;
  path: Position[];
  pathIndex: number;
  lastAttackFlash: number;
  pendingLevelUps: number;
  abilities: Ability[];
}

export interface Building {
  id: string;
  type: BuildingType;
  faction: FactionType;
  teamId: number;
  position: Position;
  health: number;
  maxHealth: number;
  selected: boolean;
  producing?: UnitType;
  productionProgress: number;
  productionTime: number;
  resourceGeneration?: number;
  isTurret: boolean;
  turretRange: number;
  turretDamage: number;
  turretLastAttack: number;
}

export type UnitType =
  | 'servant' | 'priest' | 'angel' | 'paladin' | 'seraphim' | 'archangel'
  | 'slave' | 'cultist' | 'demon' | 'hellknight' | 'infernal' | 'archdemon'
  | 'skeleton' | 'zombie' | 'lich' | 'deathknight' | 'banshee' | 'overlord'
  | 'drone' | 'soldier' | 'mech' | 'tank' | 'artillery' | 'titan';

export type BuildingType =
  | 'heaven_temple' | 'heart_heaven' | 'holy_altar' | 'holy_relic' | 'enlightenment_altar'
  | 'hell_sanctuary' | 'heart_hell' | 'dark_altar' | 'dark_relic' | 'corruption_altar'
  | 'necropolis' | 'bone_pit' | 'soul_well' | 'grave_tower' | 'crypt_altar'
  | 'factory' | 'barracks_m' | 'power_plant' | 'turret_m' | 'tech_lab';

export interface Team {
  id: number;
  faction: FactionType;
  resources: number;
  units: Unit[];
  buildings: Building[];
  isPlayer: boolean;
  color: string;
  glowColor: string;
  defeated: boolean;
  aiProfile: AIProfile;
}

export interface GameMap {
  tiles: Tile[][];
  width: number;
  height: number;
  controlPoints: ControlPoint[];
}

export interface GameState {
  teams: Team[];
  playerTeam: number;
  selectedUnits: string[];
  selectionBox?: { start: Position; end: Position };
  map: GameMap;
  gameStarted: boolean;
  difficulty: Difficulty;
  gameTime: number;
  combatEvents: CombatEvent[];
  gameOver: 'victory' | 'defeat' | null;
}

export interface CombatEvent {
  id: string;
  type: 'damage' | 'kill' | 'levelup' | 'capture';
  position: Position;
  value: number;
  timestamp: number;
  color: string;
}

export interface UnitConfig {
  name: string;
  cost: number;
  health: number;
  mana: number;
  damage: number;
  range: number;
  attackSpeed: number;
  movementSpeed: number;
  evasion: number;
  initialSquadSize: number;
  maxSquadSize: number;
  buildTime: number;
  ascii: string;
  description: string;
  isHero: boolean;
  abilities: AbilityConfig[];
}

export interface BuildingConfig {
  name: string;
  cost: number;
  health: number;
  buildTime: number;
  resourceGeneration?: number;
  canProduce?: UnitType[];
  ascii: string[];
  width: number;
  height: number;
  description: string;
  isTurret: boolean;
  turretRange: number;
  turretDamage: number;
  turretAttackSpeed: number;
}

export interface FactionConfig {
  name: string;
  symbol: string;
  color: string;
  glowColor: string;
  bgColor: string;
  mainBuilding: BuildingType;
  builderUnit: UnitType;
  resourceBuilding: BuildingType;
  barracksBuilding: BuildingType;
  turretBuilding: BuildingType;
  techBuilding: BuildingType;
  buildings: BuildingType[];
  description: string;
}

export interface Ability {
  id: string;
  name: string;
  manaCost: number;
  cooldown: number;
  lastUsed: number;
  range: number;
  effectType: 'damage' | 'heal' | 'buff' | 'aoe';
  value: number;
  description: string;
  ascii: string;
}

export interface AbilityConfig {
  id: string;
  name: string;
  manaCost: number;
  cooldown: number;
  range: number;
  effectType: 'damage' | 'heal' | 'buff' | 'aoe';
  value: number;
  description: string;
  ascii: string;
}

export interface AIProfile {
  personality: AIPersonality;
  difficulty: Difficulty;
  attackInterval: number;
  squadSize: number;
  buildPriority: number;
  capturePriority: number;
  defensePriority: number;
  economyRate: number;
  lastAttackTime: number;
  lastBuildTime: number;
  lastCaptureTime: number;
  targetPointIndex: number;
}

export const MAP_SIZES: Record<MapSize, { width: number; height: number; tileSize: number }> = {
  small: { width: 40, height: 30, tileSize: 32 },
  medium: { width: 60, height: 45, tileSize: 32 },
  large: { width: 80, height: 60, tileSize: 32 },
};

export const FACTION_CONFIGS: Record<FactionType, FactionConfig> = {
  angels: {
    name: 'Ангелы',
    symbol: '☨',
    color: '#60a5fa',
    glowColor: '#93c5fd',
    bgColor: '#1e3a5f',
    mainBuilding: 'heaven_temple',
    builderUnit: 'servant',
    resourceBuilding: 'holy_altar',
    barracksBuilding: 'heart_heaven',
    turretBuilding: 'holy_relic',
    techBuilding: 'enlightenment_altar',
    buildings: ['heaven_temple', 'heart_heaven', 'holy_altar', 'holy_relic', 'enlightenment_altar'],
    description: 'Свет, порядок, защита',
  },
  demons: {
    name: 'Демоны',
    symbol: '⛤',
    color: '#ef4444',
    glowColor: '#f87171',
    bgColor: '#5f1e1e',
    mainBuilding: 'hell_sanctuary',
    builderUnit: 'slave',
    resourceBuilding: 'dark_altar',
    barracksBuilding: 'heart_hell',
    turretBuilding: 'dark_relic',
    techBuilding: 'corruption_altar',
    buildings: ['hell_sanctuary', 'heart_hell', 'dark_altar', 'dark_relic', 'corruption_altar'],
    description: 'Хаос, огонь, агрессия',
  },
  undead: {
    name: 'Нежить',
    symbol: '☠',
    color: '#22c55e',
    glowColor: '#4ade80',
    bgColor: '#1e3f2a',
    mainBuilding: 'necropolis',
    builderUnit: 'skeleton',
    resourceBuilding: 'soul_well',
    barracksBuilding: 'bone_pit',
    turretBuilding: 'grave_tower',
    techBuilding: 'crypt_altar',
    buildings: ['necropolis', 'bone_pit', 'soul_well', 'grave_tower', 'crypt_altar'],
    description: 'Смерть, некромантия, истощение',
  },
  machines: {
    name: 'Машины',
    symbol: '⚙',
    color: '#eab308',
    glowColor: '#facc15',
    bgColor: '#3f3f1e',
    mainBuilding: 'factory',
    builderUnit: 'drone',
    resourceBuilding: 'power_plant',
    barracksBuilding: 'barracks_m',
    turretBuilding: 'turret_m',
    techBuilding: 'tech_lab',
    buildings: ['factory', 'barracks_m', 'power_plant', 'turret_m', 'tech_lab'],
    description: 'Техника, броня, механика',
  },
};

export const LEVEL_UP_STAT_NAMES: Record<LevelUpStat, string> = {
  movementSpeed: 'Скорость',
  health: 'Здоровье',
  damage: 'Атака',
  attackSpeed: 'Скор. атаки',
  mana: 'Мана',
  range: 'Дальность',
  evasion: 'Уклонение',
};

export function getAIProfile(personality: AIPersonality, difficulty: Difficulty): AIProfile {
  const diff = difficulty === 'easy' ? 0.6 : difficulty === 'normal' ? 1.0 : 1.5;

  const base: Record<AIPersonality, Omit<AIProfile, 'personality' | 'difficulty' | 'lastAttackTime' | 'lastBuildTime' | 'lastCaptureTime' | 'targetPointIndex'>> = {
    turtle: {
      attackInterval: 45000 / diff,
      squadSize: Math.floor(6 * diff),
      buildPriority: 0.8,
      capturePriority: 0.3,
      defensePriority: 0.9,
      economyRate: 1.2 * diff,
    },
    balanced: {
      attackInterval: 30000 / diff,
      squadSize: Math.floor(8 * diff),
      buildPriority: 0.5,
      capturePriority: 0.6,
      defensePriority: 0.5,
      economyRate: 1.0 * diff,
    },
    rusher: {
      attackInterval: 15000 / diff,
      squadSize: Math.floor(4 * diff),
      buildPriority: 0.2,
      capturePriority: 0.4,
      defensePriority: 0.2,
      economyRate: 0.8 * diff,
    },
  };

  return {
    personality,
    difficulty,
    ...base[personality],
    lastAttackTime: 0,
    lastBuildTime: 0,
    lastCaptureTime: 0,
    targetPointIndex: 0,
  };
}
