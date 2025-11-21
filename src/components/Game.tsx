import { useState, useEffect, useCallback } from 'react';
import { GameState, FactionType, Position, Unit, Building, UnitType, BuildingType } from '../types/game';
import { initializeGame, updateGame, distance } from '../engine/gameEngine';
import { updateAI } from '../engine/ai';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';

interface GameProps {
  faction: FactionType;
}

export default function Game({ faction }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(faction));
  const [mouseDownPos, setMouseDownPos] = useState<Position | null>(null);
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prevState => {
        let newState = updateGame(prevState, 100);
        newState = updateAI(newState);
        return newState;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = useCallback((pos: Position) => {
    setMouseDownPos(pos);
    setGameState(prev => ({
      ...prev,
      selectionBox: { start: pos, end: pos },
    }));
  }, []);

  const handleMouseMove = useCallback((pos: Position) => {
    if (mouseDownPos) {
      setGameState(prev => ({
        ...prev,
        selectionBox: { start: mouseDownPos, end: pos },
      }));
    }
  }, [mouseDownPos]);

  const handleMouseUp = useCallback((pos: Position) => {
    if (!mouseDownPos) return;

    const playerTeam = gameState.teams[gameState.playerTeam];
    const minX = Math.min(mouseDownPos.x, pos.x);
    const maxX = Math.max(mouseDownPos.x, pos.x);
    const minY = Math.min(mouseDownPos.y, pos.y);
    const maxY = Math.max(mouseDownPos.y, pos.y);

    const selectedUnitIds: string[] = [];
    const selectedBuildingIds: string[] = [];

    playerTeam.units.forEach(unit => {
      const inBox = unit.position.x >= minX && unit.position.x <= maxX &&
                    unit.position.y >= minY && unit.position.y <= maxY;

      if (inBox) {
        selectedUnitIds.push(unit.id);
        unit.selected = true;
      } else {
        unit.selected = false;
      }
    });

    if (selectedUnitIds.length === 0) {
      playerTeam.buildings.forEach(building => {
        const inBox = building.position.x >= minX && building.position.x <= maxX &&
                      building.position.y >= minY && building.position.y <= maxY;

        if (inBox) {
          selectedBuildingIds.push(building.id);
          building.selected = true;
        } else {
          building.selected = false;
        }
      });
    } else {
      playerTeam.buildings.forEach(b => b.selected = false);
    }

    setGameState(prev => ({
      ...prev,
      selectedUnits: selectedUnitIds,
      selectionBox: undefined,
    }));

    setMouseDownPos(null);
  }, [mouseDownPos, gameState.playerTeam, gameState.teams]);

  const handleRightClick = useCallback((worldPos: Position) => {
    const playerTeam = gameState.teams[gameState.playerTeam];

    if (buildMode) {
      const config = BUILDING_CONFIGS[buildMode];

      if (playerTeam.resources >= config.cost) {
        const newBuilding: Building = {
          id: `building-${gameState.playerTeam}-${Date.now()}`,
          type: buildMode,
          faction: playerTeam.faction,
          position: worldPos,
          health: config.health,
          maxHealth: config.health,
          selected: false,
          productionProgress: 0,
          productionTime: 0,
        };

        playerTeam.buildings.push(newBuilding);
        playerTeam.resources -= config.cost;

        setGameState({ ...gameState });
      }

      setBuildMode(null);
      return;
    }

    let targetUnit: Unit | undefined;
    let targetBuilding: Building | undefined;

    gameState.teams.forEach(team => {
      if (team.id === gameState.playerTeam) return;

      team.units.forEach(unit => {
        if (distance(unit.position, worldPos) < 30) {
          targetUnit = unit;
        }
      });

      team.buildings.forEach(building => {
        if (distance(building.position, worldPos) < 50) {
          targetBuilding = building;
        }
      });
    });

    const selectedUnits = playerTeam.units.filter(u => u.selected);

    if (targetUnit) {
      selectedUnits.forEach(unit => {
        unit.targetUnit = targetUnit!.id;
        unit.targetPosition = undefined;
      });
    } else if (targetBuilding) {
      selectedUnits.forEach(unit => {
        const isBuilder = unit.type === 'servant' || unit.type === 'slave';

        if (isBuilder) {
          unit.targetPosition = targetBuilding!.position;
          unit.moving = true;
        }
      });
    } else {
      playerTeam.buildings.forEach(building => {
        if (building.selected && distance(building.position, worldPos) < 80) {
          const isBuilder = selectedUnits.some(u => u.type === 'servant' || u.type === 'slave');

          if (isBuilder && building.health < building.maxHealth) {
            building.health = Math.min(building.health + 50, building.maxHealth);
            playerTeam.resources -= 10;
          }
        }
      });

      selectedUnits.forEach(unit => {
        unit.targetPosition = worldPos;
        unit.moving = true;
        unit.targetUnit = undefined;
      });
    }

    setGameState({ ...gameState });
  }, [gameState, buildMode]);

  const handleProduceUnit = useCallback((building: Building, unitType: UnitType) => {
    const playerTeam = gameState.teams[gameState.playerTeam];
    const config = UNIT_CONFIGS[unitType];

    if (playerTeam.resources >= config.cost) {
      building.producing = unitType;
      building.productionTime = config.buildTime;
      building.productionProgress = 0;
      playerTeam.resources -= config.cost;

      setGameState({ ...gameState });
    }
  }, [gameState]);

  const handleBuildBuilding = useCallback((buildingType: BuildingType) => {
    setBuildMode(buildingType);
  }, []);

  const handleAddToSquad = useCallback((unit: Unit) => {
    const playerTeam = gameState.teams[gameState.playerTeam];
    const addCost = 10;

    if (playerTeam.resources >= addCost && unit.squadSize < unit.maxSquadSize) {
      unit.squadSize++;
      unit.health += UNIT_CONFIGS[unit.type].health;
      unit.maxHealth += UNIT_CONFIGS[unit.type].health;
      playerTeam.resources -= addCost;

      setGameState({ ...gameState });
    }
  }, [gameState]);

  const playerTeam = gameState.teams[gameState.playerTeam];
  const selectedUnits = playerTeam.units.filter(u => u.selected);
  const selectedBuildings = playerTeam.buildings.filter(b => b.selected);

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-[1fr_350px] gap-4">
          <div>
            <GameCanvas
              gameState={gameState}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onRightClick={handleRightClick}
            />
            {buildMode && (
              <div className="mt-2 p-2 bg-yellow-600 text-white rounded text-center">
                Режим строительства: {BUILDING_CONFIGS[buildMode].name}
                <br />
                Нажмите ПКМ для размещения или ESC для отмены
              </div>
            )}
          </div>

          <div>
            <GameUI
              gameState={gameState}
              selectedUnits={selectedUnits}
              selectedBuildings={selectedBuildings}
              onProduceUnit={handleProduceUnit}
              onBuildBuilding={handleBuildBuilding}
              onAddToSquad={handleAddToSquad}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
