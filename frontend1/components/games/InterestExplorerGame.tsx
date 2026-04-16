'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { INTEREST_ACTIVITIES } from '@/lib/gameContent';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

export default function InterestExplorerGame({ durationMs, onComplete }: Props) {
  const [liked,   setLiked]   = useState<Set<number>>(new Set());
  const [hovered, setHovered] = useState<number | null>(null);

  const startRef = useRef(Date.now());
  const doneRef  = useRef(false);
  const firstRef = useRef(false);
  const hesRef   = useRef(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const likedCount = liked.size;
    onComplete({
      emotion: 'depression', gameId: 'interest-explorer',
      durationMs: now - startRef.current,
      reactionTimeMs: [], errorCount: 0,
      totalActions: likedCount,
      hesitationMs: hesRef.current,
      engagementScore: Math.round((likedCount / INTEREST_ACTIVITIES.length) * 100),
      decisionChanges: 0, quitEarly: likedCount === 0, performanceDrop: 0,
      clickTimestamps: [], panicClickCount: 0,
      rawData: { likedActivities: likedCount },
    });
  }, [liked, onComplete]);

  const toggle = (i: number) => {
    if (doneRef.current) return;
    const now = Date.now();
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    setLiked(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #07090f, #0a0b14)' }}>
      <div className="absolute top-4 right-4 z-10">
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#818cf8" label="Explore" />
      </div>

      <div className="flex-1 flex flex-col items-center gap-5 px-6 py-8 overflow-y-auto">
        <div className="text-center max-w-sm mt-8">
          <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">🌫️ Interest Explorer</p>
          <p className="text-white/70 text-sm leading-relaxed">
            Tap anything that sparks even the tiniest bit of interest right now.
          </p>
          {liked.size > 0 && (
            <p className="text-indigo-400 text-sm mt-2 font-semibold">{liked.size} things caught your eye ✨</p>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 w-full max-w-md">
          {INTEREST_ACTIVITIES.map((act, i) => {
            const isLiked = liked.has(i);
            return (
              <button key={i} onClick={() => toggle(i)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 active:scale-95
                  ${isLiked
                    ? 'bg-indigo-600/30 border border-indigo-400/60 shadow-[0_0_16px_rgba(129,140,248,0.2)]'
                    : hovered === i
                      ? 'bg-white/[0.06] border border-white/20'
                      : 'bg-white/[0.02] border border-white/8 hover:border-white/15'}`}>
                <span className="text-2xl">{act.emoji}</span>
                <span className={`text-[9px] font-semibold text-center leading-tight ${isLiked ? 'text-indigo-300' : 'text-white/50'}`}>
                  {act.label}
                </span>
                {isLiked && <span className="text-indigo-400 text-xs">♥</span>}
              </button>
            );
          })}
        </div>

        <button onClick={finish}
          className="mt-auto px-8 py-3 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-2xl font-bold hover:bg-indigo-600/50 transition-all active:scale-95">
          {liked.size === 0 ? "Nothing caught my eye" : "Done →"}
        </button>
      </div>
    </div>
  );
}
