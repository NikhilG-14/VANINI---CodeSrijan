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
