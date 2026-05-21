import { useEffect, useRef, useState } from 'react';
import { GameState, Position, Unit, Building, MAP_SIZES, MapSize, CombatEvent } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';

interface GameCanvasProps {
  gameState: GameState;
  mapSize: MapSize;
  camera: Position;
  onCameraChange: (camera: Position) => void;
  onMouseDown: (screenPos: Position, worldPos: Position) => void;
  onMouseMove: (screenPos: Position, worldPos: Position) => void;
  onMouseUp: (screenPos: Position, worldPos: Position) => void;
  onRightClick: (worldPos: Position) => void;
}

export default function GameCanvas({
  gameState,
  mapSize,
  camera,
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

        ctx.fillStyle = tile.bgColor;
        ctx.fillRect(screenX, screenY, tileSize, tileSize);

        ctx.fillStyle = tile.color;
        ctx.font = `${tileSize * 0.6}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.ascii, screenX + tileSize / 2, screenY + tileSize / 2);

        if (tile.type === 'crystal') {
          ctx.shadowColor = '#60d0ff';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#60d0ff';
          ctx.font = `bold ${tileSize * 0.7}px monospace`;
          ctx.fillText(tile.ascii, screenX + tileSize / 2, screenY + tileSize / 2);
          ctx.shadowBlur = 0;
        }
      }
    }

    gameState.map.controlPoints.forEach(cp => {
      const screenX = cp.position.x * tileSize - camera.x + tileSize / 2;
      const screenY = cp.position.y * tileSize - camera.y + tileSize / 2;
      const ownerColor = cp.owner !== null ? gameState.teams[cp.owner]?.color : '#ffdd44';

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
    });

    const allObjects: Array<{ building?: Building; unit?: Unit; teamId: number; order: number }> = [];
    gameState.teams.forEach(team => {
      team.buildings.forEach(building => {
        allObjects.push({ building, teamId: team.id, order: building.position.y + building.position.x });
      });
      team.units.forEach(unit => {
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

    gameState.combatEvents.forEach(event => {
      if (now - event.timestamp < 1200) {
        drawCombatEvent(ctx, event, camera, now);
      }
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
    const radius = 14;

    if (unit.selected) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 14;
    }

    if (isAttacking) {
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = isAttacking ? '#ffcc00' : unit.selected ? '#ffff00' : teamColor;
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
    onCameraChange({
      x: camera.x + (e.deltaY > 0 ? speed : -speed),
      y: camera.y + (e.deltaY > 0 ? speed : -speed),
    });
  };

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="border border-slate-700/50 bg-slate-950 cursor-crosshair block"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    />
  );
}
