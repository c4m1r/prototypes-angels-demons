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

// Maps key codes to logical action names — layout-independent
const KEY_ACTIONS: Record<string, string> = {
  'Space': 'center',
  'KeyA': 'attack_move',
  'KeyH': 'hold',
  'KeyS': 'stop',
  'KeyQ': 'ability1',
  'KeyW': 'ability2',
  'Escape': 'cancel',
  'ArrowLeft': 'cam_left',
  'ArrowRight': 'cam_right',
  'ArrowUp': 'cam_up',
  'ArrowDown': 'cam_down',
  'F10': 'menu',
};


const HOTKEYS_TABLE = [
  { key: 'Пробел', desc: 'Центр на базе' },
  { key: 'A', desc: 'Атака-движение (Attack-Move)' },
  { key: 'H', desc: 'Удержать позицию' },
  { key: 'S', desc: 'Стоп (сброс команды)' },
  { key: 'Q', desc: 'Способность 1 героя (целевая)' },
  { key: 'W', desc: 'Способность 2 героя (целевая)' },
  { key: 'ЛКМ', desc: 'Выбор / Строительство' },
  { key: 'ПКМ', desc: 'Движение / Атака / Цель' },
  { key: '←→↑↓', desc: 'Прокрутка карты' },
  { key: 'Колесо', desc: 'Прокрутка вертикально' },
  { key: 'Shift+Колесо', desc: 'Прокрутка горизонтально' },
  { key: 'Alt+ЛКМ', desc: 'Перетяжка камеры' },
  { key: 'ESC', desc: 'Отмена режима / Меню паузы' },
  { key: 'F10', desc: 'Меню паузы' },
];

