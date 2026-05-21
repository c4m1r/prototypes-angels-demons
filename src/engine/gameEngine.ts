import {
  GameState, Team, Unit, Building, FactionType, Position,
  UnitType, Difficulty, MapSize, ControlPoint,
  FACTION_CONFIGS, MAP_SIZES,
} from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { generateMap, getStartPosition } from './mapGenerator';

const TEAM_COLORS = ['#60a5fa', '#ef4444', '#22c55e', '#eab308'];
const TEAM_GLOW_COLORS = ['#93c5fd', '#f87171', '#4ade80', '#facc15'];
const ALL_FACTIONS: FactionType[] = ['angels', 'demons', 'undead', 'machines'];

export function initializeGame(
  playerFaction: FactionType,
  mapSize: MapSize,
  difficulty: Difficulty
): GameState {
  const map = generateMap(mapSize);
  const teams: Team[] = [];

  const playerTeamIndex = Math.floor(Math.random() * 4);
  const factionAssignment: FactionType[] = [];

  for (let i = 0; i < 4; i++) {
    if (i === playerTeamIndex) {
      factionAssignment[i] = playerFaction;
    } else {
      const usedFactions = factionAssignment.slice(0, i);
      const available = ALL_FACTIONS.filter(f => !usedFactions.includes(f));
      if (available.length > 0) {
        factionAssignment[i] = available[Math.floor(Math.random() * available.length)];
      } else {
        factionAssignment[i] = ALL_FACTIONS[Math.floor(Math.random() * ALL_FACTIONS.length)];
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    const faction = factionAssignment[i];
    const isPlayer = i === playerTeamIndex;
    const startPos = getStartPosition(map, i);
    const factionConfig = FACTION_CONFIGS[faction];
    const tileSize = MAP_SIZES[mapSize].tileSize;

    const mainBuilding: Building = {
      id: `building-${i}-0`,
      type: factionConfig.mainBuilding,
      faction,
      teamId: i,
      position: { x: startPos.x * tileSize + tileSize / 2, y: startPos.y * tileSize + tileSize / 2 },
      health: BUILDING_CONFIGS[factionConfig.mainBuilding].health,
      maxHealth: BUILDING_CONFIGS[factionConfig.mainBuilding].health,
      selected: false,
      productionProgress: 0,
      productionTime: 0,
      isTurret: false,
      turretRange: 0,
      turretDamage: 0,
      turretLastAttack: 0,
    };

    const builderConfig = UNIT_CONFIGS[factionConfig.builderUnit];
    const builder: Unit = {
      id: `unit-${i}-0`,
      type: factionConfig.builderUnit,
      faction,
      teamId: i,
      position: { x: startPos.x * tileSize + tileSize * 2, y: startPos.y * tileSize + tileSize / 2 },
      health: builderConfig.health,
      maxHealth: builderConfig.health,
      mana: builderConfig.mana,
      maxMana: builderConfig.mana,
      damage: builderConfig.damage,
      range: builderConfig.range,
      attackSpeed: builderConfig.attackSpeed,
      movementSpeed: builderConfig.movementSpeed,
      evasion: builderConfig.evasion,
      squadSize: 1,
      maxSquadSize: 1,
      selected: false,
      moving: false,
      lastAttackTime: 0,
      isHero: false,
      level: 1,
      experience: 0,
      experienceToLevel: 100,
    };

    const startResources = difficulty === 'easy' ? 500 : difficulty === 'normal' ? 300 : 200;

    teams.push({
      id: i,
      faction,
      resources: startResources,
      units: [builder],
      buildings: [mainBuilding],
      isPlayer,
      color: TEAM_COLORS[i],
      glowColor: TEAM_GLOW_COLORS[i],
      defeated: false,
    });
  }

  return {
    teams,
    playerTeam: playerTeamIndex,
    selectedUnits: [],
    map,
    gameStarted: true,
    difficulty,
    gameTime: 0,
  };
}

export function updateGame(state: GameState, deltaTime: number): GameState {
  const newState = { ...state, gameTime: state.gameTime + deltaTime };

  newState.teams = newState.teams.map(team => {
    if (team.defeated) return team;

    team.buildings.forEach(building => {
      if (building.resourceGeneration) {
        team.resources += (building.resourceGeneration * deltaTime) / 1000;
      }

      if (building.producing && building.productionTime > 0) {
        building.productionProgress += deltaTime;

        if (building.productionProgress >= building.productionTime * 1000) {
          const unitType = building.producing;
          const config = UNIT_CONFIGS[unitType];

          const newUnit: Unit = {
            id: `unit-${team.id}-${Date.now()}`,
            type: unitType,
            faction: team.faction,
            teamId: team.id,
            position: {
              x: building.position.x + 80,
              y: building.position.y + 80,
            },
            health: config.health * config.initialSquadSize,
            maxHealth: config.health * config.maxSquadSize,
            mana: config.mana,
            maxMana: config.mana,
            damage: config.damage,
            range: config.range,
            attackSpeed: config.attackSpeed,
            movementSpeed: config.movementSpeed,
            evasion: config.evasion,
            squadSize: config.initialSquadSize,
            maxSquadSize: config.maxSquadSize,
            selected: false,
            moving: false,
            lastAttackTime: 0,
            isHero: config.isHero,
            level: 1,
            experience: 0,
            experienceToLevel: 100,
          };

          team.units.push(newUnit);
          building.producing = undefined;
          building.productionProgress = 0;
          building.productionTime = 0;
        }
      }

      if (building.isTurret) {
        const now = Date.now();
        if (now - building.turretLastAttack >= BUILDING_CONFIGS[building.type].turretAttackSpeed * 1000) {
          let closestEnemy: Unit | undefined;
          let closestDist = Infinity;

          newState.teams.forEach(enemyTeam => {
            if (enemyTeam.id === team.id) return;
            enemyTeam.units.forEach(enemyUnit => {
              const d = distance(building.position, enemyUnit.position);
              if (d < building.turretRange && d < closestDist) {
                closestDist = d;
                closestEnemy = enemyUnit;
              }
            });
          });

          if (closestEnemy) {
            closestEnemy.health -= building.turretDamage;
            building.turretLastAttack = now;
          }
        }
      }
    });

    team.units = team.units.filter(unit => {
      if (unit.moving && unit.targetPosition) {
        const dx = unit.targetPosition.x - unit.position.x;
        const dy = unit.targetPosition.y - unit.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          unit.moving = false;
          unit.targetPosition = undefined;
        } else {
          const moveDistance = (unit.movementSpeed * deltaTime) / 1000;
          unit.position.x += (dx / dist) * moveDistance;
          unit.position.y += (dy / dist) * moveDistance;
        }
      }

      if (unit.targetUnit) {
        const target = findUnitById(newState, unit.targetUnit);
        if (target && target.health > 0) {
          const dx = target.position.x - unit.position.x;
          const dy = target.position.y - unit.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= unit.range) {
            const now = Date.now();
            if (now - unit.lastAttackTime >= unit.attackSpeed * 1000) {
              const hitChance = 1 - target.evasion;
              if (Math.random() < hitChance) {
                target.health -= unit.damage * unit.squadSize;
                if (target.health <= 0 && unit.isHero) {
                  unit.experience += 50;
                  checkLevelUp(unit);
                }
              }
              unit.lastAttackTime = now;
            }
          } else {
            unit.targetPosition = target.position;
            unit.moving = true;
          }
        } else {
          unit.targetUnit = undefined;
        }
      }

      if (unit.targetBuilding) {
        const target = findBuildingById(newState, unit.targetBuilding);
        if (target && target.health > 0) {
          const dx = target.position.x - unit.position.x;
          const dy = target.position.y - unit.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= unit.range) {
            const now = Date.now();
            if (now - unit.lastAttackTime >= unit.attackSpeed * 1000) {
              target.health -= unit.damage * unit.squadSize;
              unit.lastAttackTime = now;
            }
          } else {
            unit.targetPosition = target.position;
            unit.moving = true;
          }
        } else {
          unit.targetBuilding = undefined;
        }
      }

      return unit.health > 0;
    });

    team.buildings = team.buildings.filter(building => building.health > 0);

    if (team.buildings.length === 0 && team.units.length === 0) {
      team.defeated = true;
    }

    return team;
  });

  newState.map = { ...newState.map, controlPoints: updateControlPoints(newState) };

  newState.teams.forEach(team => {
    if (team.defeated) return;
    team.resources += getControlPointIncome(newState, team.id) * deltaTime / 1000;
  });

  return newState;
}

