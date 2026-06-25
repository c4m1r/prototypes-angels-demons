import { useState, useEffect, useCallback } from 'react';
import {
  GameState, FactionType, Position, Unit, Building, UnitType, BuildingType,
  MapSize, Difficulty, MAP_SIZES, LevelUpStat, FACTION_CONFIGS, SpeechAction,
} from '../types/game';
import { initializeGame, updateGame, distance, isBuilder, applyLevelUp, getMapSizeFromState, addSpeechBubble, assignFormationTargets, castAbilityAtPosition } from '../engine/gameEngine';
import { updateAI } from '../engine/ai';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { findPathWorld } from '../engine/pathfinding';
import GameCanvas from './GameCanvas';
import GameUI from './GameUI';

interface GameProps {
  faction: FactionType;
  mapSize: MapSize;
  difficulty: Difficulty;
}

function getInitialCamera(gameState: GameState): Position {
  const playerTeam = gameState.teams[gameState.playerTeam];
  if (playerTeam?.buildings[0]) {
    return {
      x: playerTeam.buildings[0].position.x - 400,
      y: playerTeam.buildings[0].position.y - 300,
    };
  }
  return { x: 0, y: 0 };
}

function clampCamera(cam: Position, mapWidth: number, mapHeight: number, tileSize: number, viewWidth: number, viewHeight: number): Position {
  const mapPixelW = mapWidth * tileSize;
  const mapPixelH = mapHeight * tileSize;
  const maxX = Math.max(0, mapPixelW - viewWidth);
  const maxY = Math.max(0, mapPixelH - viewHeight);
  return {
    x: Math.max(0, Math.min(cam.x, maxX)),
    y: Math.max(0, Math.min(cam.y, maxY)),
  };
}

