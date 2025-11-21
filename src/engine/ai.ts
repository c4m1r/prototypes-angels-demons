import { GameState, Team, Unit, Building, UnitType, BuildingType } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';

export function updateAI(state: GameState): GameState {
  const newState = { ...state };

  newState.teams.forEach((team, teamIndex) => {
    if (team.isPlayer) return;

    const mainBuilding = team.buildings.find(b =>
      b.type === 'heaven_temple' || b.type === 'hell_sanctuary'
    );

    if (!mainBuilding) return;

    const builderType: UnitType = team.faction === 'angels' ? 'servant' : 'slave';
    const hasBuilder = team.units.some(u => u.type === builderType);

    if (!hasBuilder && team.resources >= 15 && !mainBuilding.producing) {
      mainBuilding.producing = builderType;
      mainBuilding.productionTime = UNIT_CONFIGS[builderType].buildTime;
      mainBuilding.productionProgress = 0;
      team.resources -= UNIT_CONFIGS[builderType].cost;
    }

    if (team.resources >= 80) {
      const hasResourceBuilding = team.buildings.some(b =>
        b.type === 'holy_altar' || b.type === 'dark_altar'
      );

      if (!hasResourceBuilding) {
        const builder = team.units.find(u => u.type === builderType);
        if (builder && !builder.moving) {
          const buildingType: BuildingType = team.faction === 'angels' ? 'holy_altar' : 'dark_altar';
          const config = BUILDING_CONFIGS[buildingType];

          const newBuilding: Building = {
            id: `building-${teamIndex}-${Date.now()}`,
            type: buildingType,
            faction: team.faction,
            position: {
              x: mainBuilding.position.x + 150,
              y: mainBuilding.position.y + 150,
            },
            health: config.health,
            maxHealth: config.health,
            selected: false,
            productionProgress: 0,
            productionTime: 0,
          };

          team.buildings.push(newBuilding);
          team.resources -= config.cost;
        }
      }
    }

    if (team.resources >= 150 && team.buildings.length < 3) {
      const hasBarracks = team.buildings.some(b =>
        b.type === 'heart_heaven' || b.type === 'heart_hell'
      );

      if (!hasBarracks) {
        const builder = team.units.find(u => u.type === builderType);
        if (builder && !builder.moving) {
          const buildingType: BuildingType = team.faction === 'angels' ? 'heart_heaven' : 'heart_hell';
          const config = BUILDING_CONFIGS[buildingType];

          const newBuilding: Building = {
            id: `building-${teamIndex}-${Date.now()}`,
            type: buildingType,
            faction: team.faction,
            position: {
              x: mainBuilding.position.x - 150,
              y: mainBuilding.position.y + 150,
            },
            health: config.health,
            maxHealth: config.health,
            selected: false,
            productionProgress: 0,
            productionTime: 0,
          };

          team.buildings.push(newBuilding);
          team.resources -= config.cost;
        }
      }
    }

    const productionBuildings = team.buildings.filter(b =>
      !b.producing && BUILDING_CONFIGS[b.type].canProduce
    );

    productionBuildings.forEach(building => {
      const canProduce = BUILDING_CONFIGS[building.type].canProduce;
      if (!canProduce || canProduce.length === 0) return;

      let unitType: UnitType | undefined;

      if (team.resources >= 100 && canProduce.includes('seraphim' as UnitType)) {
        unitType = team.faction === 'angels' ? 'seraphim' : 'infernal';
      } else if (team.resources >= 80 && canProduce.includes('paladin' as UnitType)) {
        unitType = team.faction === 'angels' ? 'paladin' : 'hellknight';
      } else if (team.resources >= 72 && canProduce.includes('angel' as UnitType)) {
        unitType = team.faction === 'angels' ? 'angel' : 'demon';
      } else if (team.resources >= 40 && canProduce.includes('priest' as UnitType)) {
        unitType = team.faction === 'angels' ? 'priest' : 'cultist';
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

      if (!unit.targetUnit && !unit.moving) {
        let closestEnemy: Unit | undefined;
        let closestDistance = Infinity;

        enemyTeams.forEach(enemyTeam => {
          enemyTeam.units.forEach(enemyUnit => {
            const dx = enemyUnit.position.x - unit.position.x;
            const dy = enemyUnit.position.y - unit.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestEnemy = enemyUnit;
            }
          });

          enemyTeam.buildings.forEach(enemyBuilding => {
            const dx = enemyBuilding.position.x - unit.position.x;
            const dy = enemyBuilding.position.y - unit.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < closestDistance && distance < 500) {
              closestDistance = distance;
            }
          });
        });

        if (closestEnemy && closestDistance < 800) {
          unit.targetUnit = closestEnemy.id;
        } else if (closestDistance < 300) {
          const centerX = state.mapSize.width / 2;
          const centerY = state.mapSize.height / 2;
          unit.targetPosition = { x: centerX, y: centerY };
          unit.moving = true;
        }
      }
    });
  });

  return newState;
}