function checkLevelUp(unit: Unit) {
  while (unit.experience >= unit.experienceToLevel) {
    unit.experience -= unit.experienceToLevel;
    unit.level++;
    unit.experienceToLevel = Math.floor(unit.experienceToLevel * 1.5);
    unit.maxHealth += 50;
    unit.health = Math.min(unit.health + 50, unit.maxHealth);
    unit.damage += 5;
  }
}

function updateControlPoints(state: GameState): ControlPoint[] {
  const cpUpdate = state.map.controlPoints.map(cp => {
    const newCp = { ...cp, captureProgress: [...cp.captureProgress] };

    state.teams.forEach(team => {
      if (team.defeated) return;
      const hasUnitNear = team.units.some(u =>
        distance(u.position, { x: cp.position.x * 32 + 16, y: cp.position.y * 32 + 16 }) < 80
      );

      if (hasUnitNear) {
        newCp.captureProgress[team.id] += 0.01;
      }
    });

    const maxCapture = Math.max(...newCp.captureProgress);
    if (maxCapture >= 1) {
      const ownerIdx = newCp.captureProgress.findIndex(v => v >= 1);
      newCp.owner = ownerIdx;
      newCp.captureProgress = [0, 0, 0, 0];
      newCp.captureProgress[ownerIdx] = 1;
    }

    return newCp;
  });

  return cpUpdate;
}

function getControlPointIncome(state: GameState, teamId: number): number {
  return state.map.controlPoints
    .filter(cp => cp.owner === teamId)
    .reduce((sum, cp) => sum + cp.resourceRate, 0);
}

function findUnitById(state: GameState, unitId: string): Unit | undefined {
  for (const team of state.teams) {
    const unit = team.units.find(u => u.id === unitId);
    if (unit) return unit;
  }
  return undefined;
}

function findBuildingById(state: GameState, buildingId: string): Building | undefined {
  for (const team of state.teams) {
    const building = team.buildings.find(b => b.id === buildingId);
    if (building) return building;
  }
  return undefined;
}

export function distance(p1: Position, p2: Position): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getBuilderTypes(): UnitType[] {
  return ['servant', 'slave', 'skeleton', 'drone'];
}

export function isBuilder(unitType: UnitType): boolean {
  return getBuilderTypes().includes(unitType);
}
