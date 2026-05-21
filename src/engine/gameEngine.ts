import {
  GameState, Team, Unit, Building, FactionType, Position,
  UnitType, Difficulty, MapSize, ControlPoint, CombatEvent,
  LevelUpStat, FACTION_CONFIGS, MAP_SIZES, getAIProfile, AIPersonality,
} from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { generateMap, getStartPosition } from './mapGenerator';
import { findPathWorld } from './pathfinding';

const TEAM_COLORS = ['#60a5fa', '#ef4444', '#22c55e', '#eab308'];
const TEAM_GLOW_COLORS = ['#93c5fd', '#f87171', '#4ade80', '#facc15'];
const ALL_FACTIONS: FactionType[] = ['angels', 'demons', 'undead', 'machines'];
const AI_PERSONALITIES: AIPersonality[] = ['turtle', 'balanced', 'rusher'];

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
      path: [],
      pathIndex: 0,
      lastAttackFlash: 0,
      pendingLevelUps: 0,
      abilities: [],
    };

    const startResources = difficulty === 'easy' ? 500 : difficulty === 'normal' ? 300 : 200;

    const aiPersonality = isPlayer ? 'balanced' : AI_PERSONALITIES[i % 3];
    const aiProfile = isPlayer ? getAIProfile('balanced', difficulty) : getAIProfile(aiPersonality, difficulty);

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
      aiProfile,
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
    combatEvents: [],
    gameOver: null,
  };
}

export function updateGame(state: GameState, deltaTime: number): GameState {
  if (state.gameOver) return state;

  const newState = { ...state, gameTime: state.gameTime + deltaTime };
  const combatEvents: CombatEvent[] = [];

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
            position: { x: building.position.x + 80, y: building.position.y + 80 },
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
            path: [],
            pathIndex: 0,
            lastAttackFlash: 0,
            pendingLevelUps: 0,
            abilities: config.abilities.map(a => ({
              id: a.id,
              name: a.name,
              manaCost: a.manaCost,
              cooldown: a.cooldown,
              lastUsed: 0,
              range: a.range,
              effectType: a.effectType,
              value: a.value,
              description: a.description,
              ascii: a.ascii,
            })),
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
            const dmg = building.turretDamage;
            closestEnemy.health -= dmg;
            building.turretLastAttack = now;
            combatEvents.push({
              id: `ce-${Date.now()}-${Math.random()}`,
              type: 'damage',
              position: { ...closestEnemy.position },
              value: dmg,
              timestamp: Date.now(),
              color: team.color,
            });
          }
        }
      }
    });

    team.units = team.units.filter(unit => {
      updateUnitMovement(unit, newState, deltaTime);

      const attackResult = updateUnitCombat(unit, newState, combatEvents, team);
      if (attackResult) combatEvents.push(attackResult);

      if (!unit.targetUnit && !unit.targetBuilding && !unit.moving) {
        autoAttackNearest(unit, newState, combatEvents, team);
      }

      if (unit.isHero && unit.abilities.length > 0) {
        updateHeroAbilities(unit, newState, combatEvents, team);
      }

      if (unit.health <= 0) {
        combatEvents.push({
          id: `ce-${Date.now()}-${Math.random()}`,
          type: 'kill',
          position: { ...unit.position },
          value: 0,
          timestamp: Date.now(),
          color: '#ff3333',
        });

        awardKillExperience(unit, newState);
        return false;
      }

      return true;
    });

    team.buildings = team.buildings.filter(building => {
      if (building.health <= 0) {
        combatEvents.push({
          id: `ce-${Date.now()}-${Math.random()}`,
          type: 'kill',
          position: { ...building.position },
          value: 0,
          timestamp: Date.now(),
          color: '#ff3333',
        });
        return false;
      }
      return true;
    });

    const hasMainBuilding = team.buildings.some(b => b.type === FACTION_CONFIGS[team.faction].mainBuilding);
    if (!hasMainBuilding && team.units.length === 0) {
      team.defeated = true;
    } else if (!hasMainBuilding) {
      team.defeated = true;
    }

    return team;
  });

  newState.map = { ...newState.map, controlPoints: updateControlPoints(newState) };

  newState.teams.forEach(team => {
    if (team.defeated) return;
    team.resources += getControlPointIncome(newState, team.id) * deltaTime / 1000;
  });

  const playerTeam = newState.teams[newState.playerTeam];
  if (playerTeam.defeated) {
    newState.gameOver = 'defeat';
  } else {
    const activeEnemies = newState.teams.filter((t, i) => i !== newState.playerTeam && !t.defeated);
    if (activeEnemies.length === 0) {
      newState.gameOver = 'victory';
    }
  }

  const now = Date.now();
  const existingEvents = newState.combatEvents.filter(e => now - e.timestamp < 1500);
  newState.combatEvents = [...existingEvents, ...combatEvents];

  return newState;
}

