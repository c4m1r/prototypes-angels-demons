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

function clampCamera(
  cam: Position,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  viewWidth: number,
  viewHeight: number,
): Position {
  const maxX = Math.max(0, mapWidth * tileSize - viewWidth);
  const maxY = Math.max(0, mapHeight * tileSize - viewHeight);
  return {
    x: Math.max(0, Math.min(cam.x, maxX)),
    y: Math.max(0, Math.min(cam.y, maxY)),
  };
}

// Physical key codes → action — layout-independent (works with any keyboard locale)
const KEY_ACTIONS: Record<string, string> = {
  Space: 'center',
  KeyA: 'attack_move',
  KeyH: 'hold',
  KeyS: 'stop',
  KeyQ: 'ability1',
  KeyW: 'ability2',
  Escape: 'cancel',
  ArrowLeft: 'cam_left',
  ArrowRight: 'cam_right',
  ArrowUp: 'cam_up',
  ArrowDown: 'cam_down',
  F10: 'menu',
};

const HOTKEYS_TABLE = [
  { key: 'Пробел', desc: 'Центр на базе' },
  { key: 'A / Ф', desc: 'Атака-движение' },
  { key: 'H / Р', desc: 'Удержать позицию' },
  { key: 'S / Ы', desc: 'Стоп' },
  { key: 'Q / Й', desc: 'Способность 1 героя' },
  { key: 'W / Ц', desc: 'Способность 2 героя' },
  { key: 'ЛКМ', desc: 'Выбор / Строительство' },
  { key: 'ПКМ', desc: 'Движение / Атака / Цель' },
  { key: '←→↑↓', desc: 'Прокрутка карты' },
  { key: 'Колесо', desc: 'Прокрутка вертикально' },
  { key: 'Shift+Колесо', desc: 'Горизонтально' },
  { key: 'Alt+ЛКМ', desc: 'Перетяжка камеры' },
  { key: 'ESC', desc: 'Отмена / Меню паузы' },
  { key: 'F10', desc: 'Меню паузы' },
];

