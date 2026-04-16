'use client';
import { create } from 'zustand';
import type { Direction, EmotionKey, GameResult, ZoneDef, Vec2, EmotionScores } from '@/lib/types';
import { PLAYER_START, getZoneAtTile, isWalkable } from '@/lib/cityMap';
import { saveResults } from '@/lib/gameSession';
import type { GameAssignment } from '@/lib/types';
import { buildZoneGame } from '@/lib/gameSession';
import { LEVEL_NODES, type LevelNode } from '@/lib/progression';

type GamePhase = 'world' | 'minigame' | 'complete';

interface GameState {
  // ── World ──────────────────────────────────
  pos: Vec2;
  direction: Direction;
  moving: boolean;
  nearZone: LevelNode | null;
  dialogOpen: boolean;
  activeZoneId: string | null;
  completedZones: Set<string>;
  currentLevelIndex: number;
  playerMapPos: Vec2; // 0-100 percentage for smooth map traversal

  // ── Session ────────────────────────────────
  phase: GamePhase;
  activeGame: GameAssignment | null;
  results: GameResult[];
  emotionScores: EmotionScores | null;

  // ── Actions ────────────────────────────────
  movePlayer: (dir: Direction) => void;
  setMoving: (v: boolean) => void;
  setNearZone: (zone: ZoneDef | null) => void;
  openDialog: () => void;
  closeDialog: () => void;
  enterZone: (zoneId: string) => void;
  exitGame: (result: GameResult | null) => void;
  setScores: (scores: EmotionScores) => void;
  resetWorld: () => void;
  moveToLevel: (index: number) => void;
  updateMapPos: (pos: Vec2) => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  // ── Initial State ─────────────────────────
  pos: PLAYER_START,
  direction: 'down',
  moving: false,
  nearZone: null,
  dialogOpen: false,
  activeZoneId: null,
  completedZones: new Set(),
  currentLevelIndex: 0,
  playerMapPos: { x: 10, y: 80 }, // Start of path
  phase: 'world',
  activeGame: null,
  results: [],
  emotionScores: null,

  // ── Player Movement ───────────────────────
  movePlayer: (dir) => {
    // Manual movement disabled in progression mode, or potentially used for tiny adjustments
  },

  setMoving: (v) => set({ moving: v }),
  setNearZone: (zone) => set({ nearZone: zone }),
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false, nearZone: null }),

  // ── Zone / Game ──────────────────────────
  enterZone: (zoneId) => {
    // In progression mode, zoneId matches the level node id
    const { currentLevelIndex } = get();
    const node = LEVEL_NODES[currentLevelIndex];
    if (!node) return;
    const game = buildZoneGame(node.emotion);
    set({ phase: 'minigame', activeGame: game, activeZoneId: node.id, dialogOpen: false });
  },

  exitGame: (result) => {
    const { results, completedZones, activeZoneId } = get();
    if (!result) {
      // Quit without result
      set({ phase: 'world', activeGame: null, activeZoneId: null });
      return;
    }

    const newResults = [...results, result];
    const newCompleted = new Set(completedZones);
    if (activeZoneId) newCompleted.add(activeZoneId);

    const nextLevel = newCompleted.size; // Simple linear progression index
    const isComplete = newCompleted.size >= 5;
    
    if (isComplete) {
      saveResults(newResults);
    }

    set({
      results: newResults,
      completedZones: newCompleted,
      phase: isComplete ? 'complete' : 'world',
      activeGame: null,
      activeZoneId: null,
      currentLevelIndex: Math.min(nextLevel, 4), // Move forward
      dialogOpen: false, 
    });
  },

  updateMapPos: (pos) => set({ playerMapPos: pos }),

  moveToLevel: (index) => set({ currentLevelIndex: index, dialogOpen: false }),

  setScores: (scores) => set({ emotionScores: scores }),

  resetWorld: () => set({
    pos: PLAYER_START,
    direction: 'down',
    moving: false,
    nearZone: null,
    dialogOpen: false,
    activeZoneId: null,
    completedZones: new Set(),
    currentLevelIndex: 0,
    playerMapPos: { x: 10, y: 80 },
    phase: 'world',
    activeGame: null,
    results: [],
    emotionScores: null,
  }),
}));
