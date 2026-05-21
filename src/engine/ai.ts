import {
  GameState, Team, Unit, Building, UnitType, BuildingType,
  FACTION_CONFIGS, AIProfile, Position, LevelUpStat,
} from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { distance, isBuilder, applyLevelUp } from './gameEngine';

export function updateAI(state: GameState): GameState {
  const newState = { ...state };
  const now = Date.now();

  newState.teams.forEach((team, teamIndex) => {
    if (team.isPlayer || team.defeated) return;

    const profile = team.aiProfile;
    const factionConfig = FACTION_CONFIGS[team.faction];
    const mainBuilding = team.buildings.find(b => b.type === factionConfig.mainBuilding);
    if (!mainBuilding) return;

    const builderType = factionConfig.builderUnit;
    const hasBuilder = team.units.some(u => u.type === builderType);

    if (!hasBuilder && team.resources >= 15 && !mainBuilding.producing) {
      mainBuilding.producing = builderType;
      mainBuilding.productionTime = UNIT_CONFIGS[builderType].buildTime;
      mainBuilding.productionProgress = 0;
      team.resources -= UNIT_CONFIGS[builderType].cost;
    }

    if (now - profile.lastBuildTime > 20000 / profile.economyRate) {
      if (team.resources >= 80) {
        const hasResourceBuilding = team.buildings.some(b => b.type === factionConfig.resourceBuilding);
        if (!hasResourceBuilding) {
          const newBuilding = createBuilding(team, factionConfig.resourceBuilding, mainBuilding.position, teamIndex);
          if (newBuilding) {
            team.buildings.push(newBuilding);
            team.resources -= BUILDING_CONFIGS[factionConfig.resourceBuilding].cost;
            profile.lastBuildTime = now;
          }
        }
      }

      if (team.resources >= 150 && team.buildings.length < 5) {
        const hasBarracks = team.buildings.some(b => b.type === factionConfig.barracksBuilding);
        if (!hasBarracks) {
          const newBuilding = createBuilding(team, factionConfig.barracksBuilding, mainBuilding.position, teamIndex);
          if (newBuilding) {
            team.buildings.push(newBuilding);
            team.resources -= BUILDING_CONFIGS[factionConfig.barracksBuilding].cost;
            profile.lastBuildTime = now;
          }
        }
      }

      if (profile.defensePriority > 0.5 && team.resources >= 70) {
        const turretCount = team.buildings.filter(b => b.isTurret).length;
        if (turretCount < 2) {
          const newBuilding = createBuilding(team, factionConfig.turretBuilding, mainBuilding.position, teamIndex);
          if (newBuilding) {
            team.buildings.push(newBuilding);
            team.resources -= BUILDING_CONFIGS[factionConfig.turretBuilding].cost;
            profile.lastBuildTime = now;
          }
        }
      }
    }

    const productionBuildings = team.buildings.filter(b =>
      !b.producing && BUILDING_CONFIGS[b.type].canProduce && BUILDING_CONFIGS[b.type].canProduce!.length > 0
    );

    productionBuildings.forEach(building => {
      const canProduce = BUILDING_CONFIGS[building.type].canProduce;
      if (!canProduce || canProduce.length === 0) return;

      let unitType: UnitType | undefined;

      if (team.resources >= 200 && canProduce.some(u => UNIT_CONFIGS[u].isHero)) {
        const hasHero = team.units.some(u => u.isHero);
        if (!hasHero) {
          unitType = canProduce.find(u => UNIT_CONFIGS[u].isHero);
        }
      }

      if (!unitType && team.resources >= 100) {
        const expensive = canProduce.filter(u => UNIT_CONFIGS[u].cost >= 70 && !UNIT_CONFIGS[u].isHero);
        if (expensive.length > 0) unitType = expensive[Math.floor(Math.random() * expensive.length)];
      }

      if (!unitType && team.resources >= 40) {
        const cheap = canProduce.filter(u => UNIT_CONFIGS[u].cost < 70 && !UNIT_CONFIGS[u].isHero);
        if (cheap.length > 0) unitType = cheap[Math.floor(Math.random() * cheap.length)];
      }

      if (unitType) {
        const config = UNIT_CONFIGS[unitType];
        building.producing = unitType;
        building.productionTime = config.buildTime;
        building.productionProgress = 0;
        team.resources -= config.cost;
      }
    });

    if (now - profile.lastAttackTime > profile.attackInterval) {
      const combatUnits = team.units.filter(u => u.type !== builderType && !u.targetUnit && !u.targetBuilding && !u.moving);

      if (combatUnits.length >= profile.squadSize) {
        const squad = combatUnits.slice(0, profile.squadSize);
        const target = findAttackTarget(newState, teamIndex, profile);

        if (target) {
          squad.forEach(unit => {
            if ('faction' in target && 'squadSize' in target) {
              unit.targetUnit = (target as Unit).id;
            } else {
              unit.targetBuilding = (target as Building).id;
            }
          });
          profile.lastAttackTime = now;
        }
      }

      if (profile.personality === 'rusher') {
        const idleCombat = team.units.filter(u => u.type !== builderType && !u.targetUnit && !u.targetBuilding && !u.moving);
        if (idleCombat.length > 0) {
          const target = findAttackTarget(newState, teamIndex, profile);
          if (target) {
            const scout = idleCombat[0];
            if ('faction' in target && 'squadSize' in target) {
              scout.targetUnit = (target as Unit).id;
            } else {
              scout.targetBuilding = (target as Building).id;
            }
          }
        }
      }
    }

    if (now - profile.lastCaptureTime > 15000 / profile.capturePriority) {
      const idleUnits = team.units.filter(u => u.type !== builderType && !u.targetUnit && !u.targetBuilding && !u.moving);
      if (idleUnits.length > 0) {
        const uncaptured = newState.map.controlPoints.filter(cp => cp.owner !== team.id);
        if (uncaptured.length > 0) {
          const cp = uncaptured[profile.targetPointIndex % uncaptured.length];
          profile.targetPointIndex++;
          const tileSize = 32;
          const cpWorldPos = { x: cp.position.x * tileSize + tileSize / 2, y: cp.position.y * tileSize + tileSize / 2 };

          const unit = idleUnits[0];
          unit.targetPosition = cpWorldPos;
          unit.moving = true;
          profile.lastCaptureTime = now;
        }
      }
    }

    team.units.forEach(unit => {
      if (isBuilder(unit.type)) return;
      if (unit.pendingLevelUps > 0) {
        const stats: LevelUpStat[] = ['health', 'damage', 'attackSpeed', 'movementSpeed', 'evasion', 'range', 'mana'];
        while (unit.pendingLevelUps > 0) {
          const stat = stats[Math.floor(Math.random() * stats.length)];
          applyLevelUp(unit, stat);
        }
      }
    });
  });

  return newState;
}

