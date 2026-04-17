// ─────────── Core Primitives ───────────
export type Direction = 'up' | 'down' | 'left' | 'right';
export type CognitiveKey = 'attention' | 'memory' | 'impulsivity' | 'flexibility' | 'risk_behavior';

export interface Vec2 { x: number; y: number; }

// ─────────── World / Map ───────────
export interface MapTile {
  type: 'grass' | 'path' | 'water' | 'wall' | 'building';
  walkable: boolean;
}

export interface ZoneDef {
  id: string;
  x: number; y: number;         // tile coords
  w: number; h: number;         // size in tiles
  cognitive: CognitiveKey;
  label: string;
  emoji: string;
  color: string;
  description: string;
  gameId: string;               // Exact minigame mapped to this node
  completed: boolean;
}

export interface NPCDef {
  id: string;
  x: number; y: number;
  emoji: string;
  dialog: string[];
}

// ─────────── Game Session ───────────
export interface GameTheme {
  bg: string;
  accent: string;
  label: string;
  emoji: string;
  description: string;
}

export interface GameAssignment {
  cognitive: CognitiveKey;
  gameId: string;
  gameName: string;
  durationMs: number;
  theme: GameTheme;
}

export interface SessionConfig {
  games: GameAssignment[];
  totalDurationMs: number;
  startedAt: number;
}

// ─────────── Telemetry / Results ───────────
export interface GameResult {
  cognitive: CognitiveKey;
  gameId: string;
  durationMs: number;
  reactionTimeMs: number[];
  errorCount: number;
  totalActions: number;
  hesitationMs: number;
  engagementScore: number;      // 0–100
  decisionChanges: number;
  quitEarly: boolean;
  performanceDrop: number;      // 0–1
  clickTimestamps: number[];
  panicClickCount: number;
  rawData?: Record<string, unknown>;
}

// ─────────── Cognitive Scoring ───────────
export interface CognitiveScores {
  attention: number;
  memory: number;
  impulsivity: number;
  flexibility: number;
  risk_behavior: number;
}

export interface CognitiveInsight {
  cognitive: CognitiveKey;
  score: number;
  label: string;
  gameName?: string;
  color: string;
  emoji: string;
  insight: string;
  suggestion: string;
}

// ─────────── World State ───────────
export interface PlayerState {
  pos: Vec2;
  direction: Direction;
  moving: boolean;
}
