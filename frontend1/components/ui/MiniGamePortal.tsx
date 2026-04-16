'use client';
import dynamic from 'next/dynamic';
import { useGameStore } from '@/store/gameStore';
import type { GameResult } from '@/lib/types';

// Lazy-load all games
const GAME_MAP: Record<string, React.ComponentType<{ durationMs: number; onComplete: (r: GameResult) => void }>> = {
  'storm-reaction':      dynamic(() => import('@/components/games/StormReactionGame')),
  'risk-choice':         dynamic(() => import('@/components/games/RiskChoiceGame')),
  'interest-explorer':   dynamic(() => import('@/components/games/InterestExplorerGame')),
  'persistence-test':    dynamic(() => import('@/components/games/PersistenceTestGame')),
  'loop-decision':       dynamic(() => import('@/components/games/LoopDecisionGame')),
  'perfect-choice':      dynamic(() => import('@/components/games/PerfectChoiceGame')),
  'timed-decisions':     dynamic(() => import('@/components/games/TimedDecisionsGame')),
  'too-many-options':    dynamic(() => import('@/components/games/TooManyOptionsGame')),
  'focus-drop':          dynamic(() => import('@/components/games/FocusDropGame')),
  'multitask-challenge': dynamic(() => import('@/components/games/MultitaskChallengeGame')),
};

export function MiniGamePortal() {
  const activeGame = useGameStore(s => s.activeGame);
  const exitGame   = useGameStore(s => s.exitGame);

  if (!activeGame) return null;

  const GameComponent = GAME_MAP[activeGame.gameId];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#060a14' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-white/8 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="text-xl">{activeGame.theme.emoji}</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">{activeGame.gameName}</p>
            <p className="text-white/40 text-xs mt-0.5">{activeGame.theme.label}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-white/30 text-xs hidden sm:block">{activeGame.theme.description}</p>
          <button
            onClick={() => exitGame(null)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-all"
          >
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 overflow-hidden">
        {GameComponent ? (
          <GameComponent
            durationMs={activeGame.durationMs}
            onComplete={(result) => exitGame(result)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/30">
            Loading game...
          </div>
        )}
      </div>
    </div>
  );
}
