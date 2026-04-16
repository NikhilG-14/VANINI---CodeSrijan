import type { EmotionKey, GameAssignment, SessionConfig, GameTheme, GameResult } from './types';

// ─── Game Pool ───────────────────────────────────────────────────────────────
const GAME_OPTIONS: Record<EmotionKey, [GameAssignment, GameAssignment]> = {
  anxiety: [
    {
      emotion: 'anxiety', gameId: 'storm-reaction', gameName: 'Storm Reaction', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-blue-950 to-slate-900', accent: '#60a5fa', label: 'Anxiety & Stress', emoji: '⚡', description: 'Catch lightning bolts before they hit the ground' },
    },
    {
      emotion: 'anxiety', gameId: 'risk-choice', gameName: 'Risk Choice', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-amber-950 to-slate-900', accent: '#f59e0b', label: 'Anxiety & Stress', emoji: '🎲', description: 'Choose between safe paths and unknown outcomes' },
    },
  ],
  depression: [
    {
      emotion: 'depression', gameId: 'interest-explorer', gameName: 'Interest Explorer', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-gray-900 to-slate-950', accent: '#818cf8', label: 'Depression & Sadness', emoji: '🌫️', description: 'Explore activities that spark your interest' },
    },
    {
      emotion: 'depression', gameId: 'persistence-test', gameName: 'Persistence Test', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-gray-900 to-slate-950', accent: '#818cf8', label: 'Depression & Sadness', emoji: '🌑', description: 'Keep going for as long as you feel like it' },
    },
  ],
  overthinking: [
    {
      emotion: 'overthinking', gameId: 'loop-decision', gameName: 'Loop Decision', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-purple-950 to-slate-900', accent: '#a855f7', label: 'Overthinking', emoji: '🌀', description: 'Answer life questions — change your mind as many times as you want' },
    },
    {
      emotion: 'overthinking', gameId: 'perfect-choice', gameName: 'Perfect Choice', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-purple-950 to-slate-900', accent: '#a855f7', label: 'Overthinking', emoji: '🧩', description: 'Pick the option that feels most right to you' },
    },
  ],
  paralysis: [
    {
      emotion: 'paralysis', gameId: 'timed-decisions', gameName: 'Timed Decisions', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-orange-950 to-slate-900', accent: '#fb923c', label: 'Decision Paralysis', emoji: '⚖️', description: 'Make quick yes or no calls before time runs out' },
    },
    {
      emotion: 'paralysis', gameId: 'too-many-options', gameName: 'Too Many Options', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-orange-950 to-slate-900', accent: '#fb923c', label: 'Decision Paralysis', emoji: '🔀', description: 'Choose from many options — trust your instincts' },
    },
  ],
  fatigue: [
    {
      emotion: 'fatigue', gameId: 'focus-drop', gameName: 'Focus Drop', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-cyan-950 to-slate-900', accent: '#06b6d4', label: 'Mental Fatigue', emoji: '🔋', description: 'Stay focused and tap the right target as it appears' },
    },
    {
      emotion: 'fatigue', gameId: 'multitask-challenge', gameName: 'Multitask Challenge', durationMs: 90_000,
      theme: { bg: 'from-slate-900 via-cyan-950 to-slate-900', accent: '#06b6d4', label: 'Mental Fatigue', emoji: '🔀', description: 'Handle two tasks at once — do your best!' },
    },
  ],
};

// ─── Session Builder ─────────────────────────────────────────────────────────
export function buildZoneGame(emotion: EmotionKey): GameAssignment {
  const opts = GAME_OPTIONS[emotion];
  return opts[Math.floor(Math.random() * 2)];
}

export function buildSession(): SessionConfig {
  const emotions: EmotionKey[] = ['anxiety', 'depression', 'overthinking', 'paralysis', 'fatigue'];
  const games = emotions.map(e => buildZoneGame(e));
  return {
    games,
    totalDurationMs: 10 * 60_000,
    startedAt: Date.now(),
  };
}

// ─── Storage ─────────────────────────────────────────────────────────────────
export function saveResults(results: GameResult[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('vani_results', JSON.stringify({ results, timestamp: Date.now() }));
}

export function loadResults(): { results: GameResult[]; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('vani_results');
  return raw ? JSON.parse(raw) : null;
}

export function clearResults(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('vani_results');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function computePanicClicks(timestamps: number[]): number {
  let count = 0;
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] - timestamps[i - 1] < 150) count++;
  }
  return count;
}

export function computePerformanceDrop(
  correctByPhase: [number, number, number],
  totalByPhase: [number, number, number]
): number {
  const firstAcc = totalByPhase[0] > 0 ? correctByPhase[0] / totalByPhase[0] : 1;
  const lastAcc = totalByPhase[2] > 0 ? correctByPhase[2] / totalByPhase[2] : 1;
  return Math.max(0, firstAcc - lastAcc);
}

export type { GameTheme };
