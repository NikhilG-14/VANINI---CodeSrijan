'use client';
import { GameSessionProvider } from '@/components/games/GameSessionContext';

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return (
    <GameSessionProvider>
      <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
        {children}
      </div>
    </GameSessionProvider>
  );
}