function updateUnitMovement(unit: Unit, _state: GameState, deltaTime: number) {
  if (unit.path.length > 0 && unit.pathIndex < unit.path.length) {
    const target = unit.path[unit.pathIndex];
    const dx = target.x - unit.position.x;
    const dy = target.y - unit.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      unit.pathIndex++;
      if (unit.pathIndex >= unit.path.length) {
        unit.path = [];
        unit.pathIndex = 0;
        unit.moving = false;
      }
    } else {
      const moveDistance = (unit.movementSpeed * deltaTime) / 1000;
      unit.position.x += (dx / dist) * moveDistance;
      unit.position.y += (dy / dist) * moveDistance;
    }
    return;
  }

  if (unit.moving && unit.targetPosition) {
    const dx = unit.targetPosition.x - unit.position.x;
    const dy = unit.targetPosition.y - unit.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      unit.moving = false;
      unit.targetPosition = undefined;
    } else {
      const moveDistance = (unit.movementSpeed * deltaTime) / 1000;
      unit.position.x += (dx / dist) * moveDistance;
      unit.position.y += (dy / dist) * moveDistance;
    }
  }
}

function updateUnitCombat(
  unit: Unit,
  state: GameState,
  combatEvents: CombatEvent[],
  team: Team
): CombatEvent | null {
  if (unit.targetUnit) {
    const target = findUnitById(state, unit.targetUnit);
    if (target && target.health > 0) {
      const dx = target.position.x - unit.position.x;
      const dy = target.position.y - unit.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= unit.range) {
        unit.moving = false;
        unit.targetPosition = undefined;
        unit.path = [];
        unit.pathIndex = 0;

        const now = Date.now();
        if (now - unit.lastAttackTime >= unit.attackSpeed * 1000) {
          const hitChance = 1 - target.evasion;
          const dmg = unit.damage * unit.squadSize;
          if (Math.random() < hitChance) {
            target.health -= dmg;
            unit.lastAttackFlash = now;
            combatEvents.push({
              id: `ce-${now}-${Math.random()}`,
              type: 'damage',
              position: { ...target.position },
              value: dmg,
              timestamp: now,
              color: team.color,
            });

            if (target.health <= 0) {
              const xp = calculateXpReward(target);
              unit.experience += xp;
              tryLevelUp(unit);
            }
          } else {
            combatEvents.push({
              id: `ce-${now}-${Math.random()}`,
              type: 'damage',
              position: { ...target.position },
              value: 0,
              timestamp: now,
              color: '#888888',
            });
          }
          unit.lastAttackTime = now;
        }
      } else {
        moveTowardTarget(unit, target.position, state);
      }
    } else {
      unit.targetUnit = undefined;
    }
  }

  if (unit.targetBuilding) {
    const target = findBuildingById(state, unit.targetBuilding);
    if (target && target.health > 0) {
      const dx = target.position.x - unit.position.x;
      const dy = target.position.y - unit.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= unit.range) {
        unit.moving = false;
        unit.targetPosition = undefined;
        unit.path = [];
        unit.pathIndex = 0;

        const now = Date.now();
        if (now - unit.lastAttackTime >= unit.attackSpeed * 1000) {
          const dmg = unit.damage * unit.squadSize;
          target.health -= dmg;
          unit.lastAttackFlash = now;
          combatEvents.push({
            id: `ce-${now}-${Math.random()}`,
            type: 'damage',
            position: { ...target.position },
            value: dmg,
            timestamp: now,
            color: team.color,
          });
          unit.lastAttackTime = now;
        }
      } else {
        moveTowardTarget(unit, target.position, state);
      }
    } else {
      unit.targetBuilding = undefined;
    }
  }

  return null;
}

