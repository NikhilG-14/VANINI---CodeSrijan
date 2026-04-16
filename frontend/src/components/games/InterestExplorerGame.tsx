'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

const ACTIVITIES = [
  { id: 0, emoji: '🎵', label: 'Music' },
  { id: 1, emoji: '🎨', label: 'Art' },
  { id: 2, emoji: '🏃', label: 'Exercise' },
  { id: 3, emoji: '🍳', label: 'Cooking' },
  { id: 4, emoji: '🎮', label: 'Gaming' },
  { id: 5, emoji: '📚', label: 'Reading' },
  { id: 6, emoji: '🤝', label: 'Social' },
  { id: 7, emoji: '🌿', label: 'Nature' },
  { id: 8, emoji: '✈️', label: 'Travel' },
  { id: 9, emoji: '🐾', label: 'Pets' },
  { id: 10, emoji: '🎬', label: 'Movies' },
  { id: 11, emoji: '🧘', label: 'Mindfulness' },
  { id: 12, emoji: '🖊️', label: 'Writing' },
  { id: 13, emoji: '🏊', label: 'Swimming' },
  { id: 14, emoji: '🎭', label: 'Theatre' },
  { id: 15, emoji: '🔭', label: 'Stargazing' },
];

export default function InterestExplorerGame({ durationMs, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [noneSelected, setNoneSelected] = useState(false);
  const startRef = useRef(Date.now());
  const clickTs = useRef<number[]>([]);
  const firstRef = useRef(false);
  const hesRef = useRef(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const count = noneSelected ? 0 : selected.size;
    const eng = noneSelected ? 5 : Math.round((count / ACTIVITIES.length) * 100);
    const result: GameResult = {
      emotion: 'depression',
      gameId: 'interest-explorer',
      durationMs: now - startRef.current,
      reactionTimeMs: clickTs.current.length > 1
        ? clickTs.current.slice(1).map((t, i) => t - clickTs.current[i])
        : [now - startRef.current],
      errorCount: 0,
      totalActions: clickTs.current.length,
      hesitationMs: hesRef.current,
      engagementScore: eng,
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: clickTs.current,
      panicClickCount: 0,
      rawData: { selectedCount: count, noneSelected },
    };
    onComplete(result);
  }, [selected, noneSelected, onComplete]);

  const toggle = useCallback((id: number) => {
    if (doneRef.current) return;
    const now = Date.now();
    clickTs.current.push(now);
    if (!firstRef.current) {
      hesRef.current = now - startRef.current;
      firstRef.current = true;
    }
    setNoneSelected(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectNone = useCallback(() => {
    if (doneRef.current) return;
    setSelected(new Set());
    setNoneSelected(true);
    clickTs.current.push(Date.now());
  }, []);

  const [desaturation, setDesaturation] = useState(0);

  // Difficulty ramp: Increase desaturation over time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setDesaturation(pct);
    }, 1000);
    return () => clearInterval(interval);
  }, [durationMs]);

  return (
    <div className="relative w-full h-full flex flex-col gap-3 p-4 overflow-y-auto transition-all"
      style={{ 
        background: 'linear-gradient(180deg, #0a0a1a 0%, #111827 100%)',
        filter: `grayscale(${desaturation}%)`
      }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-base">What sparks your interest?</h3>
          <p className="text-white/40 text-xs">Select everything that appeals to you right now</p>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#818cf8" label="Explore" />
      </div>

      <div className="grid grid-cols-4 gap-2 flex-1">
        {ACTIVITIES.map((a, idx) => {
          const active = selected.has(a.id);
          // Calculate floating intensity
          const floatDelay = idx * 0.1;
          const floatIntensity = 2 + (desaturation / 20); // Increases from 2px to 7px
          
          return (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 border text-center transition-all active:scale-95 ${active
                ? 'border-indigo-500 bg-indigo-900/40 text-white'
                : 'border-white/10 bg-white/[0.03] text-white/50 hover:border-indigo-500/40 hover:text-white/80'
                }`}
              style={{
                animation: `float ${3 - (desaturation/50)}s ease-in-out infinite alternate`,
                animationDelay: `${floatDelay}s`,
                '--float-y': `-${floatIntensity}px`
              } as any}
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-[10px] font-medium">{a.label}</span>
              {active && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes float {
          from { transform: translateY(0); }
          to { transform: translateY(var(--float-y, -4px)); }
        }
      `}</style>

      <div className="flex gap-2">
        <button
          onClick={selectNone}
          className={`flex-1 py-3 rounded-xl text-xs border transition-all ${noneSelected ? 'border-red-500 text-red-400 bg-red-900/20' : 'border-white/10 text-white/40 hover:border-red-500/40'}`}
        >
          😶 None of these appeal to me
        </button>
      </div>
    </div>
  );
}
