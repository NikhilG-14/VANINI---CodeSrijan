import type { CognitiveKey, GameAssignment, SessionConfig, GameTheme, GameResult } from './types';

// ─── Game Pool ───────────────────────────────────────────────────────────────
const GAME_OPTIONS: Record<CognitiveKey, GameAssignment> = {
  attention: {
    cognitive: 'attention', gameId: 'stroop', gameName: 'Stroop Task', durationMs: 90_000,
    theme: { bg: 'from-slate-900 via-blue-950 to-slate-900', accent: '#3b82f6', label: 'Selective Attention', emoji: '🎯', description: 'Select the color of the text, not the word it reads.' },
  },
  memory: {
    cognitive: 'memory', gameId: 'n-back', gameName: 'N-Back Test', durationMs: 90_000,
    theme: { bg: 'from-slate-900 via-violet-950 to-slate-900', accent: '#8b5cf6', label: 'Working Memory', emoji: '🧠', description: 'Tap when the current letter matches the one 2 steps ago.' },
  },
  impulsivity: {
    cognitive: 'impulsivity', gameId: 'go-no-go', gameName: 'Go / No-Go', durationMs: 90_000,
    theme: { bg: 'from-slate-900 via-red-950 to-slate-900', accent: '#ef4444', label: 'Impulsivity Control', emoji: '⚡', description: 'Tap for Green targets. Withhold tap for Red targets.' },
  },
  flexibility: {
    cognitive: 'flexibility', gameId: 'wcst', gameName: 'Card Sort (WCST)', durationMs: 90_000,
    theme: { bg: 'from-slate-900 via-emerald-950 to-slate-900', accent: '#10b981', label: 'Cognitive Flexibility', emoji: '🧩', description: 'Match cards to columns. The matching rule will change secretly.' },
  },
  risk_behavior: {
    cognitive: 'risk_behavior', gameId: 'bart', gameName: 'Balloon Task', durationMs: 90_000,
    theme: { bg: 'from-slate-900 via-amber-950 to-slate-900', accent: '#f59e0b', label: 'Risk Behavior', emoji: '🎈', description: 'Pump balloons for points. Stop before they pop to save them.' },
  },
};

// ─── Session Builder ─────────────────────────────────────────────────────────
export function buildZoneGame(cognitive: CognitiveKey): GameAssignment {
  return GAME_OPTIONS[cognitive];
}

export function buildSession(): SessionConfig {
  const cognitives: CognitiveKey[] = ['attention', 'memory', 'impulsivity', 'flexibility', 'risk_behavior'];
  const games = cognitives.map(c => buildZoneGame(c));

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
