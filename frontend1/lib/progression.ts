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
  gameIds: string[];
}

// The winding path coordinates (waypoints) for the character to follow
export const PATH_WAYPOINTS: Vec2[] = [
  { x: 10, y: 80 },  // Start
  { x: 15, y: 70 },
  { x: 25, y: 65 },
  { x: 30, y: 75 },  // Level 1 Node
  { x: 40, y: 80 },
  { x: 50, y: 60 },
  { x: 45, y: 40 },  // Level 2 Node
  { x: 55, y: 30 },
  { x: 70, y: 35 },
  { x: 80, y: 20 },  // Level 3 Node
  { x: 85, y: 40 },
  { x: 75, y: 55 },
  { x: 65, y: 65 },  // Level 4 Node
  { x: 75, y: 80 },
  { x: 90, y: 85 },
  { x: 95, y: 70 },  // Level 5 Node
];

export const LEVEL_NODES: LevelNode[] = [
  {
    id: 'storm-lab',
    index: 0,
    x: 30, y: 75,
    emotion: 'anxiety',
    label: 'Storm Lab',
    buildingEmoji: '⚡',
    description: 'Reaction speed under pressure',
    color: '#3b82f6',
    gameIds: ['storm-reaction', 'risk-choice'],
  },
  {
    id: 'grey-house',
    index: 1,
    x: 45, y: 40,
    emotion: 'depression',
    label: 'Grey House',
    buildingEmoji: '🌫️',
    description: 'Engagement and motivation',
    color: '#818cf8',
    gameIds: ['interest-explorer', 'persistence-test'],
  },
  {
    id: 'energy-core',
    index: 2,
    x: 80, y: 20,
    emotion: 'fatigue',
    label: 'Energy Core',
    buildingEmoji: '🔋',
    description: 'Mental stamina over time',
    color: '#06b6d4',
    gameIds: ['focus-drop', 'multitask-challenge'],
  },
  {
    id: 'courthouse',
    index: 3,
    x: 65, y: 65,
    emotion: 'paralysis',
    label: 'Courthouse',
    buildingEmoji: '⚖️',
    description: 'Choice avoidance and delay',
    color: '#fb923c',
    gameIds: ['timed-decisions', 'too-many-options'],
  },
  {
    id: 'mind-library',
    index: 4,
    x: 95, y: 70,
    emotion: 'overthinking',
    label: 'Mind Library',
    buildingEmoji: '🌀',
    description: 'Decision loops and hesitation',
    color: '#a855f7',
    gameIds: ['loop-decision', 'perfect-choice'],
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