function moveTowardTarget(unit: Unit, targetPos: Position, state: GameState) {
  const dist = distance(unit.position, targetPos);
  if (dist > unit.range * 1.5 && unit.path.length === 0) {
    const mapSize = state.map.width > 50 ? 'medium' as MapSize : 'small' as MapSize;
    const path = findPathWorld(state.map, unit.position, targetPos, mapSize);
    if (path.length > 1) {
      unit.path = path.slice(1);
      unit.pathIndex = 0;
      unit.moving = true;
    } else {
      unit.targetPosition = targetPos;
      unit.moving = true;
    }
  } else if (unit.path.length === 0) {
    unit.targetPosition = targetPos;
    unit.moving = true;
  }
}

function autoAttackNearest(
  unit: Unit,
  state: GameState,
  _combatEvents: CombatEvent[],
  team: Team
) {
  if (isBuilder(unit.type)) return;

  let closestEnemy: Unit | undefined;
  let closestDist = unit.range * 1.5;

  state.teams.forEach(enemyTeam => {
    if (enemyTeam.id === team.id) return;
    enemyTeam.units.forEach(enemyUnit => {
      const d = distance(unit.position, enemyUnit.position);
      if (d < closestDist) {
        closestDist = d;
        closestEnemy = enemyUnit;
      }
    });
  });

  if (closestEnemy) {
    unit.targetUnit = closestEnemy.id;
  }
}

function updateHeroAbilities(
  unit: Unit,
  state: GameState,
  combatEvents: CombatEvent[],
  team: Team
) {
  if (!unit.isHero) return;

  const now = Date.now();

  for (const ability of unit.abilities) {
    if (now - ability.lastUsed < ability.cooldown) continue;
    if (unit.mana < ability.manaCost) continue;

    let target: Unit | Building | undefined;
    let targetDist = ability.range;

    if (ability.effectType === 'damage' || ability.effectType === 'aoe') {
      state.teams.forEach(enemyTeam => {
        if (enemyTeam.id === team.id) return;
        enemyTeam.units.forEach(enemyUnit => {
          const d = distance(unit.position, enemyUnit.position);
          if (d < targetDist) {
            targetDist = d;
            target = enemyUnit;
          }
        });
      });
    } else if (ability.effectType === 'heal' || ability.effectType === 'buff') {
      team.units.forEach(allyUnit => {
        if (allyUnit.id === unit.id) return;
        const d = distance(unit.position, allyUnit.position);
        if (d < targetDist && allyUnit.health < allyUnit.maxHealth) {
          targetDist = d;
          target = allyUnit;
        }
      });
    }

    if (target && 'health' in target) {
      if (ability.effectType === 'damage' || ability.effectType === 'aoe') {
        (target as Unit).health -= ability.value;
        combatEvents.push({
          id: `ce-${now}-${Math.random()}`,
          type: 'damage',
          position: { ...target.position },
          value: ability.value,
          timestamp: now,
          color: '#ff8800',
        });
      } else if (ability.effectType === 'heal') {
        const healTarget = target as Unit;
        healTarget.health = Math.min(healTarget.health + ability.value, healTarget.maxHealth);
        combatEvents.push({
          id: `ce-${now}-${Math.random()}`,
          type: 'damage',
          position: { ...healTarget.position },
          value: -ability.value,
          timestamp: now,
          color: '#22dd22',
        });
      } else if (ability.effectType === 'buff') {
        (target as Unit).damage += ability.value;
        setTimeout(() => { if ((target as Unit).health > 0) (target as Unit).damage -= ability.value; }, 5000);
      }

      unit.mana -= ability.manaCost;
      ability.lastUsed = now;
      break;
    }
  }

  if (unit.maxMana > 0) {
    unit.mana = Math.min(unit.mana + 0.5, unit.maxMana);
  }
}

function calculateXpReward(victim: Unit): number {
  const config = UNIT_CONFIGS[victim.type];
  return Math.floor((config.cost * 0.5) + (victim.level - 1) * 10 + (victim.isHero ? 100 : 0));
}

function tryLevelUp(unit: Unit) {
  while (unit.experience >= unit.experienceToLevel) {
    unit.experience -= unit.experienceToLevel;
    unit.level++;
    unit.experienceToLevel = Math.floor(unit.experienceToLevel * 1.5);
    unit.pendingLevelUps++;
  }
}

