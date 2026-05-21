import { GameMap, Position, MAP_SIZES, MapSize } from '../types/game';

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function getNeighbors(map: GameMap, x: number, y: number): { nx: number; ny: number; cost: number }[] {
  const neighbors: { nx: number; ny: number; cost: number }[] = [];
  const dirs = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
    { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
  ];

  for (const { dx, dy } of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
    const tile = map.tiles[ny][nx];
    if (!tile.passable) continue;

    if (dx !== 0 && dy !== 0) {
      const tileH = map.tiles[y]?.[x + dx];
      const tileV = map.tiles[y + dy]?.[x];
      if (!tileH?.passable || !tileV?.passable) continue;
    }

    neighbors.push({ nx, ny, cost: tile.movementCost * (dx !== 0 && dy !== 0 ? 1.414 : 1) });
  }

  return neighbors;
}

export function findPath(
  map: GameMap,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  maxNodes: number = 2000
): Position[] {
  if (startX === endX && startY === endY) return [];

  if (endX < 0 || endX >= map.width || endY < 0 || endY >= map.height) return [];
  if (!map.tiles[endY][endX].passable) {
    const alt = findNearestPassable(map, endX, endY);
    if (alt) { return findPath(map, startX, startY, alt.x, alt.y, maxNodes); }
    return [];
  }

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: startX, y: startY, g: 0,
    h: heuristic(startX, startY, endX, endY),
    f: 0, parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  let iterations = 0;

  while (openSet.length > 0 && iterations < maxNodes) {
    iterations++;

    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) bestIdx = i;
    }

    const current = openSet.splice(bestIdx, 1)[0];
    const key = `${current.x},${current.y}`;

    if (current.x === endX && current.y === endY) {
      const path: Position[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(key);

    for (const neighbor of getNeighbors(map, current.x, current.y)) {
      const nKey = `${neighbor.nx},${neighbor.ny}`;
      if (closedSet.has(nKey)) continue;

      const g = current.g + neighbor.cost;
      const existing = openSet.find(n => n.x === neighbor.nx && n.y === neighbor.ny);

      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
        }
      } else {
        const h = heuristic(neighbor.nx, neighbor.ny, endX, endY);
        openSet.push({ x: neighbor.nx, y: neighbor.ny, g, h, f: g + h, parent: current });
      }
    }
  }

  return [];
}

function findNearestPassable(map: GameMap, tx: number, ty: number): { x: number; y: number } | null {
  for (let r = 1; r <= 3; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height && map.tiles[ny][nx].passable) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
}

export function worldToTile(worldX: number, worldY: number, tileSize: number): { tx: number; ty: number } {
  return { tx: Math.floor(worldX / tileSize), ty: Math.floor(worldY / tileSize) };
}

export function tileToWorld(tx: number, ty: number, tileSize: number): Position {
  return { x: tx * tileSize + tileSize / 2, y: ty * tileSize + tileSize / 2 };
}

export function findPathWorld(
  map: GameMap,
  fromWorld: Position,
  toWorld: Position,
  mapSize: MapSize
): Position[] {
  const tileSize = MAP_SIZES[mapSize].tileSize;
  const start = worldToTile(fromWorld.x, fromWorld.y, tileSize);
  const end = worldToTile(toWorld.x, toWorld.y, tileSize);

  const tilePath = findPath(map, start.tx, start.ty, end.tx, end.ty);
  return tilePath.map(p => tileToWorld(p.x, p.y, tileSize));
}
