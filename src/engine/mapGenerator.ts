import { GameMap, Tile, TileType, ControlPoint, MapSize, MAP_SIZES, Position } from '../types/game';

const TILE_TEMPLATES: Record<TileType, Omit<Tile, 'resourceAmount'>> = {
  grass: { type: 'grass', passable: true, movementCost: 1, ascii: '.', color: '#2d4a2d', bgColor: '#1a2e1a' },
  dirt: { type: 'dirt', passable: true, movementCost: 1.2, ascii: ',', color: '#4a3d2d', bgColor: '#2e241a' },
  rock: { type: 'rock', passable: false, movementCost: 999, ascii: '#', color: '#555566', bgColor: '#2a2a33' },
  forest: { type: 'forest', passable: true, movementCost: 2, ascii: '♣', color: '#1a5a1a', bgColor: '#0e2e0e' },
  crystal: { type: 'crystal', passable: true, movementCost: 1, ascii: '◆', color: '#60d0ff', bgColor: '#1a2e3a' },
  water: { type: 'water', passable: false, movementCost: 999, ascii: '~', color: '#2266aa', bgColor: '#0a1a3a' },
  ruins: { type: 'ruins', passable: true, movementCost: 1.5, ascii: '⌂', color: '#6a5a4a', bgColor: '#2a2218' },
  control_point: { type: 'control_point', passable: true, movementCost: 1, ascii: '◎', color: '#ffdd44', bgColor: '#3a3a1a' },
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateMap(mapSize: MapSize, seed?: number): GameMap {
  const config = MAP_SIZES[mapSize];
  const rand = seededRandom(seed ?? Date.now());
  const tiles: Tile[][] = [];
  const controlPoints: ControlPoint[] = [];

  for (let y = 0; y < config.height; y++) {
    tiles[y] = [];
    for (let x = 0; x < config.width; x++) {
      const r = rand();
      let tileType: TileType;

      if (r < 0.55) tileType = 'grass';
      else if (r < 0.72) tileType = 'dirt';
      else if (r < 0.80) tileType = 'forest';
      else if (r < 0.87) tileType = 'rock';
      else if (r < 0.92) tileType = 'water';
      else if (r < 0.96) tileType = 'ruins';
      else tileType = 'grass';

      const template = TILE_TEMPLATES[tileType];
      tiles[y][x] = {
        ...template,
        resourceAmount: 0,
      };
    }
  }

  const corners = [
    { x: 4, y: 4 },
    { x: config.width - 5, y: 4 },
    { x: 4, y: config.height - 5 },
    { x: config.width - 5, y: config.height - 5 },
  ];

  corners.forEach(corner => {
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const tx = corner.x + dx;
        const ty = corner.y + dy;
        if (tx >= 0 && tx < config.width && ty >= 0 && ty < config.height) {
          const template = TILE_TEMPLATES['grass'];
          tiles[ty][tx] = { ...template, resourceAmount: 0 };
        }
      }
    }
  });

  const numCrystals = mapSize === 'small' ? 6 : mapSize === 'medium' ? 10 : 14;
  for (let i = 0; i < numCrystals; i++) {
    let cx = Math.floor(rand() * (config.width - 10)) + 5;
    let cy = Math.floor(rand() * (config.height - 10)) + 5;

    const nearCorner = corners.some(c => Math.abs(c.x - cx) < 8 && Math.abs(c.y - cy) < 8);
    if (nearCorner) { cx += 10; cy += 10; }

    if (cx >= 0 && cx < config.width && cy >= 0 && cy < config.height) {
      const template = TILE_TEMPLATES['crystal'];
      tiles[cy][cx] = { ...template, resourceAmount: 100 };
    }
  }

  const numControlPoints = mapSize === 'small' ? 3 : mapSize === 'medium' ? 5 : 7;
  const placed: Position[] = [];
  for (let i = 0; i < numControlPoints; i++) {
    let px: number, py: number;
    let attempts = 0;
    do {
      px = Math.floor(rand() * (config.width - 20)) + 10;
      py = Math.floor(rand() * (config.height - 20)) + 10;
      attempts++;
    } while (
      attempts < 50 &&
      (corners.some(c => Math.abs(c.x - px) < 10 && Math.abs(c.y - py) < 10) ||
       placed.some(p => Math.abs(p.x - px) < 8 && Math.abs(p.y - py) < 8))
    );

    placed.push({ x: px, y: py });

    const cpId = `cp-${i}`;
    controlPoints.push({
      id: cpId,
      position: { x: px, y: py },
      owner: null,
      captureProgress: [0, 0, 0, 0],
      resourceRate: 2,
      ascii: '◎',
    });

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        if (tx >= 0 && tx < config.width && ty >= 0 && ty < config.height) {
          const template = TILE_TEMPLATES['control_point'];
          tiles[ty][tx] = { ...template, resourceAmount: 0 };
        }
      }
    }
  }

  return { tiles, width: config.width, height: config.height, controlPoints };
}

export function getStartPosition(map: GameMap, cornerIndex: number): Position {
  const corners = [
    { x: 4, y: 4 },
    { x: map.width - 5, y: 4 },
    { x: 4, y: map.height - 5 },
    { x: map.width - 5, y: map.height - 5 },
  ];
  return corners[cornerIndex];
}

export function isTilePassable(map: GameMap, tileX: number, tileY: number): boolean {
  if (tileX < 0 || tileX >= map.width || tileY < 0 || tileY >= map.height) return false;
  return map.tiles[tileY][tileX].passable;
}

export function worldToTile(worldX: number, worldY: number, tileSize: number): { tx: number; ty: number } {
  return { tx: Math.floor(worldX / tileSize), ty: Math.floor(worldY / tileSize) };
}

export function tileToWorld(tx: number, ty: number, tileSize: number): Position {
  return { x: tx * tileSize + tileSize / 2, y: ty * tileSize + tileSize / 2 };
}