function createBuilding(
  team: Team,
  buildingType: BuildingType,
  basePos: Position,
  teamIndex: number
): Building | null {
  const config = BUILDING_CONFIGS[buildingType];
  if (team.resources < config.cost) return null;

  const offset = (team.buildings.length % 4) * 100;
  const angle = (team.buildings.length % 4) * Math.PI / 2;

  return {
    id: `building-${teamIndex}-${Date.now()}`,
    type: buildingType,
    faction: team.faction,
    teamId: team.id,
    position: {
      x: basePos.x + Math.cos(angle) * (120 + offset),
      y: basePos.y + Math.sin(angle) * (120 + offset),
    },
    health: config.health,
    maxHealth: config.health,
    selected: false,
    productionProgress: 0,
    productionTime: 0,
    isTurret: config.isTurret,
    turretRange: config.turretRange,
    turretDamage: config.turretDamage,
    turretLastAttack: 0,
  };
}

function findAttackTarget(
  state: GameState,
  teamIndex: number,
  profile: AIProfile
): Unit | Building | null {
  const team = state.teams[teamIndex];
  const mainBuilding = team.buildings[0];
  if (!mainBuilding) return null;

  let bestTarget: Unit | Building | null = null;
  let bestScore = -Infinity;

  state.teams.forEach((enemyTeam, enemyIdx) => {
    if (enemyIdx === teamIndex || enemyTeam.defeated) return;

    enemyTeam.units.forEach(enemyUnit => {
      const d = distance(mainBuilding.position, enemyUnit.position);
      const score = 1000 - d + (enemyUnit.isHero ? 500 : 0) - enemyUnit.health * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemyUnit;
      }
    });

    enemyTeam.buildings.forEach(enemyBuilding => {
      const d = distance(mainBuilding.position, enemyBuilding.position);
      const isMain = enemyBuilding.type === FACTION_CONFIGS[enemyTeam.faction].mainBuilding;
      const score = 800 - d + (isMain ? 1000 : 0) - enemyBuilding.health * 0.3;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemyBuilding;
      }
    });
  });

  if (profile.personality === 'rusher' && bestTarget) {
    const playerTeam = state.teams[state.playerTeam];
    if (!playerTeam.defeated) {
      const playerMain = playerTeam.buildings.find(b => b.type === FACTION_CONFIGS[playerTeam.faction].mainBuilding);
      if (playerMain) return playerMain;
    }
  }

  return bestTarget;
}
