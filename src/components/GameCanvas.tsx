import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Position, Unit, Building, MAP_SIZES, MapSize, CombatEvent } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { isBuilder, isTileVisible } from '../engine/gameEngine';

interface GameCanvasProps {
  gameState: GameState;
  mapSize: MapSize;
  camera: Position;
  zoom: number;
  buildMode: string | null;
  attackMoveMode?: boolean;
  abilityTargetMode?: boolean;
  onCameraChange: (camera: Position) => void;
  onZoomChange: (zoom: number) => void;
  onMouseDown: (screenPos: Position, worldPos: Position) => void;
  onMouseMove: (screenPos: Position, worldPos: Position) => void;
  onMouseUp: (screenPos: Position, worldPos: Position) => void;
  onRightClick: (worldPos: Position) => void;
  onBuildPlace: (worldPos: Position) => void;
}

interface TooltipData {
  x: number;
  y: number;
  lines: string[];
  color: string;
}

export default function GameCanvas({
  gameState,
  mapSize,
  camera,
  zoom,
  buildMode,
  attackMoveMode = false,
  abilityTargetMode = false,
  onCameraChange,
  onZoomChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onRightClick,
  onBuildPlace,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 700 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const updateSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setCanvasSize({ width: container.clientWidth, height: container.clientHeight || Math.max(500, window.innerHeight - 190) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileSize = MAP_SIZES[mapSize].tileSize;
    const now = Date.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoom, zoom);

    const startTileX = Math.max(0, Math.floor(camera.x / tileSize));
    const startTileY = Math.max(0, Math.floor(camera.y / tileSize));
    const endTileX = Math.min(gameState.map.width, Math.ceil((camera.x + canvas.width) / tileSize) + 1);
    const endTileY = Math.min(gameState.map.height, Math.ceil((camera.y + canvas.height) / tileSize) + 1);

    // --- Draw tiles as pure ASCII chars on dark background ---
    const charSize = Math.max(7, tileSize * 0.55);
    ctx.font = `${charSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        const tile = gameState.map.tiles[ty]?.[tx];
        if (!tile) continue;

        const screenX = tx * tileSize - camera.x;
        const screenY = ty * tileSize - camera.y;
        const cx = screenX + tileSize / 2;
        const cy = screenY + tileSize / 2;

        const revealed = gameState.revealedTiles[ty]?.[tx];
        const visible = isTileVisible(gameState, tx, ty);

        if (!revealed) {
          // Completely unseen: draw void dot
          ctx.fillStyle = '#050810';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = '#111827';
          ctx.fillText(' ', cx, cy);
          continue;
        }

        // Tile background — subtle, not a filled square
        // Just draw the character
        const dimmed = !visible;

        if (tile.type === 'crystal') {
          if (dimmed) {
            ctx.fillStyle = '#0a1220';
            ctx.fillRect(screenX, screenY, tileSize, tileSize);
            ctx.globalAlpha = 0.35;
            ctx.shadowColor = '#60d0ff';
            ctx.shadowBlur = 4;
          } else {
            ctx.globalAlpha = 1;
            ctx.shadowColor = '#60d0ff';
            ctx.shadowBlur = 8;
          }
          ctx.fillStyle = dimmed ? '#304860' : '#80e0ff';
          ctx.font = `bold ${charSize * 1.1}px "Courier New", monospace`;
          ctx.fillText('D', cx, cy);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          ctx.font = `${charSize}px "Courier New", monospace`;
        } else if (tile.type === 'rock') {
          ctx.fillStyle = '#1a1a22';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = dimmed ? '#33334466' : '#555566';
          ctx.fillText('#', cx, cy);
        } else if (tile.type === 'water') {
          ctx.fillStyle = '#060f1e';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          const wave = Math.sin(now / 1200 + tx * 0.8 + ty * 0.5) * 0.15 + 0.6;
          ctx.globalAlpha = dimmed ? 0.25 : wave;
          ctx.fillStyle = '#2266aa';
          ctx.fillText('~', cx, cy);
          ctx.globalAlpha = 1;
        } else if (tile.type === 'forest') {
          ctx.fillStyle = '#060f06';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = dimmed ? '#1a3a1a66' : '#2a6a2a';
          ctx.fillText('Y', cx, cy);
        } else if (tile.type === 'dirt') {
          // dirt: scattered dots
          ctx.fillStyle = dimmed ? '#1e180e' : '#2a1e10';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = dimmed ? '#3a2e1e66' : '#5a4a34';
          // alternate between chars based on position
          const c = (tx + ty) % 3 === 0 ? ',' : (tx * 3 + ty) % 5 === 0 ? '.' : ' ';
          if (c !== ' ') ctx.fillText(c, cx, cy);
        } else if (tile.type === 'grass') {
          ctx.fillStyle = dimmed ? '#0a100a' : '#0e160e';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          // sparse grass chars
          const g = (tx * 7 + ty * 3) % 9;
          if (g === 0) {
            ctx.fillStyle = dimmed ? '#1a3a1a55' : '#2a4a2a';
            ctx.fillText("'", cx, cy);
          } else if (g === 4) {
            ctx.fillStyle = dimmed ? '#1a3a1a44' : '#223a22';
            ctx.fillText('`', cx, cy);
          }
        } else if (tile.type === 'ruins') {
          ctx.fillStyle = dimmed ? '#100e08' : '#14110a';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = dimmed ? '#4a3a2a55' : '#6a5a3a';
          const r = (tx * 5 + ty * 7) % 4;
          ctx.fillText(r < 2 ? 'n' : r === 2 ? 'u' : 'L', cx, cy);
        } else if (tile.type === 'control_point') {
          ctx.fillStyle = '#18160a';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          ctx.fillStyle = dimmed ? '#5a5a0a44' : '#4a4a14';
          ctx.fillText('-', cx, cy);
        }
      }
    }

    // --- Draw control points ---
    gameState.map.controlPoints.forEach(cp => {
      const cpTileX = cp.position.x;
      const cpTileY = cp.position.y;
      const visible = isTileVisible(gameState, cpTileX, cpTileY);
      if (!visible && !gameState.revealedTiles[cpTileY]?.[cpTileX]) return;

      const screenX = cp.position.x * tileSize - camera.x + tileSize / 2;
      const screenY = cp.position.y * tileSize - camera.y + tileSize / 2;
      const ownerColor = cp.owner !== null ? gameState.teams[cp.owner]?.color : '#ffdd44';

      ctx.globalAlpha = visible ? 1 : 0.4;
      ctx.shadowColor = ownerColor;
      ctx.shadowBlur = 16;
      ctx.fillStyle = ownerColor;
      ctx.font = `bold ${tileSize * 1.2}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('O', screenX, screenY);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = ownerColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(screenX, screenY, tileSize * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (cp.owner === null) {
        const maxProgress = Math.max(...cp.captureProgress);
        if (maxProgress > 0) {
          const leadingTeam = cp.captureProgress.findIndex(v => v === maxProgress);
          const leadingColor = gameState.teams[leadingTeam]?.color || '#ffffff';
          ctx.strokeStyle = leadingColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(screenX, screenY, tileSize * 0.85, -Math.PI / 2, -Math.PI / 2 + maxProgress * Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    });

    // --- Sort and draw buildings + units ---
    const allObjects: Array<{ building?: Building; unit?: Unit; teamId: number; order: number }> = [];
    gameState.teams.forEach(team => {
      team.buildings.forEach(building => {
        const btx = Math.floor(building.position.x / tileSize);
        const bty = Math.floor(building.position.y / tileSize);
        if (!isTileVisible(gameState, btx, bty)) return;
        allObjects.push({ building, teamId: team.id, order: building.position.y });
      });
      team.units.forEach(unit => {
        const utx = Math.floor(unit.position.x / tileSize);
        const uty = Math.floor(unit.position.y / tileSize);
        if (!isTileVisible(gameState, utx, uty)) return;
        allObjects.push({ unit, teamId: team.id, order: unit.position.y });
      });
    });
    allObjects.sort((a, b) => a.order - b.order);

    allObjects.forEach(obj => {
      const team = gameState.teams[obj.teamId];
      if (obj.building) drawBuilding(ctx, obj.building, camera, team.color, team.glowColor, now);
      else if (obj.unit) drawUnit(ctx, obj.unit, camera, team.color, team.glowColor, now);
    });

    // --- Death markers ---
    gameState.deathMarkers.forEach(dm => {
      const age = (now - dm.timestamp) / 60000;
      if (age >= 1) return;
      const alpha = 1 - age;
      const screenX = dm.position.x - camera.x;
      const screenY = dm.position.y - camera.y;
      const dtx = Math.floor(dm.position.x / tileSize);
      const dty = Math.floor(dm.position.y / tileSize);
      if (!gameState.revealedTiles[dty]?.[dtx]) return;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff2222';
      ctx.font = `bold ${dm.isBuilding ? 18 : 13}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('X', screenX, screenY);
      ctx.globalAlpha = 1;
    });

    // --- Builder radius ---
    const buildRadius = 160;
    gameState.teams.forEach(team => {
      if (!team.isPlayer) return;
      team.units.forEach(unit => {
        if (!isBuilder(unit.type)) return;
        if (!unit.selected && !buildMode) return;
        const sx = unit.position.x - camera.x;
        const sy = unit.position.y - camera.y;
        ctx.strokeStyle = `${team.color}55`;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(sx, sy, buildRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `${team.color}06`;
        ctx.beginPath();
        ctx.arc(sx, sy, buildRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // --- Build ghost preview at cursor ---
    if (buildMode) {
      const bConfig = BUILDING_CONFIGS[buildMode as keyof typeof BUILDING_CONFIGS];
      if (bConfig) {
        const gx = mouseWorldPos.x - camera.x;
        const gy = mouseWorldPos.y - camera.y;

        // Snap to grid
        const snapX = Math.floor(mouseWorldPos.x / tileSize) * tileSize - camera.x;
        const snapY = Math.floor(mouseWorldPos.y / tileSize) * tileSize - camera.y;

        const playerTeam = gameState.teams[gameState.playerTeam];
        const hasBuilder = playerTeam.units.some(u => u.selected && isBuilder(u.type));
        const tileX = Math.floor(mouseWorldPos.x / tileSize);
        const tileY = Math.floor(mouseWorldPos.y / tileSize);
        const tile = gameState.map.tiles[tileY]?.[tileX];
        const valid = hasBuilder &&
          tile?.passable &&
          tileX >= 1 && tileX < gameState.map.width - 1 &&
          tileY >= 1 && tileY < gameState.map.height - 1 &&
          playerTeam.resources >= bConfig.cost;

        const ghostColor = valid ? '#00ff88' : '#ff3333';
        const bw = (bConfig.width || 3) * tileSize;
        const bh = (bConfig.height || 3) * tileSize;

        ctx.globalAlpha = 0.35;
        ctx.fillStyle = ghostColor;
        ctx.fillRect(snapX, snapY, bw, bh);
        ctx.globalAlpha = 1;

        ctx.strokeStyle = ghostColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(snapX, snapY, bw, bh);
        ctx.setLineDash([]);

        // ASCII label in center
        ctx.fillStyle = ghostColor;
        ctx.font = `bold 16px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bConfig.ascii[1] || bConfig.ascii[0], snapX + bw / 2, snapY + bh / 2);

        // "Cost" label
        ctx.fillStyle = valid ? '#00ff88' : '#ff5555';
        ctx.font = '11px Arial';
        ctx.fillText(`${bConfig.name} [${bConfig.cost}]`, gx, gy - 28);

        if (!hasBuilder) {
          ctx.fillStyle = '#ff5555';
          ctx.fillText('Нужен строитель!', gx, gy - 42);
        }
      }
    }

    // --- Combat events ---
    gameState.combatEvents.forEach(event => {
      if (now - event.timestamp < 1200) drawCombatEvent(ctx, event, camera, now);
    });

    // --- Speech bubbles ---
    gameState.speechBubbles.forEach(bubble => {
      if (now - bubble.timestamp > 3000) return;
      if (!bubble.text) return;
      const age = (now - bubble.timestamp) / 3000;
      const alpha = age < 0.1 ? age / 0.1 : age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;
      const screenX = bubble.position.x - camera.x;
      const screenY = bubble.position.y - camera.y - 44;

      ctx.globalAlpha = alpha * 0.88;
      ctx.font = '10px monospace';
      const textWidth = ctx.measureText(bubble.text).width;
      const pad = 5;

      ctx.fillStyle = 'rgba(8, 12, 22, 0.92)';
      ctx.strokeStyle = 'rgba(180, 180, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(screenX - textWidth / 2 - pad, screenY - 9, textWidth + pad * 2, 18, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.text, screenX, screenY);
      ctx.globalAlpha = 1;
    });

    // --- Ranged attack lines ---
    gameState.teams.forEach(team => {
      team.units.forEach(unit => {
        if (now - unit.lastAttackFlash > 200 || UNIT_CONFIGS[unit.type].isMelee) return;
        const target = unit.targetUnit ? findUnitById(gameState, unit.targetUnit)
          : unit.targetBuilding ? findBuildingById(gameState, unit.targetBuilding) : null;
        if (!target) return;
        const sx = unit.position.x - camera.x;
        const sy = unit.position.y - camera.y;
        const tx = target.position.x - camera.x;
        const ty = target.position.y - camera.y;
        ctx.strokeStyle = team.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      });
    });

    // --- Selection box ---
    if (gameState.selectionBox) {
      const start = { x: gameState.selectionBox.start.x - camera.x, y: gameState.selectionBox.start.y - camera.y };
      const end = { x: gameState.selectionBox.end.x - camera.x, y: gameState.selectionBox.end.y - camera.y };
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(end.x - start.x), Math.abs(end.y - start.y));
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 255, 136, 0.07)';
      ctx.fillRect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    }

    // Map border
    ctx.strokeStyle = '#1e2a3a';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(-camera.x, -camera.y, gameState.map.width * tileSize, gameState.map.height * tileSize);

    ctx.restore();

  }, [gameState, camera, zoom, mapSize, canvasSize, mouseWorldPos, buildMode]);

  // ---- Draw helpers ----

  function drawBuilding(
    ctx: CanvasRenderingContext2D,
    building: Building,
    camera: Position,
    teamColor: string,
    glowColor: string,
    now: number
  ) {
    const config = BUILDING_CONFIGS[building.type];
    const tileSize = MAP_SIZES[mapSize].tileSize;
    const sp = { x: building.position.x - camera.x, y: building.position.y - camera.y };

    // Size in pixels — use tileSize proportional
    const bw = Math.max(32, (config.width || 3) * tileSize * 0.7);
    const bh = Math.max(24, (config.height || 2) * tileSize * 0.55);

    const healthRatio = building.health / building.maxHealth;
    const isLowHp = healthRatio < 0.3;
    const flash = isLowHp ? Math.sin(now / 220) * 0.25 + 0.25 : 0;

    if (building.selected) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
    }

    // Outer border
    ctx.strokeStyle = building.selected ? '#ffff00' : teamColor;
    ctx.lineWidth = building.selected ? 2.5 : 1.5;
    ctx.globalAlpha = 0.9 + flash;
    ctx.strokeRect(sp.x - bw / 2, sp.y - bh / 2, bw, bh);
    ctx.globalAlpha = 1;

    // Inner fill — subtle
    ctx.fillStyle = `${teamColor}18`;
    ctx.fillRect(sp.x - bw / 2 + 1, sp.y - bh / 2 + 1, bw - 2, bh - 2);

    // ASCII art lines
    const art = config.ascii;
    const lineH = bh / (art.length + 0.5);
    const fontSize = Math.min(14, lineH * 0.85);
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = building.selected ? '#ffff88' : '#d0e0ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    art.forEach((line, i) => {
      const ly = sp.y - bh / 2 + lineH * (i + 0.75);
      ctx.fillText(line, sp.x, ly);
    });

    ctx.shadowBlur = 0;

    // Health bar
    const barW = bw;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(sp.x - barW / 2, sp.y - bh / 2 - 7, barW, 4);
    ctx.fillStyle = healthRatio > 0.6 ? '#22dd22' : healthRatio > 0.3 ? '#ffdd00' : '#ff3333';
    ctx.fillRect(sp.x - barW / 2, sp.y - bh / 2 - 7, barW * healthRatio, 4);

    // Production indicator
    if (building.producing) {
      const prog = building.productionProgress / (building.productionTime * 1000);
      ctx.fillStyle = '#111';
      ctx.fillRect(sp.x - barW / 2, sp.y + bh / 2 + 2, barW, 3);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(sp.x - barW / 2, sp.y + bh / 2 + 2, barW * prog, 3);
    }
  }

  function drawUnit(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    camera: Position,
    teamColor: string,
    glowColor: string,
    now: number
  ) {
    const config = UNIT_CONFIGS[unit.type];
    const sp = { x: unit.position.x - camera.x, y: unit.position.y - camera.y };

    const isAttacking = now - unit.lastAttackFlash < 300;
    const isRanged = !config.isMelee;
    const radius = unit.isHero ? 16 : 13;

    if (unit.selected) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;
    }
    if (isAttacking) {
      ctx.shadowColor = isRanged ? '#ff6600' : '#ff9900';
      ctx.shadowBlur = 18;
    }

    // Circle body
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = isAttacking ? (isRanged ? '#ff6600' : '#ffcc00') : unit.selected ? '#ffffaa' : `${teamColor}cc`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = unit.selected ? '#ffff44' : teamColor;
    ctx.lineWidth = unit.selected ? 2 : 1.5;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ranged ring
    if (isRanged && !isAttacking) {
      ctx.strokeStyle = `${teamColor}44`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, radius + 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ASCII char
    ctx.fillStyle = unit.selected ? '#222' : '#eef';
    ctx.font = `bold ${radius - 1}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.ascii, sp.x, sp.y + 0.5);

    // Squad size badge
    if (unit.squadSize > 1) {
      ctx.fillStyle = '#ffee00';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`x${unit.squadSize}`, sp.x + radius + 6, sp.y - radius + 4);
    }

    // Hero ring + level
    if (unit.isHero) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      if (unit.level > 1) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${unit.level}`, sp.x + radius + 5, sp.y + radius - 2);
      }
    }

    // Level-up indicator
    if (unit.pendingLevelUps > 0) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('^UP', sp.x, sp.y - radius - 10);
      ctx.shadowBlur = 0;
    }

    // Hold position indicator
    if (unit.holdPosition) {
      ctx.fillStyle = '#ff8800';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[H]', sp.x, sp.y + radius + 9);
    }

    // HP bar
    const hp = unit.health / unit.maxHealth;
    const bw = radius * 2.2;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(sp.x - bw / 2, sp.y - radius - 7, bw, 3);
    ctx.fillStyle = hp > 0.6 ? '#22dd22' : hp > 0.3 ? '#ffdd00' : '#ff3333';
    ctx.fillRect(sp.x - bw / 2, sp.y - radius - 7, bw * hp, 3);

    // Mana bar
    if (unit.maxMana > 0) {
      const mp = unit.mana / unit.maxMana;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(sp.x - bw / 2, sp.y - radius - 11, bw, 2);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(sp.x - bw / 2, sp.y - radius - 11, bw * mp, 2);
    }

    // Path preview
    if (unit.path.length > 0 && unit.pathIndex < unit.path.length) {
      ctx.strokeStyle = `${teamColor}30`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      for (let i = unit.pathIndex; i < Math.min(unit.pathIndex + 5, unit.path.length); i++) {
        ctx.lineTo(unit.path[i].x - camera.x, unit.path[i].y - camera.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawCombatEvent(ctx: CanvasRenderingContext2D, event: CombatEvent, camera: Position, now: number) {
    const age = (now - event.timestamp) / 1200;
    const sx = event.position.x - camera.x;
    const sy = event.position.y - camera.y - 28 - age * 28;
    const alpha = 1 - age;
    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;
    if (event.type === 'damage') {
      ctx.fillStyle = event.value > 0 ? event.color : '#22dd22';
      ctx.font = `bold 13px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(event.value > 0 ? `-${Math.floor(event.value)}` : `+${Math.floor(Math.abs(event.value))}`, sx, sy);
    } else if (event.type === 'kill') {
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('KLL', sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  function findUnitById(state: GameState, id: string): Unit | undefined {
    for (const team of state.teams) {
      const u = team.units.find(u => u.id === id);
      if (u) return u;
    }
  }

  function findBuildingById(state: GameState, id: string): Building | undefined {
    for (const team of state.teams) {
      const b = team.buildings.find(b => b.id === id);
      if (b) return b;
    }
  }

  // ---- Tooltip logic ----
  const computeTooltip = useCallback((worldX: number, worldY: number, screenX: number, screenY: number) => {
    const tileSize = MAP_SIZES[mapSize].tileSize;

    for (const team of gameState.teams) {
      for (const unit of team.units) {
        const dx = unit.position.x - worldX;
        const dy = unit.position.y - worldY;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          const cfg = UNIT_CONFIGS[unit.type];
          const ownerTeam = gameState.teams[unit.teamId];
          setTooltip({
            x: screenX + 12,
            y: screenY - 8,
            color: ownerTeam.color,
            lines: [
              `${cfg.name}${unit.isHero ? ' [ГЕРОЙ]' : ''}`,
              `HP: ${Math.floor(unit.health)}/${unit.maxHealth}`,
              ...(unit.maxMana > 0 ? [`Мана: ${Math.floor(unit.mana)}/${unit.maxMana}`] : []),
              `Атака: ${Math.floor(unit.damage * unit.squadSize)}  Дальн.: ${Math.floor(unit.range)}`,
              `Скорость: ${Math.floor(unit.movementSpeed)}  Ур.: ${unit.level}`,
              cfg.isMelee ? 'Тип: Ближний бой' : 'Тип: Дальний бой',
              `Фракция: ${FACTION_NAME[ownerTeam.faction] || ownerTeam.faction}`,
              ...(unit.isHero && unit.abilities.length > 0
                ? unit.abilities.map(a => `  [${a.ascii}] ${a.name} (${a.manaCost}м)`)
                : []),
            ],
          });
          return;
        }
      }
      for (const building of team.buildings) {
        const dx = building.position.x - worldX;
        const dy = building.position.y - worldY;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
          const cfg = BUILDING_CONFIGS[building.type];
          const ownerTeam = gameState.teams[building.teamId];
          setTooltip({
            x: screenX + 12,
            y: screenY - 8,
            color: ownerTeam.color,
            lines: [
              `${cfg.name}`,
              `HP: ${Math.floor(building.health)}/${building.maxHealth}`,
              `Тип: Здание`,
              cfg.isTurret ? `Турель | Урон: ${cfg.turretDamage} | Дальн.: ${cfg.turretRange}` : `Производство`,
              ...(cfg.canProduce ? [`Нанимает: ${cfg.canProduce.length} типов`] : []),
              ...(cfg.resourceGeneration ? [`Доход: +${cfg.resourceGeneration}/с`] : []),
              `Фракция: ${FACTION_NAME[ownerTeam.faction] || ownerTeam.faction}`,
              cfg.description,
            ],
          });
          return;
        }
      }
    }

    // Tile tooltip
    const tx = Math.floor(worldX / tileSize);
    const ty = Math.floor(worldY / tileSize);
    const tile = gameState.map.tiles[ty]?.[tx];
    if (tile && tile.type !== 'grass') {
      setTooltip({
        x: screenX + 12,
        y: screenY - 8,
        color: tile.color,
        lines: [
          TILE_NAME[tile.type] || tile.type,
          tile.passable ? 'Проходимо' : 'Непроходимо',
          ...(tile.type === 'crystal' && tile.resourceAmount > 0 ? [`Кристаллов: ${Math.floor(tile.resourceAmount)}`] : []),
        ],
      });
      return;
    }

    setTooltip(null);
  }, [gameState, mapSize]);

  const FACTION_NAME: Record<string, string> = {
    angels: 'Ангелы', demons: 'Демоны', undead: 'Нежить', machines: 'Машины',
  };
  const TILE_NAME: Record<string, string> = {
    dirt: 'Земля', rock: 'Скала', forest: 'Лес', crystal: 'Кристаллы', water: 'Вода',
    ruins: 'Руины', control_point: 'Точка захвата',
  };

  // ---- Canvas event handlers ----
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = { x: screenPos.x / zoom + camera.x, y: screenPos.y / zoom + camera.y };

    if (e.button === 0) {
      if (buildMode) {
        onBuildPlace(worldPos);
        return;
      }
      onMouseDown(screenPos, worldPos);
      setLastMousePos(screenPos);
    } else if (e.button === 2) {
      onRightClick(worldPos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = { x: screenPos.x / zoom + camera.x, y: screenPos.y / zoom + camera.y };

    setMouseWorldPos(worldPos);

    if (e.buttons === 4 || (e.buttons === 1 && e.altKey)) {
      const dx = screenPos.x - lastMousePos.x;
      const dy = screenPos.y - lastMousePos.y;
      onCameraChange({
        x: camera.x - dx / zoom,
        y: camera.y - dy / zoom,
      });
    }

    if (!buildMode) {
      onMouseMove(screenPos, worldPos);
    }
    setLastMousePos(screenPos);

    // Tooltip debounce
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => {
      computeTooltip(worldPos.x, worldPos.y, screenPos.x, screenPos.y);
    }, 300);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0 && !buildMode) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPos = { x: screenPos.x / zoom + camera.x, y: screenPos.y / zoom + camera.y };
      onMouseUp(screenPos, worldPos);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const tileSize = MAP_SIZES[mapSize].tileSize;

    if (e.ctrlKey || e.metaKey) {
      // Zoom: keep world point under cursor fixed
      const rect = canvasRef.current?.getBoundingClientRect();
      const mx = rect ? (e.clientX - rect.left) : canvasSize.width / 2;
      const my = rect ? (e.clientY - rect.top) : canvasSize.height / 2;
      const worldX = mx / zoom + camera.x;
      const worldY = my / zoom + camera.y;
      const factor = e.deltaY < 0 ? 1.12 : (1 / 1.12);
      const newZoom = Math.max(0.3, Math.min(3.0, zoom * factor));
      // Adjust camera so the world point stays under cursor
      const newCamX = worldX - mx / newZoom;
      const newCamY = worldY - my / newZoom;
      onZoomChange(newZoom);
      onCameraChange({ x: newCamX, y: newCamY });
    } else {
      // Scroll
      const speed = (tileSize * 2) / zoom;
      const delta = e.deltaY > 0 ? speed : -speed;
      if (e.shiftKey) {
        onCameraChange({ x: camera.x + delta, y: camera.y });
      } else {
        onCameraChange({ x: camera.x, y: camera.y + delta });
      }
    }
  };

  const cursor = buildMode ? 'cursor-crosshair'
    : abilityTargetMode ? 'cursor-pointer'
    : attackMoveMode ? 'cursor-crosshair'
    : 'cursor-default';

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`block bg-slate-950 ${cursor}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      />

      {/* Hover tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50"
          style={{ left: Math.min(tooltip.x, canvasSize.width - 200), top: Math.max(0, tooltip.y - tooltip.lines.length * 16 - 4) }}
        >
          <div
            className="bg-slate-950/95 border rounded px-2 py-1.5 shadow-xl"
            style={{ borderColor: `${tooltip.color}88`, boxShadow: `0 0 10px ${tooltip.color}33` }}
          >
            {tooltip.lines.map((line, i) => (
              <div
                key={i}
                className={`font-mono leading-snug whitespace-nowrap ${i === 0 ? 'text-xs font-bold' : 'text-[10px]'}`}
                style={{ color: i === 0 ? tooltip.color : '#aab0c0' }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
