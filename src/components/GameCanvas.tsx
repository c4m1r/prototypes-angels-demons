import { useEffect, useRef, useState } from 'react';
import { GameState, Position, Unit, Building } from '../types/game';
import { UNIT_CONFIGS } from '../config/units';
import { BUILDING_CONFIGS } from '../config/buildings';

interface GameCanvasProps {
  gameState: GameState;
  onMouseDown: (pos: Position) => void;
  onMouseMove: (pos: Position) => void;
  onMouseUp: (pos: Position) => void;
  onRightClick: (pos: Position) => void;
}

export default function GameCanvas({
  gameState,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onRightClick,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const playerTeam = gameState.teams[gameState.playerTeam];
    if (playerTeam && playerTeam.buildings.length > 0) {
      const mainBuilding = playerTeam.buildings[0];
      setCamera({
        x: mainBuilding.position.x - 400,
        y: mainBuilding.position.y - 300,
      });
    }
  }, [gameState.playerTeam]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gridSize = 100;
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;

    for (let x = -camera.x % gridSize; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = -camera.y % gridSize; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    gameState.teams.forEach(team => {
      team.buildings.forEach(building => {
        drawBuilding(ctx, building, camera, team.color);
      });

      team.units.forEach(unit => {
        drawUnit(ctx, unit, camera, team.color);
      });
    });

    if (gameState.selectionBox) {
      const start = screenToWorld(gameState.selectionBox.start, camera);
      const end = screenToWorld(gameState.selectionBox.end, camera);

      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        start.x,
        start.y,
        end.x - start.x,
        end.y - start.y
      );
    }
  }, [gameState, camera]);

  function drawBuilding(
    ctx: CanvasRenderingContext2D,
    building: Building,
    camera: Position,
    teamColor: string
  ) {
    const config = BUILDING_CONFIGS[building.type];
    const screenPos = worldToScreen(building.position, camera);

    const width = config.width * 20;
    const height = config.height * 20;

    ctx.fillStyle = building.selected ? '#ffff00' : teamColor;
    ctx.fillRect(screenPos.x - width / 2, screenPos.y - height / 2, width, height);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenPos.x - width / 2, screenPos.y - height / 2, width, height);

    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.ascii[1], screenPos.x, screenPos.y);

    const healthPercent = building.health / building.maxHealth;
    const barWidth = width;
    const barHeight = 4;

    ctx.fillStyle = '#333';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - height / 2 - 10, barWidth, barHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
    ctx.fillRect(
      screenPos.x - barWidth / 2,
      screenPos.y - height / 2 - 10,
      barWidth * healthPercent,
      barHeight
    );
  }

  function drawUnit(
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    camera: Position,
    teamColor: string
  ) {
    const config = UNIT_CONFIGS[unit.type];
    const screenPos = worldToScreen(unit.position, camera);

    ctx.fillStyle = unit.selected ? '#ffff00' : teamColor;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.ascii, screenPos.x, screenPos.y);

    if (unit.squadSize > 1) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(unit.squadSize.toString(), screenPos.x + 12, screenPos.y - 12);
    }

    const healthPercent = unit.health / unit.maxHealth;
    const barWidth = 30;
    const barHeight = 4;

    ctx.fillStyle = '#333';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - 25, barWidth, barHeight);

    ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
    ctx.fillRect(screenPos.x - barWidth / 2, screenPos.y - 25, barWidth * healthPercent, barHeight);
  }

  function worldToScreen(pos: Position, camera: Position): Position {
    return {
      x: pos.x - camera.x,
      y: pos.y - camera.y,
    };
  }

  function screenToWorld(pos: Position, camera: Position): Position {
    return {
      x: pos.x + camera.x,
      y: pos.y + camera.y,
    };
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        onMouseDown(pos);
        setLastMousePos(pos);
      }
    } else if (e.button === 2) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = screenToWorld(
          { x: e.clientX - rect.left, y: e.clientY - rect.top },
          camera
        );
        onRightClick(pos);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (e.buttons === 4) {
        const dx = pos.x - lastMousePos.x;
        const dy = pos.y - lastMousePos.y;
        setCamera(prev => ({ x: prev.x - dx, y: prev.y - dy }));
      }

      onMouseMove(pos);
      setLastMousePos(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        onMouseUp(pos);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={700}
      className="border-2 border-slate-600 bg-slate-900 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    />
  );
}