// HUD height constants — must match GameUI
const TOP_BAR_H = 32;
const BOTTOM_HUD_H = 158;

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

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (paused) return;
      setGameState(prev => {
        if (prev.gameOver) return prev;
        return updateAI(updateGame(prev, 100));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [paused]);

  // ── Center on base ─────────────────────────────────────────────────────────
  const centerOnMainBuilding = useCallback(() => {
    setGameState(prev => {
      const pt = prev.teams[prev.playerTeam];
      const mb = pt.buildings.find(b => b.type === FACTION_CONFIGS[pt.faction].mainBuilding);
      if (mb) {
        setCamera({ x: mb.position.x - 400, y: mb.position.y - 300 });
        pt.units.forEach(u => (u.selected = false));
        pt.buildings.forEach(b => (b.selected = false));
        mb.selected = true;
      }
      return prev;
    });
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const action = KEY_ACTIONS[e.code];
      if (!action) return;
      if (e.code === 'Space') e.preventDefault();

      if (action === 'cancel') {
        if (buildMode) return setBuildMode(null);
        if (attackMoveMode) return setAttackMoveMode(false);
        if (abilityTargetMode) return setAbilityTargetMode(null);
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

      if (action === 'attack_move' && !buildMode) setAttackMoveMode(true);

      if (action === 'hold') {
        setGameState(prev => {
          prev.teams[prev.playerTeam].units.forEach(u => {
            if (!u.selected) return;
            u.holdPosition = true; u.moving = false;
            u.targetPosition = undefined; u.path = []; u.pathIndex = 0;
          });
          return { ...prev };
        });
      }

      if (action === 'stop' && !e.ctrlKey && !e.metaKey) {
        setGameState(prev => {
          prev.teams[prev.playerTeam].units.forEach(u => {
            if (!u.selected) return;
            u.moving = false; u.targetPosition = undefined;
            u.targetUnit = undefined; u.targetBuilding = undefined;
            u.path = []; u.pathIndex = 0; u.holdPosition = false;
          });
          return { ...prev };
        });
      }

      if (action === 'ability1' || action === 'ability2') {
        setGameState(prev => {
          const hero = prev.teams[prev.playerTeam].units.find(u => u.selected && u.isHero);
          if (hero) {
            const ab = hero.abilities[action === 'ability1' ? 0 : 1];
            if (ab) {
              const now = Date.now();
              if (now - ab.lastUsed >= ab.cooldown && hero.mana >= ab.manaCost) {
                setAbilityTargetMode({ unitId: hero.id, abilityId: ab.id });
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [centerOnMainBuilding, buildMode, mapSize, menuOpen, attackMoveMode, abilityTargetMode]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((_s: Position, worldPos: Position) => {
    setMouseDownPos(worldPos);
    setGameState(prev => ({ ...prev, selectionBox: { start: worldPos, end: worldPos } }));
  }, []);

  const handleMouseMove = useCallback((_s: Position, worldPos: Position) => {
    if (mouseDownPos) {
      setGameState(prev => ({ ...prev, selectionBox: { start: mouseDownPos, end: worldPos } }));
    }
  }, [mouseDownPos]);

  const handleMouseUp = useCallback((_s: Position, worldPos: Position) => {
    if (!mouseDownPos) return;
    const pt = gameState.teams[gameState.playerTeam];
    const minX = Math.min(mouseDownPos.x, worldPos.x);
    const maxX = Math.max(mouseDownPos.x, worldPos.x);
    const minY = Math.min(mouseDownPos.y, worldPos.y);
    const maxY = Math.max(mouseDownPos.y, worldPos.y);
    const isClick = maxX - minX < 10 && maxY - minY < 10;
    const selectedIds: string[] = [];

    if (isClick) {
      let cu: Unit | undefined;
      let cb: Building | undefined;
      pt.units.forEach(u => { if (distance(u.position, worldPos) < 25) cu = u; });
      if (!cu) pt.buildings.forEach(b => { if (distance(b.position, worldPos) < 50) cb = b; });

      if (!cu && !cb) {
        gameState.teams.forEach(team => {
          if (team.id === gameState.playerTeam) return;
          team.units.forEach(u => { if (distance(u.position, worldPos) < 25 && !cu) cu = u; });
          team.buildings.forEach(b => { if (distance(b.position, worldPos) < 50 && !cb) cb = b; });
        });
        if (cu || cb) {
          pt.units.forEach(u => (u.selected = false));
          pt.buildings.forEach(b => (b.selected = false));
          setInspectedUnit(cu || null);
          setInspectedBuilding(!cu && cb ? cb : null);
          setGameState(prev => ({ ...prev, selectedUnits: [], selectionBox: undefined }));
          setMouseDownPos(null);
          return;
        }
      }

      setInspectedUnit(null); setInspectedBuilding(null);
      pt.units.forEach(u => (u.selected = false));
      pt.buildings.forEach(b => (b.selected = false));
      if (cu) { cu.selected = true; selectedIds.push(cu.id); }
      else if (cb) cb.selected = true;
    } else {
      pt.units.forEach(u => {
        const sel = u.position.x >= minX && u.position.x <= maxX && u.position.y >= minY && u.position.y <= maxY;
        u.selected = sel;
        if (sel) selectedIds.push(u.id);
      });
      if (selectedIds.length === 0) {
        pt.buildings.forEach(b => {
          b.selected = b.position.x >= minX && b.position.x <= maxX && b.position.y >= minY && b.position.y <= maxY;
        });
      } else {
        pt.buildings.forEach(b => (b.selected = false));
      }
    }

    setGameState(prev => ({ ...prev, selectedUnits: selectedIds, selectionBox: undefined }));
    setMouseDownPos(null);
  }, [mouseDownPos, gameState]);

  // ── Build placement (LMB on canvas) ────────────────────────────────────────
  const handleBuildPlace = useCallback((worldPos: Position) => {
    if (!buildMode) return;
    const pt = gameState.teams[gameState.playerTeam];
    const config = BUILDING_CONFIGS[buildMode];
    const ts = MAP_SIZES[mapSize].tileSize;
    const tx = Math.floor(worldPos.x / ts);
    const ty = Math.floor(worldPos.y / ts);
    const snapPos = { x: tx * ts + ts / 2, y: ty * ts + ts / 2 };

    if (
      !pt.units.some(u => u.selected && isBuilder(u.type)) ||
      tx < 1 || tx >= gameState.map.width - 1 ||
      ty < 1 || ty >= gameState.map.height - 1 ||
      !gameState.map.tiles[ty]?.[tx]?.passable ||
      pt.resources < config.cost
    ) { setBuildMode(null); return; }

    pt.buildings.push({
      id: `b-${pt.id}-${Date.now()}`,
      type: buildMode,
      faction: pt.faction,
      teamId: pt.id,
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
    });
    pt.resources -= config.cost;

    pt.units.filter(u => u.selected && isBuilder(u.type)).forEach(b => {
      const bubble = addSpeechBubble(gameState, b, 'build');
      gameState.speechBubbles = gameState.speechBubbles.filter(sb => sb.unitId !== b.id);
      gameState.speechBubbles.push(bubble);
    });

    setGameState({ ...gameState });
    setBuildMode(null);
  }, [buildMode, gameState, mapSize]);

  // ── Right click ────────────────────────────────────────────────────────────
  const handleRightClick = useCallback((worldPos: Position) => {
    const pt = gameState.teams[gameState.playerTeam];

    if (abilityTargetMode) {
      const hero = pt.units.find(u => u.id === abilityTargetMode.unitId);
      if (hero) {
        const ab = hero.abilities.find(a => a.id === abilityTargetMode.abilityId);
        if (ab && hero.mana >= ab.manaCost) {
          castAbilityAtPosition(gameState, hero, ab, worldPos);
          setGameState({ ...gameState });
        }
      }
      setAbilityTargetMode(null); return;
    }
    if (buildMode) { setBuildMode(null); return; }

    let tUnit: Unit | undefined;
    let tBuilding: Building | undefined;
    gameState.teams.forEach(team => {
      if (team.id === gameState.playerTeam) return;
      team.units.forEach(u => { if (distance(u.position, worldPos) < 30) tUnit = u; });
      team.buildings.forEach(b => { if (distance(b.position, worldPos) < 50) tBuilding = b; });
    });

    const sel = pt.units.filter(u => u.selected);

    if (tUnit) {
      sel.forEach(u => { u.targetUnit = tUnit!.id; u.targetBuilding = undefined; u.targetPosition = undefined; u.path = []; u.pathIndex = 0; });
      const sp = sel[0];
      if (sp) { const bbl = addSpeechBubble(gameState, sp, 'attack'); gameState.speechBubbles = gameState.speechBubbles.filter(s => s.unitId !== sp.id); gameState.speechBubbles.push(bbl); }
    } else if (tBuilding) {
      sel.forEach(u => {
        if (isBuilder(u.type)) { u.targetPosition = tBuilding!.position; u.targetUnit = undefined; u.targetBuilding = undefined; u.moving = true; }
        else { u.targetBuilding = tBuilding!.id; u.targetUnit = undefined; u.targetPosition = undefined; }
        u.path = []; u.pathIndex = 0;
      });
      const sp = sel[0];
      if (sp) { const a: SpeechAction = isBuilder(sp.type) ? 'repair' : 'attack'; const bbl = addSpeechBubble(gameState, sp, a); gameState.speechBubbles = gameState.speechBubbles.filter(s => s.unitId !== sp.id); gameState.speechBubbles.push(bbl); }
    } else {
      const isAM = attackMoveMode;
      setAttackMoveMode(false);
      assignFormationTargets(sel, worldPos, gameState);
      sel.forEach(u => {
        u.holdPosition = false;
        u.command = isAM ? 'attackMove' : 'normal';
        const path = findPathWorld(gameState.map, u.position, u.targetPosition || worldPos, getMapSizeFromState(gameState));
        if (path.length > 1) { u.path = path.slice(1); u.pathIndex = 0; u.moving = true; }
        else { u.moving = true; u.path = []; u.pathIndex = 0; }
        u.targetUnit = undefined; u.targetBuilding = undefined;
      });
      const sp = sel[0];
      if (sp) { const bbl = addSpeechBubble(gameState, sp, 'move'); gameState.speechBubbles = gameState.speechBubbles.filter(s => s.unitId !== sp.id); gameState.speechBubbles.push(bbl); }
    }
    setGameState({ ...gameState });
  }, [gameState, buildMode, attackMoveMode, abilityTargetMode]);

  // ── Production / building callbacks ────────────────────────────────────────
  const handleProduceUnit = useCallback((building: Building, unitType: UnitType) => {
    const pt = gameState.teams[gameState.playerTeam];
    const cfg = UNIT_CONFIGS[unitType];
    if (pt.resources < cfg.cost) return;
    pt.resources -= cfg.cost;
    if (!building.producing) { building.producing = unitType; building.productionTime = cfg.buildTime; building.productionProgress = 0; }
    else building.productionQueue.push(unitType);
    setGameState({ ...gameState });
  }, [gameState]);

  const handleBuildBuilding = useCallback((bt: BuildingType) => setBuildMode(bt), []);

  const handleAddToSquad = useCallback((unit: Unit) => {
    const pt = gameState.teams[gameState.playerTeam];
    if (pt.resources < 10 || unit.squadSize >= unit.maxSquadSize) return;
    unit.squadSize++;
    unit.health += UNIT_CONFIGS[unit.type].health;
    unit.maxHealth += UNIT_CONFIGS[unit.type].health;
    pt.resources -= 10;
    setGameState({ ...gameState });
  }, [gameState]);

  const handleLevelUp = useCallback((unit: Unit, stat: LevelUpStat) => {
    if (applyLevelUp(unit, stat)) setGameState({ ...gameState });
  }, [gameState]);

  const handleCastAbility = useCallback((unit: Unit, abilityId: string) => {
    setAbilityTargetMode({ unitId: unit.id, abilityId });
  }, []);

  const handleRestart = useCallback(() => {
    const ng = initializeGame(faction, mapSize, difficulty);
    setGameState(ng); setBuildMode(null); setCamera(getInitialCamera(ng));
    setMenuOpen(false); setPaused(false);
  }, [faction, mapSize, difficulty]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const playerTeam = gameState.teams[gameState.playerTeam];
  const selectedUnits = playerTeam.units.filter(u => u.selected);
  const selectedBuildings = playerTeam.buildings.filter(b => b.selected);

  const modeBanner = buildMode
    ? `[ СТРОИТЕЛЬСТВО ] ${BUILDING_CONFIGS[buildMode].name}  —  ЛКМ: поставить  |  ESC: отмена`
    : attackMoveMode ? '[ АТАКА-ДВИЖЕНИЕ ]  —  ПКМ: цель  |  ESC: отмена'
    : abilityTargetMode ? '[ СПОСОБНОСТЬ ]  —  ПКМ: применить на карте  |  ESC: отмена'
    : null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-slate-950">

      {/* ── HUD TOP BAR + CANVAS fill remaining space ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Canvas fills all space above HUD */}
        <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
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

          {/* Mode banner — centered at bottom of canvas */}
          {modeBanner && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded text-xs shadow-2xl pointer-events-none font-mono tracking-wide"
              style={{
                background: buildMode ? 'rgba(92,56,0,0.95)' : 'rgba(100,10,10,0.95)',
                border: `1px solid ${buildMode ? '#aa7700' : '#cc2222'}`,
                color: '#fff',
              }}
            >
              {modeBanner}
            </div>
          )}

          {/* Game over overlay */}
          {gameState.gameOver && !menuOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/85 z-50">
              <div
                className="bg-slate-900 border-2 rounded-xl p-10 text-center shadow-2xl max-w-md font-mono"
                style={{ borderColor: gameState.gameOver === 'victory' ? '#22c55e' : '#ef4444' }}
              >
                <div className="text-5xl font-bold mb-3" style={{ color: gameState.gameOver === 'victory' ? '#22c55e' : '#ef4444' }}>
                  {gameState.gameOver === 'victory' ? '/--ПОБЕДА--\\' : '/ПОРАЖЕНИЕ\\'}
                </div>
                <p className="text-slate-400 mb-4 text-sm">
                  {gameState.gameOver === 'victory' ? 'Все враги уничтожены!' : 'Ваша база разрушена...'}
                </p>
                <div className="text-xs text-slate-500 mb-6 font-mono border border-slate-800 rounded p-3 bg-slate-950 space-y-1">
                  <div>Время: {String(Math.floor(gameState.gameTime / 60000)).padStart(2,'0')}:{String(Math.floor((gameState.gameTime%60000)/1000)).padStart(2,'0')}</div>
                  <div>Юниты: {playerTeam.units.length} · Здания: {playerTeam.buildings.length}</div>
                  <div>Ресурсов: {Math.floor(playerTeam.resources)}</div>
                </div>
                <button onClick={handleRestart}
                  className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all border border-slate-500 text-sm">
                  Начать заново
                </button>
              </div>
            </div>
          )}

          {/* Pause / ESC menu */}
          {menuOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
              <div className="bg-slate-900 border border-slate-600/60 rounded-xl p-8 shadow-2xl w-[420px] font-mono">
                <div className="text-center text-2xl font-bold text-white mb-0.5">[ ПАУЗА ]</div>
                <div className="text-center text-xs text-slate-600 mb-5">Игра приостановлена</div>

                <div className="mb-5">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Горячие клавиши</div>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {HOTKEYS_TABLE.map(row => (
                      <div key={row.key} className="flex items-center gap-2 text-xs">
                        <span className="inline-block bg-slate-800 border border-slate-600/60 rounded px-2 py-0.5 text-yellow-300 min-w-[72px] text-center text-[10px]">
                          {row.key}
                        </span>
                        <span className="text-slate-400 flex-1">{row.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <button onClick={() => { setMenuOpen(false); setPaused(false); }}
                    className="w-full py-2.5 bg-green-900 hover:bg-green-800 text-white rounded border border-green-700 font-bold transition-all text-sm">
                    Продолжить
                  </button>
                  <button onClick={handleRestart}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 transition-all text-sm">
                    Начать заново
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Bottom HUD panel ── */}
        <div style={{ height: TOP_BAR_H + BOTTOM_HUD_H, flexShrink: 0 }}>
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