export default function Game({ faction, mapSize, difficulty }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(faction, mapSize, difficulty));
  const [mouseDownPos, setMouseDownPos] = useState<Position | null>(null);
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [camera, setCamera] = useState<Position>(() => getInitialCamera(gameState));
  const [inspectedUnit, setInspectedUnit] = useState<Unit | null>(null);
  const [inspectedBuilding, setInspectedBuilding] = useState<Building | null>(null);
  const [attackMoveMode, setAttackMoveMode] = useState(false);
  const [abilityTargetMode, setAbilityTargetMode] = useState<{ unitId: string; abilityId: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) return;
      setGameState(prevState => {
        if (prevState.gameOver) return prevState;
        let newState = updateGame(prevState, 100);
        newState = updateAI(newState);
        return newState;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [paused]);

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
      const action = KEY_ACTIONS[e.code];
      if (!action) return;

      // Prevent default for space
      if (e.code === 'Space') e.preventDefault();

      if (action === 'cancel') {
        if (buildMode) { setBuildMode(null); return; }
        if (attackMoveMode) { setAttackMoveMode(false); return; }
        if (abilityTargetMode) { setAbilityTargetMode(null); return; }
        setMenuOpen(v => !v);
        setPaused(v => !v);
        return;
      }
      if (action === 'menu') {
        setMenuOpen(v => !v);
        setPaused(v => !v);
        return;
      }

      if (menuOpen) return;

      if (action === 'center') centerOnMainBuilding();

      if (action === 'attack_move') {
        if (!buildMode) setAttackMoveMode(true);
      }

      if (action === 'hold') {
        setGameState(prev => {
          const playerTeam = prev.teams[prev.playerTeam];
          playerTeam.units.forEach(u => {
            if (u.selected) {
              u.holdPosition = true;
              u.moving = false;
              u.targetPosition = undefined;
              u.path = [];
              u.pathIndex = 0;
            }
          });
          return { ...prev };
        });
      }

      if (action === 'stop' && !e.ctrlKey && !e.metaKey) {
        setGameState(prev => {
          const playerTeam = prev.teams[prev.playerTeam];
          playerTeam.units.forEach(u => {
            if (u.selected) {
              u.moving = false;
              u.targetPosition = undefined;
              u.targetUnit = undefined;
              u.targetBuilding = undefined;
              u.path = [];
              u.pathIndex = 0;
              u.holdPosition = false;
            }
          });
          return { ...prev };
        });
      }

      if (action === 'ability1' || action === 'ability2') {
        setGameState(prev => {
          const playerTeam = prev.teams[prev.playerTeam];
          const hero = playerTeam.units.find(u => u.selected && u.isHero);
          if (hero) {
            const idx = action === 'ability1' ? 0 : 1;
            const ability = hero.abilities[idx];
            if (ability) {
              const now = Date.now();
              if (now - ability.lastUsed >= ability.cooldown && hero.mana >= ability.manaCost) {
                setAbilityTargetMode({ unitId: hero.id, abilityId: ability.id });
              }
            }
          }
          return prev;
        });
      }

      const speed = 48;
      const tileSize = MAP_SIZES[mapSize].tileSize;
      setGameState(prev => {
        if (action === 'cam_left') setCamera(p => clampCamera({ ...p, x: p.x - speed }, prev.map.width, prev.map.height, tileSize, 1000, 700));
        if (action === 'cam_right') setCamera(p => clampCamera({ ...p, x: p.x + speed }, prev.map.width, prev.map.height, tileSize, 1000, 700));
        if (action === 'cam_up') setCamera(p => clampCamera({ ...p, y: p.y - speed }, prev.map.width, prev.map.height, tileSize, 1000, 700));
        if (action === 'cam_down') setCamera(p => clampCamera({ ...p, y: p.y + speed }, prev.map.width, prev.map.height, tileSize, 1000, 700));
        return prev;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [centerOnMainBuilding, buildMode, mapSize, menuOpen, attackMoveMode, abilityTargetMode]);

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

          setGameState(prev => ({ ...prev, selectedUnits: [], selectionBox: undefined }));
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

    setGameState(prev => ({ ...prev, selectedUnits: selectedUnitIds, selectionBox: undefined }));
    setMouseDownPos(null);
  }, [mouseDownPos, gameState.playerTeam, gameState.teams]);

  const isWithinMapBounds = useCallback((worldPos: Position): boolean => {
    const tileSize = MAP_SIZES[mapSize].tileSize;
    const margin = tileSize;
    const mapPixelW = gameState.map.width * tileSize;
    const mapPixelH = gameState.map.height * tileSize;
    return worldPos.x >= margin && worldPos.x <= mapPixelW - margin &&
           worldPos.y >= margin && worldPos.y <= mapPixelH - margin;
  }, [mapSize, gameState.map]);

  // LMB build placement
  const handleBuildPlace = useCallback((worldPos: Position) => {
    if (!buildMode) return;
    const playerTeam = gameState.teams[gameState.playerTeam];
    const config = BUILDING_CONFIGS[buildMode];
    const tileSize = MAP_SIZES[mapSize].tileSize;

    const buildTileX = Math.floor(worldPos.x / tileSize);
    const buildTileY = Math.floor(worldPos.y / tileSize);
    const snapPos = { x: buildTileX * tileSize + tileSize / 2, y: buildTileY * tileSize + tileSize / 2 };

    const hasBuilder = playerTeam.units.some(u => u.selected && isBuilder(u.type));
    if (!hasBuilder) return;

    if (
      buildTileX >= 1 && buildTileX < gameState.map.width - 1 &&
      buildTileY >= 1 && buildTileY < gameState.map.height - 1 &&
      isWithinMapBounds(snapPos) &&
      gameState.map.tiles[buildTileY]?.[buildTileX]?.passable &&
      playerTeam.resources >= config.cost
    ) {
      const newBuilding: Building = {
        id: `building-${gameState.playerTeam}-${Date.now()}`,
        type: buildMode,
        faction: playerTeam.faction,
        teamId: playerTeam.id,
        position: snapPos,
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

      const selectedBuilders = playerTeam.units.filter(u => u.selected && isBuilder(u.type));
      selectedBuilders.forEach(builder => {
        const bubble = addSpeechBubble(gameState, builder, 'build');
        gameState.speechBubbles = gameState.speechBubbles.filter(sb => sb.unitId !== builder.id);
        gameState.speechBubbles.push(bubble);
      });

      setGameState({ ...gameState });
    }
    setBuildMode(null);
  }, [buildMode, gameState, mapSize, isWithinMapBounds]);

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
    if (applyLevelUp(unit, stat)) setGameState({ ...gameState });
  }, [gameState]);

  const handleCastAbility = useCallback((unit: Unit, abilityId: string) => {
    setAbilityTargetMode({ unitId: unit.id, abilityId });
  }, []);

  const handleRestart = useCallback(() => {
    const newGame = initializeGame(faction, mapSize, difficulty);
    setGameState(newGame);
    setBuildMode(null);
    setCamera(getInitialCamera(newGame));
    setMenuOpen(false);
    setPaused(false);
  }, [faction, mapSize, difficulty]);

  const playerTeam = gameState.teams[gameState.playerTeam];
  const selectedUnits = playerTeam.units.filter(u => u.selected);
  const selectedBuildings = playerTeam.buildings.filter(b => b.selected);

  const modeBannerText = buildMode
    ? `Строительство: ${BUILDING_CONFIGS[buildMode].name} | ЛКМ -- выбрать место | ESC -- отмена`
    : attackMoveMode
      ? 'Атака-движение | ПКМ -- выбрать цель | ESC -- отмена'
      : abilityTargetMode
        ? 'Выбор цели способности | ПКМ на карте | ESC -- отмена'
        : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <GameCanvas
            gameState={gameState}
            mapSize={mapSize}
            camera={camera}
            buildMode={buildMode}
            attackMoveMode={attackMoveMode}
            abilityTargetMode={abilityTargetMode !== null}
            onCameraChange={setCamera}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onRightClick={handleRightClick}
            onBuildPlace={handleBuildPlace}
          />

          {/* Mode banner */}
          {modeBannerText && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm shadow-xl pointer-events-none"
              style={{
                background: buildMode ? 'rgba(120,80,0,0.92)' : attackMoveMode ? 'rgba(140,0,0,0.92)' : 'rgba(120,60,0,0.92)',
                border: `1px solid ${buildMode ? '#aa8800' : attackMoveMode ? '#ff3333' : '#ff8800'}`,
                color: '#fff',
              }}
            >
              {modeBannerText}
            </div>
          )}

          {/* Game over */}
          {gameState.gameOver && !menuOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
              <div
                className="bg-slate-900 border-2 rounded-xl p-8 text-center shadow-2xl max-w-md font-mono"
                style={{ borderColor: gameState.gameOver === 'victory' ? '#22dd22' : '#ff3333' }}
              >
                <div className="text-6xl font-bold mb-2" style={{ color: gameState.gameOver === 'victory' ? '#22dd22' : '#ff3333' }}>
                  {gameState.gameOver === 'victory' ? '/--ПОБЕДА--\\' : '/ПОРАЖЕНИЕ\\'}
                </div>
                <p className="text-slate-300 mb-4 text-sm">
                  {gameState.gameOver === 'victory'
                    ? 'Все вражеские базы уничтожены!'
                    : 'Ваша база уничтожена...'}
                </p>
                <div className="text-xs text-slate-500 mb-6 font-mono border border-slate-700 rounded p-2 bg-slate-950">
                  <div>Время: {Math.floor(gameState.gameTime / 60000)}м {Math.floor((gameState.gameTime % 60000) / 1000)}с</div>
                  <div>Юниты: {playerTeam.units.length} | Здания: {playerTeam.buildings.length}</div>
                  <div>Ресурсов: {Math.floor(playerTeam.resources)}</div>
                </div>
                <button onClick={handleRestart}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all border border-slate-500">
                  Начать заново
                </button>
              </div>
            </div>
          )}

          {/* ESC / Pause Menu */}
          {menuOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 z-50">
              <div className="bg-slate-900 border border-slate-600 rounded-xl p-8 shadow-2xl w-[420px] font-mono">
                <div className="text-center text-xl font-bold text-white mb-1">[ ПАУЗА ]</div>
                <div className="text-center text-xs text-slate-500 mb-6">Игра приостановлена</div>

                {/* Hotkey table */}
                <div className="mb-6">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">Горячие клавиши</div>
                  <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                    {HOTKEYS_TABLE.map(row => (
                      <div key={row.key} className="flex items-center justify-between text-xs">
                        <span className="inline-block bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-yellow-300 min-w-[64px] text-center">{row.key}</span>
                        <span className="text-slate-300 ml-3 flex-1">{row.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => { setMenuOpen(false); setPaused(false); }}
                    className="w-full py-2.5 bg-green-800 hover:bg-green-700 text-white rounded border border-green-600 font-bold transition-all"
                  >
                    Продолжить
                  </button>
                  <button
                    onClick={handleRestart}
                    className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-500 transition-all"
                  >
                    Начать заново
                  </button>
                </div>
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
