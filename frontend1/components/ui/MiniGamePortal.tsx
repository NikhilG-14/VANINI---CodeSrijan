'use client';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import type { GameResult } from '@/lib/types';

// Dynamic import of the 5 new clinical minigame components
const GAME_MAP: Record<string, React.ComponentType<any>> = {
  'stroop':      dynamic(() => import('@/components/games/StroopGame')),
  'n-back':      dynamic(() => import('@/components/games/NBackGame')),
  'go-no-go':    dynamic(() => import('@/components/games/GoNoGoGame')),
  'wcst':        dynamic(() => import('@/components/games/WCSTGame')),
  'bart':        dynamic(() => import('@/components/games/BARTGame')),
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
            assignment={activeGame}
            onComplete={(result: GameResult) => exitGame(result)}
            onExit={() => exitGame(null)}
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
