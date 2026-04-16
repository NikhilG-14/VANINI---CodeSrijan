import type { CognitiveKey, ZoneDef, Vec2 } from './types';

export const MAP_W = 32;
export const MAP_H = 24;
export const TILE_SIZE = 40;

// Tile type: 0=grass, 1=path, 2=wall
export type TileType = 0 | 1 | 2;

// ─── Zone Definitions ───────────────────────────────────────────────────────
export const ZONES: ZoneDef[] = [
  {
    id: 'storm-lab',
    x: 4, y: 2,
    w: 5, h: 4,
    cognitive: 'attention' as CognitiveKey,
    label: 'Focus Point',
    emoji: '🎯',
    color: '#3b82f6', // blue
    description: 'A test of selective attention and interference control.',
    gameId: 'stroop',
    completed: false,
  },
  {
    id: 'grey-house',
    x: 22, y: 2,
    w: 5, h: 4,
    cognitive: 'memory' as CognitiveKey,
    label: 'Memory Keep',
    emoji: '🧠',
    color: '#8b5cf6', // violet
    description: 'Measuring working memory update capacity.',
    gameId: 'n-back',
    completed: false,
  },
  {
    id: 'energy-core',
    x: 13, y: 9,
    w: 5, h: 5,
    cognitive: 'impulsivity' as CognitiveKey,
    label: 'Reflex Station',
    emoji: '⚡',
    color: '#ef4444', // red
    description: 'Testing inhibitory control and rapid decision making.',
    gameId: 'go-no-go',
    completed: false,
  },
  {
    id: 'courthouse',
    x: 4, y: 16,
    w: 5, h: 4,
    cognitive: 'flexibility' as CognitiveKey,
    label: 'Adaptation Lab',
    emoji: '🧩',
    color: '#10b981', // green
    description: 'A test of rule-flexibility and shifting cognitive sets.',
    gameId: 'wcst',
    completed: false,
  },
  {
    id: 'mind-library',
    x: 22, y: 16,
    w: 5, h: 4,
    cognitive: 'risk_behavior' as CognitiveKey,
    label: 'The Casino',
    emoji: '🎈',
    color: '#f59e0b', // amber
    description: 'Evaluating risk tolerance versus safety maximization.',
    gameId: 'bart',
    completed: false,
  },
];

// Entry tile for each zone (1-tile doorway on walkable path)
export const ZONE_ENTRIES: Record<string, Vec2> = {
  'storm-lab':    { x: 6,  y: 6 },
  'grey-house':   { x: 24, y: 6 },
  'energy-core':  { x: 15, y: 14 },
  'courthouse':   { x: 6,  y: 16 },
  'mind-library': { x: 24, y: 16 },
};

// ─── Map Generation ─────────────────────────────────────────────────────────
function buildMap(): TileType[][] {
  const grid: TileType[][] = Array.from({ length: MAP_H }, (_, y) =>
    Array.from({ length: MAP_W }, (_, x): TileType => {
      // outer border = wall
      if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) return 2;
      return 0; // grass default
    })
  );

  // ─── Horizontal roads ───
  const hRoads = [10, 20]; // y-rows that are paths
  hRoads.forEach(y => {
    for (let x = 1; x < MAP_W - 1; x++) grid[y][x] = 1;
  });

  // ─── Vertical roads ───
  const vRoads = [6, 15, 24]; // x-cols that are paths
  vRoads.forEach(x => {
    for (let y = 1; y < MAP_H - 1; y++) grid[y][x] = 1;
  });

  // ─── Zone building footprints (non-walkable walls inside zone area) ───
  for (const zone of ZONES) {
    for (let dy = 0; dy < zone.h; dy++) {
      for (let dx = 0; dx < zone.w; dx++) {
        const tx = zone.x + dx;
        const ty = zone.y + dy;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) {
          grid[ty][tx] = 2;  // building (non-walkable)
        }
      }
    }
  }

  // ─── Open doorway (make entry tiles walkable path) ───
  for (const [, entry] of Object.entries(ZONE_ENTRIES)) {
    if (entry.y >= 0 && entry.y < MAP_H && entry.x >= 0 && entry.x < MAP_W) {
      grid[entry.y][entry.x] = 1; // entry is a path tile
    }
  }

  return grid;
}

export const CITY_MAP: TileType[][] = buildMap();

// ─── Helpers ────────────────────────────────────────────────────────────────
export function isWalkable(x: number, y: number): boolean {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return false;
  return CITY_MAP[y][x] !== 2;
}

export function getZoneAtTile(x: number, y: number): ZoneDef | null {
  for (const [zoneId, entry] of Object.entries(ZONE_ENTRIES)) {
    if (entry.x === x && entry.y === y) {
      return ZONES.find(z => z.id === zoneId) ?? null;
    }
  }
  return null;
}

// Decorative tree positions (scattered on grass)
export const TREES: Vec2[] = [
  { x: 2,  y: 3  }, { x: 2,  y: 5  }, { x: 10, y: 3  }, { x: 11, y: 5  },
  { x: 18, y: 3  }, { x: 18, y: 5  }, { x: 29, y: 3  }, { x: 29, y: 5  },
  { x: 2,  y: 13 }, { x: 2,  y: 15 }, { x: 10, y: 13 }, { x: 11, y: 15 },
  { x: 18, y: 13 }, { x: 18, y: 15 }, { x: 29, y: 13 }, { x: 29, y: 15 },
  { x: 9,  y: 7  }, { x: 9,  y: 8  }, { x: 20, y: 7  }, { x: 21, y: 8  },
  { x: 2,  y: 21 }, { x: 29, y: 21 }, { x: 10, y: 21 }, { x: 20, y: 21 },
];

export const PLAYER_START: Vec2 = { x: 15, y: 10 };
