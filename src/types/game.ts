export type FactionType = 'angels' | 'demons';

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  faction: FactionType;
  position: Position;
  health: number;
  maxHealth: number;
  squadSize: number;
  maxSquadSize: number;
  damage: number;
  range: number;
  attackSpeed: number;
  selected: boolean;
  moving: boolean;
  targetPosition?: Position;
  targetUnit?: string;
  lastAttackTime: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  faction: FactionType;
  position: Position;
  health: number;
  maxHealth: number;
  selected: boolean;
  producing?: UnitType;
  productionProgress: number;
  productionTime: number;
  resourceGeneration?: number;
}

export type UnitType =
  | 'servant' | 'priest' | 'angel' | 'paladin' | 'seraphim'
  | 'slave' | 'cultist' | 'demon' | 'hellknight' | 'infernal';

export type BuildingType =
  | 'heaven_temple' | 'heart_heaven' | 'holy_altar' | 'holy_relic' | 'enlightenment_altar'
  | 'hell_sanctuary' | 'heart_hell' | 'dark_altar' | 'dark_relic' | 'corruption_altar';

export interface Team {
  id: number;
  faction: FactionType;
  resources: number;
  units: Unit[];
  buildings: Building[];
  isPlayer: boolean;
  color: string;
}

export interface GameState {
  teams: Team[];
  playerTeam: number;
  selectedUnits: string[];
  selectionBox?: { start: Position; end: Position };
  mapSize: { width: number; height: number };
  gameStarted: boolean;
}

export interface UnitConfig {
  name: string;
  cost: number;
  health: number;
  damage: number;
  range: number;
  attackSpeed: number;
  initialSquadSize: number;
  maxSquadSize: number;
  buildTime: number;
  ascii: string;
  description: string;
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
}
