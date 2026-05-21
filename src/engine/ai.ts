import { GameState, Unit, Building, UnitType, BuildingType, FACTION_CONFIGS } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { distance } from './gameEngine';

export function updateAI(state: GameState): GameState {
  const newState = { ...state };

  newState.teams.forEach((team, teamIndex) => {
    if (team.isPlayer || team.defeated) return;

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

    if (team.resources >= 80) {
      const hasResourceBuilding = team.buildings.some(b => b.type === factionConfig.resourceBuilding);

      if (!hasResourceBuilding) {
        const builder = team.units.find(u => u.type === builderType);
        if (builder && !builder.moving) {
          const buildingType: BuildingType = factionConfig.resourceBuilding;
          const config = BUILDING_CONFIGS[buildingType];

          const newBuilding: Building = {
            id: `building-${teamIndex}-${Date.now()}`,
            type: buildingType,
            faction: team.faction,
            teamId: team.id,
            position: {
              x: mainBuilding.position.x + 150,
              y: mainBuilding.position.y + 150,
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

          team.buildings.push(newBuilding);
          team.resources -= config.cost;
        }
      }
    }

    if (team.resources >= 150 && team.buildings.length < 4) {
      const hasBarracks = team.buildings.some(b => b.type === factionConfig.barracksBuilding);

      if (!hasBarracks) {
        const builder = team.units.find(u => u.type === builderType);
        if (builder && !builder.moving) {
          const buildingType: BuildingType = factionConfig.barracksBuilding;
          const config = BUILDING_CONFIGS[buildingType];

          const newBuilding: Building = {
            id: `building-${teamIndex}-${Date.now()}`,
            type: buildingType,
            faction: team.faction,
            teamId: team.id,
            position: {
              x: mainBuilding.position.x - 150,
              y: mainBuilding.position.y + 150,
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

          team.buildings.push(newBuilding);
          team.resources -= config.cost;
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
        unitType = canProduce.find(u => UNIT_CONFIGS[u].isHero);
      } else if (team.resources >= 100) {
        const expensive = canProduce.filter(u => UNIT_CONFIGS[u].cost >= 70 && !UNIT_CONFIGS[u].isHero);
        if (expensive.length > 0) unitType = expensive[0];
      } else if (team.resources >= 40) {
        const cheap = canProduce.filter(u => UNIT_CONFIGS[u].cost < 70 && !UNIT_CONFIGS[u].isHero);
        if (cheap.length > 0) unitType = cheap[0];
      }

      if (unitType) {
        const config = UNIT_CONFIGS[unitType];
        building.producing = unitType;
        building.productionTime = config.buildTime;
        building.productionProgress = 0;
        team.resources -= config.cost;
      }
    });

    const enemyTeams = newState.teams.filter((_, idx) => idx !== teamIndex);

    team.units.forEach(unit => {
      if (unit.type === builderType) return;

      if (!unit.targetUnit && !unit.targetBuilding && !unit.moving) {
        let closestEnemy: Unit | undefined;
        let closestEnemyDist = Infinity;
        let closestBuilding: Building | undefined;
        let closestBuildingDist = Infinity;

        enemyTeams.forEach(enemyTeam => {
          if (enemyTeam.defeated) return;
          enemyTeam.units.forEach(enemyUnit => {
            const d = distance(unit.position, enemyUnit.position);
            if (d < closestEnemyDist) {
              closestEnemyDist = d;
              closestEnemy = enemyUnit;
            }
          });

          enemyTeam.buildings.forEach(enemyBuilding => {
            const d = distance(unit.position, enemyBuilding.position);
            if (d < closestBuildingDist) {
              closestBuildingDist = d;
              closestBuilding = enemyBuilding;
            }
          });
        });

        if (closestEnemy && closestEnemyDist < 600) {
          unit.targetUnit = closestEnemy.id;
        } else if (closestBuilding && closestBuildingDist < 800) {
          unit.targetBuilding = closestBuilding.id;
        } else {
          const cp = state.map.controlPoints.find(cp => cp.owner !== team.id);
          if (cp) {
            unit.targetPosition = { x: cp.position.x * 32 + 16, y: cp.position.y * 32 + 16 };
            unit.moving = true;
          }
        }
      }
    });
  });

  return newState;
}
