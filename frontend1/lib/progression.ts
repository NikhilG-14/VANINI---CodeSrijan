import type { EmotionKey, ZoneDef, Vec2 } from './types';

export interface LevelNode {
  id: string;
  index: number;
  x: number; // 0-100 percentage of map width
  y: number; // 0-100 percentage of map height
  emotion: EmotionKey;
  label: string;
  buildingEmoji: string;
  description: string;
  color: string;
  gameId: string;
}

// The winding path coordinates (waypoints) following the "H" structure in the new map image
export const PATH_WAYPOINTS: Vec2[] = [
  { x: 49.5, y: 95 },  // Bottom Start
  { x: 49.5, y: 75.5 },// Lower Junction
  { x: 21, y: 75.5 },  // Level 1: Broken House
  { x: 78, y: 75.5 },  // Level 2: Normal House
  { x: 49.5, y: 75.5 },// Back to Junction
  { x: 49.5, y: 35 },  // Upper Junction
  { x: 21, y: 35 },    // Level 3: Red House
  { x: 78, y: 35 },    // Level 4: Yarn House
  { x: 49.5, y: 35 },  // Back to Upper Junction
  { x: 49.5, y: 22 },  // Level 5: Castle Entrance
];

export const LEVEL_NODES: LevelNode[] = [
  {
    id: 'broken-house',
    index: 0,
    x: 21, y: 75.5,
    cognitive: 'attention',
    label: 'Focus Point',
    buildingEmoji: '🏠',
    color: '#3b82f6', // blue
    gameId: 'stroop',
  },
  {
    id: 'normal-house',
    index: 1,
    x: 78, y: 75.5,
    cognitive: 'memory',
    label: 'Memory Keep',
    buildingEmoji: '🏘️',
    description: 'Measuring working memory update capacity.',
    color: '#8b5cf6', // violet
    gameId: 'n-back',
  },
  {
    id: 'red-house',
    index: 2,
    x: 21, y: 35,
    cognitive: 'impulsivity',
    label: 'Reflex Station',
    buildingEmoji: '📕',
    description: 'Testing inhibitory control and rapid decision making.',
    color: '#ef4444', // red
    gameId: 'go-no-go',
  },
  {
    id: 'yarn-house',
    index: 3,
    x: 78, y: 35,
    cognitive: 'flexibility',
    label: 'Adaptation Lab',
    buildingEmoji: '🧶',
    description: 'A test of rule-flexibility and shifting cognitive sets.',
    color: '#10b981', // green
    gameId: 'wcst',
  },
  {
    id: 'castle',
    index: 4,
    x: 49.5, y: 22,
    cognitive: 'risk_behavior',
    label: 'The Casino',
    buildingEmoji: '🏰',
    description: 'Evaluating risk tolerance versus safety maximization.',
    color: '#f59e0b', // amber
    gameId: 'bart',
  },
];


// Nature elements to scatter
export interface SceneryItem {
  id: string;
  type: 'tree' | 'rock' | 'water' | 'bridge';
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
}

export const SCENERY: SceneryItem[] = [
  { id: 't1', type: 'tree', x: 5, y: 85 },
  { id: 't2', type: 'tree', x: 20, y: 90 },
  { id: 't3', type: 'tree', x: 40, y: 20 },
  { id: 'r1', type: 'rock', x: 60, y: 15 },
  { id: 'w1', type: 'water', x: 50, y: 30 }, // Small pond
  { id: 'b1', type: 'bridge', x: 52, y: 35 },
];