export function applyLevelUp(unit: Unit, stat: LevelUpStat): boolean {
  if (unit.pendingLevelUps <= 0) return false;

  switch (stat) {
    case 'movementSpeed': unit.movementSpeed += 5; break;
    case 'health': unit.maxHealth += 20; unit.health = Math.min(unit.health + 20, unit.maxHealth); break;
    case 'damage': unit.damage += 3; break;
    case 'attackSpeed': unit.attackSpeed = Math.max(0.3, unit.attackSpeed - 0.05); break;
    case 'mana': unit.maxMana += 15; unit.mana = Math.min(unit.mana + 15, unit.maxMana); break;
    case 'range': unit.range += 10; break;
    case 'evasion': unit.evasion = Math.min(0.5, unit.evasion + 0.01); break;
  }

  unit.pendingLevelUps--;
  return true;
}

export function autoLevelUp(unit: Unit) {
  const stats: LevelUpStat[] = ['movementSpeed', 'health', 'damage', 'attackSpeed', 'mana', 'range', 'evasion'];
  while (unit.pendingLevelUps > 0) {
    const stat = stats[Math.floor(Math.random() * stats.length)];
    applyLevelUp(unit, stat);
  }
}

function awardKillExperience(killedUnit: Unit, state: GameState) {
  const killerTeamId = findKillerTeam(killedUnit, state);
  if (killerTeamId === null) return;

  const xp = calculateXpReward(killedUnit);
  const killerTeam = state.teams[killerTeamId];
  killerTeam.units.forEach(unit => {
    if (distance(unit.position, killedUnit.position) < 300) {
      unit.experience += Math.floor(xp * 0.3);
      tryLevelUp(unit);
      if (!unit.isHero) autoLevelUp(unit);
    }
  });
}

function findKillerTeam(victim: Unit, state: GameState): number | null {
  for (const team of state.teams) {
    if (team.id === victim.teamId) continue;
    const hasAttacker = team.units.some(u => u.targetUnit === victim.id);
    if (hasAttacker) return team.id;
  }
  return null;
}

function updateControlPoints(state: GameState): ControlPoint[] {
  const tileSize = 32;
  return state.map.controlPoints.map(cp => {
    const newCp = { ...cp, captureProgress: [...cp.captureProgress] };

    const nearbyTeams = new Map<number, number>();
    state.teams.forEach(team => {
      if (team.defeated) return;
      const count = team.units.filter(u =>
        distance(u.position, { x: cp.position.x * tileSize + tileSize / 2, y: cp.position.y * tileSize + tileSize / 2 }) < 80
      ).length;
      if (count > 0) nearbyTeams.set(team.id, count);
    });

    if (nearbyTeams.size === 1) {
      const entry = nearbyTeams.entries().next().value as [number, number] | undefined;
      const teamId = entry ? entry[0] : -1;
      if (teamId >= 0) {
        newCp.captureProgress[teamId] += 0.008;
        for (let i = 0; i < 4; i++) {
          if (i !== teamId && newCp.captureProgress[i] > 0) {
            newCp.captureProgress[i] = Math.max(0, newCp.captureProgress[i] - 0.004);
          }
        }
      }
    } else if (nearbyTeams.size > 1) {
      const dominant = [...nearbyTeams.entries()].sort((a, b) => b[1] - a[1])[0];
      const others = [...nearbyTeams.entries()].filter(e => e[0] !== dominant[0]);
      const otherCount = others.reduce((s, e) => s + e[1], 0);

      if (dominant[1] > otherCount) {
        newCp.captureProgress[dominant[0]] += 0.004;
      }
    }

    if (cp.owner !== null) {
      for (let i = 0; i < 4; i++) {
        if (i !== cp.owner && newCp.captureProgress[i] > 0.5) {
          newCp.captureProgress[cp.owner] = Math.max(0, newCp.captureProgress[cp.owner] - 0.006);
          if (newCp.captureProgress[cp.owner] <= 0) {
            newCp.owner = null;
            newCp.captureProgress = [0, 0, 0, 0];
          }
        }
      }
    }

    const maxCapture = Math.max(...newCp.captureProgress);
    if (maxCapture >= 1 && cp.owner === null) {
      const ownerIdx = newCp.captureProgress.findIndex(v => v >= 1);
      newCp.owner = ownerIdx;
      newCp.captureProgress = [0, 0, 0, 0];
      newCp.captureProgress[ownerIdx] = 1;
    }

    return newCp;
  });
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

export function getMapSizeFromState(state: GameState): MapSize {
  if (state.map.width >= 70) return 'large';
  if (state.map.width >= 50) return 'medium';
  return 'small';
}
