'use client';
import { create } from 'zustand';
import type { Direction, GameResult, ZoneDef, Vec2, CognitiveScores } from '@/lib/types';
import { PLAYER_START } from '@/lib/cityMap';
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
  cognitiveScores: CognitiveScores | null;

  // ── Phaser UI Sync ────────────────────────
  gameZoom: number;
  gameWidth: number;
  gameHeight: number;
  gameCanvasElement: HTMLCanvasElement | null;
  
  // ── Dialog ─────────────────────────────────
  dialogMessages: string[];
  dialogCharacterName: string | null;
  dialogAction: (() => void) | null;
  
  // ── Menu ───────────────────────────────────
  menuItems: any[]; // Define items as needed
  
  // ── Floating Text ──────────────────────────
  texts: any[];

  // ── Actions ────────────────────────────────
  movePlayer: (dir: Direction) => void;
  setMoving: (v: boolean) => void;
  setNearZone: (zone: LevelNode | null) => void;
  openDialog: () => void;
  closeDialog: () => void;
  enterZone: (zoneId: string) => void;
  exitGame: (result: GameResult | null) => void;
  setScores: (scores: CognitiveScores) => void;
  resetWorld: () => void;
  moveToLevel: (index: number) => void;
  updateMapPos: (pos: Vec2) => void;
  
  // ── Phaser Actions ─────────────────────────
  setGameZoom: (zoom: number) => void;
  setGameWidth: (width: number) => void;
  setGameHeight: (height: number) => void;
  setGameCanvasElement: (canvas: HTMLCanvasElement) => void;
  setDialogData: (messages: string[], name?: string, action?: () => void) => void;
  setMenuItems: (items: any[]) => void;
  addText: (text: any) => void;
  removeText: (key: string) => void;
  setAnimateLevelComplete: (v: boolean) => void;
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
  playerMapPos: { x: 200, y: 700 }, // Actual pixel start position in the world
  phase: 'world',
  activeGame: null,
  results: [],
  cognitiveScores: null,
  shouldAnimateLevelComplete: true, // Start with true for the first entrance

  // ── Phaser UI Initial state ───────────────
  gameZoom: 1,
  gameWidth: 800,
  gameHeight: 600,
  gameCanvasElement: null,
  dialogMessages: [],
  dialogCharacterName: null,
  dialogAction: null,
  menuItems: [],
  texts: [],

  // ── Player Movement ───────────────────────
  movePlayer: (dir) => {
    // Manual movement disabled in progression mode, or potentially used for tiny adjustments
  },

  setMoving: (v) => set({ moving: v }),
  setNearZone: (zone) => set({ nearZone: zone }),
  openDialog: () => set({ dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false, nearZone: null, dialogMessages: [] }),

  // ── Zone / Game ──────────────────────────
  enterZone: (zoneId) => {
    // In progression mode, zoneId matches the level node id
    const node = LEVEL_NODES.find(n => n.id === zoneId);
    if (!node) return;
    const game = buildZoneGame(node.cognitive);
    set({ phase: 'minigame', activeGame: game, activeZoneId: node.id, dialogOpen: false });
  },

  exitGame: (result) => {
    const { results, completedZones, activeZoneId, activeGame } = get();
    
    let finalResult = result;
    if (!result && activeGame) {
      // Create a "Partial/Quit" result
      finalResult = {
        cognitive: activeGame.cognitive,
        gameId: activeGame.gameId,
        durationMs: 0,
        reactionTimeMs: [],
        errorCount: 0,
        totalActions: 0,
        hesitationMs: 0,
        engagementScore: 0,
        decisionChanges: 0,
        quitEarly: true,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
      };
    }

    if (!finalResult) {
      set({ phase: 'world', activeGame: null, activeZoneId: null });
      return;
    }

    const newResults = [...results, finalResult];
    const newCompleted = new Set(completedZones);
    if (activeZoneId) newCompleted.add(activeZoneId);

    const nextLevel = newCompleted.size;
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
      currentLevelIndex: Math.min(nextLevel, 4),
      dialogOpen: false, 
      shouldAnimateLevelComplete: true,
    });
  },

  updateMapPos: (pos) => set({ playerMapPos: pos }),

  moveToLevel: (index) => set({ currentLevelIndex: index, dialogOpen: false }),

  setScores: (scores) => set({ cognitiveScores: scores }),

  setGameZoom: (zoom) => set({ gameZoom: zoom }),
  setGameWidth: (width) => set({ gameWidth: width }),
  setGameHeight: (height) => set({ gameHeight: height }),
  setGameCanvasElement: (canvas) => set({ gameCanvasElement: canvas }),
  setDialogData: (messages, name, action) => set({ 
    dialogMessages: messages, 
    dialogCharacterName: name || null, 
    dialogAction: action || null,
    dialogOpen: messages.length > 0
  }),
  setMenuItems: (items) => set({ menuItems: items }),
  addText: (text) => set((state) => ({ 
    texts: [...state.texts.filter(t => t.key !== text.key), text] 
  })),
  removeText: (key) => set((state) => ({ texts: state.texts.filter(t => t.key !== key) })),
  setAnimateLevelComplete: (v) => set({ shouldAnimateLevelComplete: v }),

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
    cognitiveScores: null,
    gameZoom: 1,
    dialogMessages: [],
    texts: [],
    shouldAnimateLevelComplete: true,
  }),
}));
