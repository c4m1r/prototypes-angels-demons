import { useState, useEffect, useCallback } from 'react';
import {
  GameState, FactionType, Position, Unit, Building, UnitType, BuildingType,
  MapSize, Difficulty, MAP_SIZES,
} from '../types/game';
import { initializeGame, updateGame, distance, isBuilder } from '../engine/gameEngine';
import { updateAI } from '../engine/ai';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';

interface GameProps {
  faction: FactionType;
  mapSize: MapSize;
  difficulty: Difficulty;
}

export default function Game({ faction, mapSize, difficulty }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(faction, mapSize, difficulty));
  const [mouseDownPos, setMouseDownPos] = useState<Position | null>(null);
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [camera, setCamera] = useState<Position>(() => {
    const playerTeam = gameState.teams[gameState.playerTeam];
    if (playerTeam?.buildings[0]) {
      return {
        x: playerTeam.buildings[0].position.x - 400,
        y: playerTeam.buildings[0].position.y - 300,
      };
    }
    return { x: 0, y: 0 };
  });

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBuildMode(null);
      const speed = 30;
      if (e.key === 'ArrowLeft' || e.key === 'a') setCamera(p => ({ ...p, x: p.x - speed }));
      if (e.key === 'ArrowRight' || e.key === 'd') setCamera(p => ({ ...p, x: p.x + speed }));
      if (e.key === 'ArrowUp' || e.key === 'w') setCamera(p => ({ ...p, y: p.y - speed }));
      if (e.key === 'ArrowDown' || e.key === 's') setCamera(p => ({ ...p, y: p.y + speed }));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseDown = useCallback((_screenPos: Position, worldPos: Position) => {
    setMouseDownPos(worldPos);
    setGameState(prev => ({
      ...prev,
      selectionBox: { start: worldPos, end: worldPos },
    }));
  }, []);

  const handleMouseMove = useCallback((_screenPos: Position, worldPos: Position) => {
    if (mouseDownPos) {
      setGameState(prev => ({
        ...prev,
        selectionBox: { start: mouseDownPos, end: worldPos },
      }));
    }
  }, [mouseDownPos]);

  const handleMouseUp = useCallback((_screenPos: Position, worldPos: Position) => {
    if (!mouseDownPos) return;

    const playerTeam = gameState.teams[gameState.playerTeam];
    const minX = Math.min(mouseDownPos.x, worldPos.x);
    const maxX = Math.max(mouseDownPos.x, worldPos.x);
    const minY = Math.min(mouseDownPos.y, worldPos.y);
    const maxY = Math.max(mouseDownPos.y, worldPos.y);

    const isClick = Math.abs(mouseDownPos.x - worldPos.x) < 10 && Math.abs(mouseDownPos.y - worldPos.y) < 10;

    const selectedUnitIds: string[] = [];
    const selectedBuildingIds: string[] = [];

    if (isClick) {
      let clickedUnit: Unit | undefined;
      let clickedBuilding: Building | undefined;

      playerTeam.units.forEach(unit => {
        if (distance(unit.position, worldPos) < 25) {
          clickedUnit = unit;
        }
      });

      if (!clickedUnit) {
        playerTeam.buildings.forEach(building => {
          if (distance(building.position, worldPos) < 50) {
            clickedBuilding = building;
          }
        });
      }

      playerTeam.units.forEach(u => u.selected = false);
      playerTeam.buildings.forEach(b => b.selected = false);

      if (clickedUnit) {
        clickedUnit.selected = true;
        selectedUnitIds.push(clickedUnit.id);
      } else if (clickedBuilding) {
        clickedBuilding.selected = true;
        selectedBuildingIds.push(clickedBuilding.id);
      }
    } else {
      playerTeam.units.forEach(unit => {
        const inBox = unit.position.x >= minX && unit.position.x <= maxX &&
                      unit.position.y >= minY && unit.position.y <= maxY;
        unit.selected = inBox;
        if (inBox) selectedUnitIds.push(unit.id);
      });

      if (selectedUnitIds.length === 0) {
        playerTeam.buildings.forEach(building => {
          const inBox = building.position.x >= minX && building.position.x <= maxX &&
                        building.position.y >= minY && building.position.y <= maxY;
          building.selected = inBox;
          if (inBox) selectedBuildingIds.push(building.id);
        });
      } else {
        playerTeam.buildings.forEach(b => b.selected = false);
      }
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
      const tileSize = MAP_SIZES[mapSize].tileSize;
      const tileX = Math.floor(worldPos.x / tileSize);
      const tileY = Math.floor(worldPos.y / tileSize);

      if (tileX >= 0 && tileX < gameState.map.width && tileY >= 0 && tileY < gameState.map.height) {
        const tile = gameState.map.tiles[tileY][tileX];
        if (tile.passable && playerTeam.resources >= config.cost) {
          const newBuilding: Building = {
            id: `building-${gameState.playerTeam}-${Date.now()}`,
            type: buildMode,
            faction: playerTeam.faction,
            teamId: playerTeam.id,
            position: worldPos,
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

          playerTeam.buildings.push(newBuilding);
          playerTeam.resources -= config.cost;
          setGameState({ ...gameState });
        }
      }
      setBuildMode(null);
      return;
    }

    let targetUnit: Unit | undefined;
    let targetBuilding: Building | undefined;

    gameState.teams.forEach(team => {
      if (team.id === gameState.playerTeam) return;
      team.units.forEach(unit => {
        if (distance(unit.position, worldPos) < 30) targetUnit = unit;
      });
      team.buildings.forEach(building => {
        if (distance(building.position, worldPos) < 50) targetBuilding = building;
      });
    });

    const selectedUnits = playerTeam.units.filter(u => u.selected);

    if (targetUnit) {
      selectedUnits.forEach(unit => {
        unit.targetUnit = targetUnit!.id;
        unit.targetBuilding = undefined;
        unit.targetPosition = undefined;
      });
    } else if (targetBuilding) {
      selectedUnits.forEach(unit => {
        if (isBuilder(unit.type)) {
          unit.targetPosition = targetBuilding!.position;
          unit.targetUnit = undefined;
          unit.targetBuilding = undefined;
          unit.moving = true;
        } else {
          unit.targetBuilding = targetBuilding!.id;
          unit.targetUnit = undefined;
          unit.targetPosition = undefined;
        }
      });
    } else {
      selectedUnits.forEach(unit => {
        unit.targetPosition = worldPos;
        unit.moving = true;
        unit.targetUnit = undefined;
        unit.targetBuilding = undefined;
      });
    }

    setGameState({ ...gameState });
  }, [gameState, buildMode, mapSize]);

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
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <GameCanvas
            gameState={gameState}
            mapSize={mapSize}
            camera={camera}
            onCameraChange={setCamera}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onRightClick={handleRightClick}
          />
          {buildMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-600/90 text-white rounded-lg text-sm shadow-lg">
              Строительство: {BUILDING_CONFIGS[buildMode].name} -- ПКМ для размещения, ESC для отмены
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-screen p-2 bg-slate-900/50 border-l border-slate-700/50">
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
  );
}
