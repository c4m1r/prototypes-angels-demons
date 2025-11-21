import { GameState, Team, Unit, Building, FactionType, Position, UnitType, BuildingType } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';

const MAP_SIZE = { width: 2000, height: 2000 };
const TEAM_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export function initializeGame(playerFaction: FactionType): GameState {
  const teams: Team[] = [];
  const startPositions = [
    { x: 200, y: 200 },
    { x: MAP_SIZE.width - 200, y: 200 },
    { x: 200, y: MAP_SIZE.height - 200 },
    { x: MAP_SIZE.width - 200, y: MAP_SIZE.height - 200 },
  ];

  const playerTeamIndex = Math.floor(Math.random() * 4);

  for (let i = 0; i < 4; i++) {
    const isPlayer = i === playerTeamIndex;
    const faction = isPlayer ? playerFaction : (Math.random() > 0.5 ? 'angels' : 'demons');
    const startPos = startPositions[i];

    const mainBuildingType: BuildingType = faction === 'angels' ? 'heaven_temple' : 'hell_sanctuary';
    const builderType: UnitType = faction === 'angels' ? 'servant' : 'slave';

    const mainBuilding: Building = {
      id: `building-${i}-0`,
      type: mainBuildingType,
      faction,
      position: startPos,
      health: BUILDING_CONFIGS[mainBuildingType].health,
      maxHealth: BUILDING_CONFIGS[mainBuildingType].health,
      selected: false,
      productionProgress: 0,
      productionTime: 0,
    };

    const builder: Unit = {
      id: `unit-${i}-0`,
      type: builderType,
      faction,
      position: { x: startPos.x + 100, y: startPos.y },
      health: UNIT_CONFIGS[builderType].health,
      maxHealth: UNIT_CONFIGS[builderType].health,
      squadSize: 1,
      maxSquadSize: 1,
      damage: UNIT_CONFIGS[builderType].damage,
      range: UNIT_CONFIGS[builderType].range,
      attackSpeed: UNIT_CONFIGS[builderType].attackSpeed,
      selected: false,
      moving: false,
      lastAttackTime: 0,
    };

    teams.push({
      id: i,
      faction,
      resources: 300,
      units: [builder],
      buildings: [mainBuilding],
      isPlayer,
      color: TEAM_COLORS[i],
    });
  }

  return {
    teams,
    playerTeam: playerTeamIndex,
    selectedUnits: [],
    mapSize: MAP_SIZE,
    gameStarted: true,
  };
}

export function updateGame(state: GameState, deltaTime: number): GameState {
  const newState = { ...state };

  newState.teams = newState.teams.map(team => {
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
            position: {
              x: building.position.x + 80,
              y: building.position.y + 80
            },
            health: config.health * config.initialSquadSize,
            maxHealth: config.health * config.maxSquadSize,
            squadSize: config.initialSquadSize,
            maxSquadSize: config.maxSquadSize,
            damage: config.damage,
            range: config.range,
            attackSpeed: config.attackSpeed,
            selected: false,
            moving: false,
            lastAttackTime: 0,
          };

          team.units.push(newUnit);
          building.producing = undefined;
          building.productionProgress = 0;
          building.productionTime = 0;
        }
      }
    });

    team.units = team.units.filter(unit => {
      if (unit.moving && unit.targetPosition) {
        const dx = unit.targetPosition.x - unit.position.x;
        const dy = unit.targetPosition.y - unit.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          unit.moving = false;
          unit.targetPosition = undefined;
        } else {
          const speed = 100;
          const moveDistance = (speed * deltaTime) / 1000;
          unit.position.x += (dx / distance) * moveDistance;
          unit.position.y += (dy / distance) * moveDistance;
        }
      }

      if (unit.targetUnit) {
        const target = findUnitById(newState, unit.targetUnit);
        if (target && target.health > 0) {
          const dx = target.position.x - unit.position.x;
          const dy = target.position.y - unit.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= unit.range) {
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
          unit.targetUnit = undefined;
        }
      }

      return unit.health > 0;
    });

    team.buildings = team.buildings.filter(building => building.health > 0);

    return team;
  });

  return newState;
}

function findUnitById(state: GameState, unitId: string): Unit | undefined {
  for (const team of state.teams) {
    const unit = team.units.find(u => u.id === unitId);
    if (unit) return unit;
  }
  return undefined;
}

export function distance(p1: Position, p2: Position): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