export default function Game({ faction, mapSize, difficulty }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(faction, mapSize, difficulty));
  const [mouseDownPos, setMouseDownPos] = useState<Position | null>(null);
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [camera, setCamera] = useState<Position>(() => getInitialCamera(gameState));
  const [inspectedUnit, setInspectedUnit] = useState<Unit | null>(null);
  const [inspectedBuilding, setInspectedBuilding] = useState<Building | null>(null);
  const [attackMoveMode, setAttackMoveMode] = useState(false);
  const [abilityTargetMode, setAbilityTargetMode] = useState<{ unitId: string; abilityId: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setGameState(prevState => {
        if (prevState.gameOver) return prevState;
        let newState = updateGame(prevState, 100);
        newState = updateAI(newState);
        return newState;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const centerOnMainBuilding = useCallback(() => {
    setGameState(prev => {
      const playerTeam = prev.teams[prev.playerTeam];
      const mainBuilding = playerTeam.buildings.find(b => b.type === FACTION_CONFIGS[playerTeam.faction].mainBuilding);
      if (mainBuilding) {
        setCamera({
          x: mainBuilding.position.x - 400,
          y: mainBuilding.position.y - 300,
        });
        playerTeam.units.forEach(u => u.selected = false);
        playerTeam.buildings.forEach(b => b.selected = false);
        mainBuilding.selected = true;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setBuildMode(null); setAttackMoveMode(false); setAbilityTargetMode(null); }
      if (e.key === ' ') {
        e.preventDefault();
        centerOnMainBuilding();
      }
      if (e.key === 'a' || e.key === 'A') {
        if (!buildMode) setAttackMoveMode(true);
      }
      if (e.key === 'h' || e.key === 'H') {
        const playerTeam = gameState.teams[gameState.playerTeam];
        playerTeam.units.forEach(u => { if (u.selected) { u.holdPosition = true; u.moving = false; u.targetPosition = undefined; u.path = []; u.pathIndex = 0; } });
        setGameState({ ...gameState });
      }
      if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey) {
          const playerTeam = gameState.teams[gameState.playerTeam];
          playerTeam.units.forEach(u => { if (u.selected) { u.moving = false; u.targetPosition = undefined; u.targetUnit = undefined; u.targetBuilding = undefined; u.path = []; u.pathIndex = 0; u.holdPosition = false; } });
          setGameState({ ...gameState });
        }
      }
      const speed = 40;
      const tileSize = MAP_SIZES[mapSize].tileSize;
      if (e.key === 'ArrowLeft') setCamera(p => clampCamera({ ...p, x: p.x - speed }, gameState.map.width, gameState.map.height, tileSize, 1000, 700));
      if (e.key === 'ArrowRight') setCamera(p => clampCamera({ ...p, x: p.x + speed }, gameState.map.width, gameState.map.height, tileSize, 1000, 700));
      if (e.key === 'ArrowUp') setCamera(p => clampCamera({ ...p, y: p.y - speed }, gameState.map.width, gameState.map.height, tileSize, 1000, 700));
      if (e.key === 'ArrowDown') setCamera(p => clampCamera({ ...p, y: p.y + speed }, gameState.map.width, gameState.map.height, tileSize, 1000, 700));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerOnMainBuilding, gameState, buildMode, mapSize]);

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

    if (isClick) {
      let clickedUnit: Unit | undefined;
      let clickedBuilding: Building | undefined;

      playerTeam.units.forEach(unit => {
        if (distance(unit.position, worldPos) < 25) clickedUnit = unit;
      });

      if (!clickedUnit) {
        playerTeam.buildings.forEach(building => {
          if (distance(building.position, worldPos) < 50) clickedBuilding = building;
        });
      }

      if (!clickedUnit && !clickedBuilding) {
        gameState.teams.forEach(team => {
          if (team.id === gameState.playerTeam) return;
          team.units.forEach(unit => {
            if (distance(unit.position, worldPos) < 25 && !clickedUnit) clickedUnit = unit;
          });
          team.buildings.forEach(building => {
            if (distance(building.position, worldPos) < 50 && !clickedBuilding) clickedBuilding = building;
          });
        });

        if (clickedUnit || clickedBuilding) {
          playerTeam.units.forEach(u => u.selected = false);
          playerTeam.buildings.forEach(b => b.selected = false);
          setInspectedUnit(clickedUnit || null);
          setInspectedBuilding(!clickedUnit && clickedBuilding ? clickedBuilding : null);

          setGameState(prev => ({
            ...prev,
            selectedUnits: [],
            selectionBox: undefined,
          }));
          setMouseDownPos(null);
          return;
        }
      }

      setInspectedUnit(null);
      setInspectedBuilding(null);

      playerTeam.units.forEach(u => u.selected = false);
      playerTeam.buildings.forEach(b => b.selected = false);

      if (clickedUnit) {
        clickedUnit.selected = true;
        selectedUnitIds.push(clickedUnit.id);
      } else if (clickedBuilding) {
        clickedBuilding.selected = true;
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

  const isWithinMapBounds = useCallback((worldPos: Position): boolean => {
    const tileSize = MAP_SIZES[mapSize].tileSize;
    const margin = tileSize * 2;
    const mapPixelW = gameState.map.width * tileSize;
    const mapPixelH = gameState.map.height * tileSize;
    return worldPos.x >= margin && worldPos.x <= mapPixelW - margin &&
           worldPos.y >= margin && worldPos.y <= mapPixelH - margin;
  }, [mapSize, gameState.map]);

  const handleRightClick = useCallback((worldPos: Position) => {
    const playerTeam = gameState.teams[gameState.playerTeam];

    if (abilityTargetMode) {
      const hero = playerTeam.units.find(u => u.id === abilityTargetMode.unitId);
      if (hero) {
        const ability = hero.abilities.find(a => a.id === abilityTargetMode.abilityId);
        if (ability && hero.mana >= ability.manaCost) {
          castAbilityAtPosition(gameState, hero, ability, worldPos);
          setGameState({ ...gameState });
        }
      }
      setAbilityTargetMode(null);
      return;
    }

    if (buildMode) {
      const config = BUILDING_CONFIGS[buildMode];
      const tileSize = MAP_SIZES[mapSize].tileSize;

      const selectedBuilders = playerTeam.units.filter(u => u.selected && isBuilder(u.type));
      let buildPos = worldPos;

      if (selectedBuilders.length > 0) {
        const builder = selectedBuilders[0];
        const angle = Math.random() * Math.PI * 2;
        buildPos = {
          x: builder.position.x + Math.cos(angle) * 160,
          y: builder.position.y + Math.sin(angle) * 160,
        };
      }

      const buildTileX = Math.floor(buildPos.x / tileSize);
      const buildTileY = Math.floor(buildPos.y / tileSize);

      if (
        buildTileX >= 1 && buildTileX < gameState.map.width - 1 &&
        buildTileY >= 1 && buildTileY < gameState.map.height - 1 &&
        isWithinMapBounds(buildPos) &&
        gameState.map.tiles[buildTileY]?.[buildTileX]?.passable &&
        playerTeam.resources >= config.cost
      ) {
        const newBuilding: Building = {
          id: `building-${gameState.playerTeam}-${Date.now()}`,
          type: buildMode,
          faction: playerTeam.faction,
          teamId: playerTeam.id,
          position: buildPos,
          health: config.health,
          maxHealth: config.health,
          selected: false,
          productionProgress: 0,
          productionTime: 0,
          productionQueue: [],
          isTurret: config.isTurret,
          turretRange: config.turretRange,
          turretDamage: config.turretDamage,
          turretLastAttack: 0,
        };

        playerTeam.buildings.push(newBuilding);
        playerTeam.resources -= config.cost;

        selectedBuilders.forEach(builder => {
          const bubble = addSpeechBubble(gameState, builder, 'build');
          gameState.speechBubbles = gameState.speechBubbles.filter(sb => sb.unitId !== builder.id);
          gameState.speechBubbles.push(bubble);
        });

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
        unit.path = [];
        unit.pathIndex = 0;
      });

      const speaker = selectedUnits[0];
      if (speaker) {
        const bubble = addSpeechBubble(gameState, speaker, 'attack');
        gameState.speechBubbles = gameState.speechBubbles.filter(sb => sb.unitId !== speaker.id);
        gameState.speechBubbles.push(bubble);
      }
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
        unit.path = [];
        unit.pathIndex = 0;
      });

      const speaker = selectedUnits[0];
      if (speaker) {
        const action: SpeechAction = isBuilder(speaker.type) ? 'repair' : 'attack';
        const bubble = addSpeechBubble(gameState, speaker, action);
        gameState.speechBubbles = gameState.speechBubbles.filter(sb => sb.unitId !== speaker.id);
        gameState.speechBubbles.push(bubble);
      }
    } else {
      const selectedUnits = playerTeam.units.filter(u => u.selected);
      const isAttackMove = attackMoveMode;
      setAttackMoveMode(false);

      assignFormationTargets(selectedUnits, worldPos, gameState);

      selectedUnits.forEach(unit => {
        unit.holdPosition = false;
        unit.command = isAttackMove ? 'attackMove' : 'normal';
        const currentMapSize = getMapSizeFromState(gameState);
        const path = findPathWorld(gameState.map, unit.position, unit.targetPosition || worldPos, currentMapSize);
        if (path.length > 1) {
          unit.path = path.slice(1);
          unit.pathIndex = 0;
          unit.moving = true;
        } else {
          unit.moving = true;
          unit.path = [];
          unit.pathIndex = 0;
        }
        unit.targetUnit = undefined;
        unit.targetBuilding = undefined;
      });

      const speaker = selectedUnits[0];
      if (speaker) {
        const bubble = addSpeechBubble(gameState, speaker, 'move');
        gameState.speechBubbles = gameState.speechBubbles.filter(sb => sb.unitId !== speaker.id);
        gameState.speechBubbles.push(bubble);
      }
    }

    setGameState({ ...gameState });
  }, [gameState, buildMode, mapSize, isWithinMapBounds, attackMoveMode, abilityTargetMode]);

  const handleProduceUnit = useCallback((building: Building, unitType: UnitType) => {
    const playerTeam = gameState.teams[gameState.playerTeam];
    const config = UNIT_CONFIGS[unitType];

    if (playerTeam.resources >= config.cost) {
      playerTeam.resources -= config.cost;

      if (!building.producing) {
        building.producing = unitType;
        building.productionTime = config.buildTime;
        building.productionProgress = 0;
      } else {
        building.productionQueue.push(unitType);
      }
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

  const handleLevelUp = useCallback((unit: Unit, stat: LevelUpStat) => {
    if (applyLevelUp(unit, stat)) {
      setGameState({ ...gameState });
    }
  }, [gameState]);

  const handleCastAbility = useCallback((unit: Unit, abilityId: string) => {
    setAbilityTargetMode({ unitId: unit.id, abilityId });
  }, []);

  const handleRestart = useCallback(() => {
    const newGame = initializeGame(faction, mapSize, difficulty);
    setGameState(newGame);
    setBuildMode(null);
    setCamera(getInitialCamera(newGame));
  }, [faction, mapSize, difficulty]);

  const playerTeam = gameState.teams[gameState.playerTeam];
  const selectedUnits = playerTeam.units.filter(u => u.selected);
  const selectedBuildings = playerTeam.buildings.filter(b => b.selected);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <GameCanvas
            gameState={gameState}
            mapSize={mapSize}
            camera={camera}
            buildModeActive={buildMode !== null}
            attackMoveMode={attackMoveMode}
            abilityTargetMode={abilityTargetMode !== null}
            onCameraChange={setCamera}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onRightClick={handleRightClick}
          />
          {buildMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-yellow-600/90 text-white rounded-lg text-sm shadow-lg">
              Строительство: {BUILDING_CONFIGS[buildMode].name} -- ПКМ рядом со строителем, ESC для отмены
            </div>
          )}
          {attackMoveMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600/90 text-white rounded-lg text-sm shadow-lg">
              Режим атаки -- ПКМ для выбора цели движения, ESC для отмены
            </div>
          )}
          {abilityTargetMode && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-orange-600/90 text-white rounded-lg text-sm shadow-lg">
              Выбор цели способности -- ПКМ на карте, ESC для отмены
            </div>
          )}
          {gameState.gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
              <div className="bg-slate-800 border-2 rounded-xl p-8 text-center shadow-2xl max-w-md" style={{ borderColor: gameState.gameOver === 'victory' ? '#22dd22' : '#ff3333' }}>
                <h2 className="text-4xl font-bold mb-4" style={{ color: gameState.gameOver === 'victory' ? '#22dd22' : '#ff3333' }}>
                  {gameState.gameOver === 'victory' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                </h2>
                <p className="text-slate-300 mb-6">
                  {gameState.gameOver === 'victory'
                    ? 'Все вражеские базы уничтожены!'
                    : 'Ваша база уничтожена...'}
                </p>
                <div className="text-sm text-slate-400 mb-6">
                  Время: {Math.floor(gameState.gameTime / 1000)}с | Юнитов: {playerTeam.units.length} | Зданий: {playerTeam.buildings.length}
                </div>
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all border border-slate-500"
                >
                  Начать заново
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-screen p-2 bg-slate-900/50 border-l border-slate-700/50">
          <GameUI
            gameState={gameState}
            selectedUnits={selectedUnits}
            selectedBuildings={selectedBuildings}
            inspectedUnit={inspectedUnit}
            inspectedBuilding={inspectedBuilding}
            onProduceUnit={handleProduceUnit}
            onBuildBuilding={handleBuildBuilding}
            onAddToSquad={handleAddToSquad}
            onLevelUp={handleLevelUp}
            onCastAbility={handleCastAbility}
            abilityTargetMode={abilityTargetMode}
          />
        </div>
      </div>
    </div>
  );
}
