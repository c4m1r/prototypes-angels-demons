import { useEffect, useRef, useState } from 'react';
import { GameState, Position, Unit, Building, MAP_SIZES, MapSize, CombatEvent } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';
import { isBuilder, isTileVisible } from '../engine/gameEngine';

interface GameCanvasProps {
  gameState: GameState;
  mapSize: MapSize;
  camera: Position;
  buildModeActive: boolean;
  attackMoveMode?: boolean;
  abilityTargetMode?: boolean;
  onCameraChange: (camera: Position) => void;
  onMouseDown: (screenPos: Position, worldPos: Position) => void;
  onMouseMove: (screenPos: Position, worldPos: Position) => void;
  onMouseUp: (screenPos: Position, worldPos: Position) => void;
  onRightClick: (worldPos: Position) => void;
}

const CRYSTAL_SMALL = [
  ' /D\\ ',
  '/DDD\\',
  '\\DDD/',
  ' \\D/ ',
];

export default function GameCanvas({
  gameState,
  mapSize,
  camera,
  buildModeActive,
  attackMoveMode = false,
  abilityTargetMode = false,
  onCameraChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onRightClick,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 700 });

  useEffect(() => {
    const updateSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setCanvasSize({ width: container.clientWidth, height: Math.max(500, window.innerHeight - 200) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileSize = MAP_SIZES[mapSize].tileSize;
    const now = Date.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const startTileX = Math.max(0, Math.floor(camera.x / tileSize));
    const startTileY = Math.max(0, Math.floor(camera.y / tileSize));
    const endTileX = Math.min(gameState.map.width, Math.ceil((camera.x + canvas.width) / tileSize) + 1);
    const endTileY = Math.min(gameState.map.height, Math.ceil((camera.y + canvas.height) / tileSize) + 1);

    for (let ty = startTileY; ty < endTileY; ty++) {
      for (let tx = startTileX; tx < endTileX; tx++) {
        const tile = gameState.map.tiles[ty]?.[tx];
        if (!tile) continue;

        const screenX = tx * tileSize - camera.x;
        const screenY = ty * tileSize - camera.y;

        const revealed = gameState.revealedTiles[ty]?.[tx];
        const visible = isTileVisible(gameState, tx, ty);

        if (!revealed) {
          ctx.fillStyle = '#050810';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
          continue;
        }

        ctx.fillStyle = tile.bgColor;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        if (tile.type === 'crystal') {
          drawCrystalTile(ctx, screenX, screenY, tileSize, visible);
        } else {
          ctx.fillStyle = visible ? tile.color : `${tile.color}44`;
          ctx.font = `${tileSize * 0.6}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile.ascii, screenX + tileSize / 2, screenY + tileSize / 2);
        }

        if (!visible) {
          ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
          ctx.fillRect(screenX, screenY, tileSize, tileSize);
        }
      }
    }

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
      ctx.shadowBlur = 14;
      ctx.fillStyle = ownerColor;
      ctx.font = `bold ${tileSize * 1.1}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cp.ascii, screenX, screenY);
      ctx.shadowBlur = 0;

      ctx.strokeStyle = ownerColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, tileSize * 0.9, 0, Math.PI * 2);
      ctx.stroke();

      if (cp.owner === null) {
        const maxProgress = Math.max(...cp.captureProgress);
        if (maxProgress > 0) {
          const leadingTeam = cp.captureProgress.findIndex(v => v === maxProgress);
          const leadingColor = gameState.teams[leadingTeam]?.color || '#ffffff';
          ctx.strokeStyle = leadingColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(screenX, screenY, tileSize * 0.9, -Math.PI / 2, -Math.PI / 2 + maxProgress * Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    });

    const allObjects: Array<{ building?: Building; unit?: Unit; teamId: number; order: number }> = [];
    gameState.teams.forEach(team => {
      team.buildings.forEach(building => {
        const btx = Math.floor(building.position.x / tileSize);
        const bty = Math.floor(building.position.y / tileSize);
        if (!isTileVisible(gameState, btx, bty)) return;
        allObjects.push({ building, teamId: team.id, order: building.position.y + building.position.x });
      });
      team.units.forEach(unit => {
        const utx = Math.floor(unit.position.x / tileSize);
        const uty = Math.floor(unit.position.y / tileSize);
        if (!isTileVisible(gameState, utx, uty)) return;
        allObjects.push({ unit, teamId: team.id, order: unit.position.y + unit.position.x });
      });
    });
    allObjects.sort((a, b) => a.order - b.order);

    allObjects.forEach(obj => {
      const team = gameState.teams[obj.teamId];
      if (obj.building) {
        drawBuilding(ctx, obj.building, camera, team.color, team.glowColor, now);
      } else if (obj.unit) {
        drawUnit(ctx, obj.unit, camera, team.color, team.glowColor, now);
      }
    });

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
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = dm.isBuilding ? 4 : 2;
      const size = dm.isBuilding ? 20 : 12;

      ctx.beginPath();
      ctx.moveTo(screenX - size, screenY - size);
      ctx.lineTo(screenX + size, screenY + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(screenX + size, screenY - size);
      ctx.lineTo(screenX - size, screenY + size);
      ctx.stroke();

      ctx.globalAlpha = 1;
    });

    const buildRadius = 160;
    gameState.teams.forEach(team => {
      if (!team.isPlayer) return;
      team.units.forEach(unit => {
        if (!isBuilder(unit.type)) return;
        if (!unit.selected && !buildModeActive) return;

        const sx = unit.position.x - camera.x;
        const sy = unit.position.y - camera.y;

        ctx.strokeStyle = `${team.color}55`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(sx, sy, buildRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = `${team.color}08`;
        ctx.beginPath();
        ctx.arc(sx, sy, buildRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    gameState.combatEvents.forEach(event => {
      if (now - event.timestamp < 1200) {
        drawCombatEvent(ctx, event, camera, now);
      }
    });

    gameState.speechBubbles.forEach(bubble => {
      if (now - bubble.timestamp > 3000) return;
      if (!bubble.text) return;

      const age = (now - bubble.timestamp) / 3000;
      const alpha = age < 0.1 ? age / 0.1 : age > 0.7 ? 1 - (age - 0.7) / 0.3 : 1;

      const screenX = bubble.position.x - camera.x;
      const screenY = bubble.position.y - camera.y - 40;

      ctx.globalAlpha = alpha * 0.85;

      ctx.font = '10px monospace';
      const textWidth = ctx.measureText(bubble.text).width;
      const padding = 6;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 18;

      ctx.fillStyle = 'rgba(10, 14, 26, 0.9)';
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(screenX - boxWidth / 2, screenY - boxHeight / 2, boxWidth, boxHeight, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e0e0e0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.text, screenX, screenY);

      ctx.globalAlpha = 1;
    });

    gameState.teams.forEach(team => {
      team.units.forEach(unit => {
        if (now - unit.lastAttackFlash < 200 && !UNIT_CONFIGS[unit.type].isMelee) {
          if (unit.targetUnit) {
            const target = findUnitById(gameState, unit.targetUnit);
            if (target) {
              const sx = unit.position.x - camera.x;
              const sy = unit.position.y - camera.y;
              const tx = target.position.x - camera.x;
              const ty = target.position.y - camera.y;
              ctx.strokeStyle = team.color;
              ctx.lineWidth = 2;
              ctx.globalAlpha = 0.6;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(tx, ty);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          } else if (unit.targetBuilding) {
            const target = findBuildingById(gameState, unit.targetBuilding);
            if (target) {
              const sx = unit.position.x - camera.x;
              const sy = unit.position.y - camera.y;
              const tx = target.position.x - camera.x;
              const ty = target.position.y - camera.y;
              ctx.strokeStyle = team.color;
              ctx.lineWidth = 2;
              ctx.globalAlpha = 0.6;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(tx, ty);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      });
    });

    if (gameState.selectionBox) {
      const start = { x: gameState.selectionBox.start.x - camera.x, y: gameState.selectionBox.start.y - camera.y };
      const end = { x: gameState.selectionBox.end.x - camera.x, y: gameState.selectionBox.end.y - camera.y };

      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        Math.min(start.x, end.x), Math.min(start.y, end.y),
        Math.abs(end.x - start.x), Math.abs(end.y - start.y)
      );
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
      ctx.fillRect(
        Math.min(start.x, end.x), Math.min(start.y, end.y),
        Math.abs(end.x - start.x), Math.abs(end.y - start.y)
      );
    }

    const mapPixelW = gameState.map.width * tileSize;
    const mapPixelH = gameState.map.height * tileSize;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(-camera.x, -camera.y, mapPixelW, mapPixelH);
  }, [gameState, camera, mapSize, canvasSize]);

  function drawCrystalTile(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    tileSize: number,
    visible: boolean
  ) {
    const art = CRYSTAL_SMALL;
    const charSize = tileSize / 5;
    const startX = screenX + tileSize / 2 - (art[0].length * charSize) / 2;
    const startY = screenY + tileSize / 2 - (art.length * charSize) / 2;

    ctx.shadowColor = '#60d0ff';
    ctx.shadowBlur = visible ? 12 : 4;

    for (let row = 0; row < art.length; row++) {
      for (let col = 0; col < art[row].length; col++) {
        const ch = art[row][col];
        if (ch === ' ') continue;

        const cx = startX + col * charSize + charSize / 2;
        const cy = startY + row * charSize + charSize / 2;

        if (ch === 'D') {
          ctx.fillStyle = visible ? '#80e0ff' : '#406080';
          ctx.font = `bold ${charSize * 1.2}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('D', cx, cy);
        } else {
          ctx.strokeStyle = visible ? '#60d0ff' : '#304860';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (ch === '╱') {
            ctx.moveTo(cx - charSize / 2, cy + charSize / 2);
            ctx.lineTo(cx + charSize / 2, cy - charSize / 2);
          } else if (ch === '╲') {
            ctx.moveTo(cx - charSize / 2, cy - charSize / 2);
            ctx.lineTo(cx + charSize / 2, cy + charSize / 2);
          }
          ctx.stroke();
        }
      }
    }

    ctx.shadowBlur = 0;
  }

  function drawBuilding(
    ctx: CanvasRenderingContext2D,
    building: Building,
    camera: Position,
    teamColor: string,
    glowColor: string,
    now: number
  ) {
    const config = BUILDING_CONFIGS[building.type];
    const screenPos = { x: building.position.x - camera.x, y: building.position.y - camera.y };
    const width = config.width * 12;
    const height = config.height * 12;

    if (building.selected) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 18;
    }

    const healthRatio = building.health / building.maxHealth;
    const flashIntensity = healthRatio < 0.3 ? Math.sin(now / 200) * 0.3 + 0.3 : 0;

    ctx.fillStyle = building.selected ? '#ffff00' : teamColor;
    ctx.globalAlpha = 0.85 + flashIntensity;
    ctx.fillRect(screenPos.x - width / 2, screenPos.y - height / 2, width, height);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = building.selected ? '#ffff00' : '#000';
    ctx.lineWidth = building.selected ? 3 : 2;
    ctx.strokeRect(screenPos.x - width / 2, screenPos.y - height / 2, width, height);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.ascii[1] || config.ascii[0], screenPos.x, screenPos.y);

    const barWidth = width;
    const barHeight = 4;
    ctx.fillStyle = '#111';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - height / 2 - 10, barWidth, barHeight);
    ctx.fillStyle = healthRatio > 0.6 ? '#22dd22' : healthRatio > 0.3 ? '#ffdd00' : '#ff3333';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - height / 2 - 10, barWidth * healthRatio, barHeight);
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
    const screenPos = { x: unit.position.x - camera.x, y: unit.position.y - camera.y };

    const isAttacking = now - unit.lastAttackFlash < 300;
    const isRanged = !config.isMelee;
    const radius = 14;

    if (unit.selected) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
    }

    if (isAttacking) {
      ctx.shadowColor = isRanged ? '#ff4400' : '#ff8800';
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = isAttacking ? (isRanged ? '#ff6600' : '#ffcc00') : unit.selected ? '#ffff00' : teamColor;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = unit.selected ? '#ffff00' : '#000';
    ctx.lineWidth = unit.selected ? 3 : 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (isRanged) {
      ctx.strokeStyle = `${teamColor}66`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${radius}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.ascii, screenPos.x, screenPos.y);

    if (unit.squadSize > 1) {
      ctx.fillStyle = '#ffff00';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(unit.squadSize.toString(), screenPos.x + 18, screenPos.y - 12);
    }

    if (unit.isHero) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (unit.level > 1) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Lv${unit.level}`, screenPos.x + 16, screenPos.y + 14);
      }
    }

    if (unit.pendingLevelUps > 0) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('UP', screenPos.x, screenPos.y - 28);
      ctx.shadowBlur = 0;
    }

    const healthPercent = unit.health / unit.maxHealth;
    const barWidth = 30;
    const barHeight = 3;
    ctx.fillStyle = '#111';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - 24, barWidth, barHeight);
    ctx.fillStyle = healthPercent > 0.6 ? '#22dd22' : healthPercent > 0.3 ? '#ffdd00' : '#ff3333';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - 24, barWidth * healthPercent, barHeight);

    if (unit.maxMana > 0) {
      const manaPercent = unit.mana / unit.maxMana;
      ctx.fillStyle = '#111';
      ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - 28, barWidth, 2);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - 28, barWidth * manaPercent, 2);
    }

    if (unit.path.length > 0 && unit.pathIndex < unit.path.length) {
      ctx.strokeStyle = `${teamColor}33`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(screenPos.x, screenPos.y);
      for (let i = unit.pathIndex; i < Math.min(unit.pathIndex + 5, unit.path.length); i++) {
        ctx.lineTo(unit.path[i].x - camera.x, unit.path[i].y - camera.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (unit.moving && unit.targetPosition) {
      ctx.strokeStyle = `${teamColor}44`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(screenPos.x, screenPos.y);
      ctx.lineTo(unit.targetPosition.x - camera.x, unit.targetPosition.y - camera.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawCombatEvent(
    ctx: CanvasRenderingContext2D,
    event: CombatEvent,
    camera: Position,
    now: number
  ) {
    const age = (now - event.timestamp) / 1200;
    const screenX = event.position.x - camera.x;
    const screenY = event.position.y - camera.y - 30 - age * 30;
    const alpha = 1 - age;

    if (alpha <= 0) return;

    ctx.globalAlpha = alpha;

    if (event.type === 'damage') {
      if (event.value > 0) {
        ctx.fillStyle = event.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`-${Math.floor(event.value)}`, screenX, screenY);
      } else if (event.value < 0) {
        ctx.fillStyle = '#22dd22';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`+${Math.floor(Math.abs(event.value))}`, screenX, screenY);
      } else {
        ctx.fillStyle = '#888';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('MISS', screenX, screenY);
      }
    } else if (event.type === 'kill') {
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('X', screenX, screenY);
    }

    ctx.globalAlpha = 1;
  }

  function findUnitById(state: GameState, unitId: string): Unit | undefined {
    for (const team of state.teams) {
      const unit = team.units.find(u => u.id === unitId);
      if (unit) return unit;
    }
    return undefined;
  }

  function findBuildingById(state: GameState, buildingId: string): Building | undefined {
    for (const team of state.teams) {
      const building = team.buildings.find(b => b.id === buildingId);
      if (building) return building;
    }
    return undefined;
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = { x: screenPos.x + camera.x, y: screenPos.y + camera.y };

    if (e.button === 0) {
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
    const worldPos = { x: screenPos.x + camera.x, y: screenPos.y + camera.y };

    if (e.buttons === 4 || (e.buttons === 1 && e.altKey)) {
      const dx = screenPos.x - lastMousePos.x;
      const dy = screenPos.y - lastMousePos.y;
      onCameraChange({ x: camera.x - dx, y: camera.y - dy });
    }

    onMouseMove(screenPos, worldPos);
    setLastMousePos(screenPos);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const worldPos = { x: screenPos.x + camera.x, y: screenPos.y + camera.y };
      onMouseUp(screenPos, worldPos);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => e.preventDefault();

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const speed = 30;
    const tileSize = MAP_SIZES[mapSize].tileSize;
    const mapPixelW = gameState.map.width * tileSize;
    const mapPixelH = gameState.map.height * tileSize;
    const maxX = Math.max(0, mapPixelW - canvasSize.width);
    const maxY = Math.max(0, mapPixelH - canvasSize.height);
    const newX = Math.max(0, Math.min(camera.x + (e.deltaY > 0 ? speed : -speed), maxX));
    const newY = Math.max(0, Math.min(camera.y + (e.deltaY > 0 ? speed : -speed), maxY));
    onCameraChange({ x: newX, y: newY });
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className={"border border-slate-700/50 bg-slate-950 block " + (abilityTargetMode ? "cursor-pointer" : attackMoveMode ? "cursor-crosshair" : "cursor-default")}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    />
  );
}
