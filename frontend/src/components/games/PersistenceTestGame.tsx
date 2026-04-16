'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

export default function PersistenceTestGame({ durationMs, onComplete }: Props) {
  const [orbPos, setOrbPos] = useState({ x: 50, y: 50 });
  const [orbSize, setOrbSize] = useState(64); // px
  const [taps, setTaps] = useState(0);
  const [active, setActive] = useState(true);
  const [quitting, setQuitting] = useState(false);
  const [orbVisible, setOrbVisible] = useState(true);
  const [glowing, setGlowing] = useState(false);
  const [moveInterval, setMoveInterval] = useState(2500);
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);

  const startRef = useRef(Date.now());
  const tapTs = useRef<number[]>([]);
  const doneRef = useRef(false);
  const lastTapRef = useRef(Date.now());

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const finalDuration = now - startRef.current;
    const persistenceDuration = stoppedAt ? stoppedAt - startRef.current : finalDuration;
    
    const intervals = tapTs.current.slice(1).map((t, i) => t - tapTs.current[i]);
    const result: GameResult = {
      emotion: 'depression',
      gameId: 'persistence-test',
      durationMs: finalDuration,
      reactionTimeMs: intervals,
      errorCount: 0,
      totalActions: taps,
      hesitationMs: tapTs.current.length > 0 ? tapTs.current[0] - startRef.current : finalDuration,
      engagementScore: Math.round(Math.min(100, (taps / 30) * 100)),
      decisionChanges: 0,
      quitEarly: !!stoppedAt,
      performanceDrop: 0,
      clickTimestamps: tapTs.current,
      panicClickCount: 0,
      rawData: { taps, persistenceMs: persistenceDuration },
    };
    onComplete(result);
  }, [taps, stoppedAt, onComplete]);

  // Difficulty ramp: every 5s, increase speed and shrink orb
  useEffect(() => {
    if (!active || doneRef.current) return;
    const rampInterval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = elapsed / durationMs; // 0 to 1
      // Orb moves 30% faster and shrinks from 64px to 28px
      setMoveInterval(Math.max(800, 2500 - pct * 1700));
      setOrbSize(Math.max(28, 64 - pct * 36));
    }, 5000);
    return () => clearInterval(rampInterval);
  }, [active, durationMs]);

  // Move orb periodically based on current interval
  useEffect(() => {
    if (!active || doneRef.current) return;
    const move = () => {
      if (doneRef.current || !active) return;
      setOrbPos({ x: 10 + Math.random() * 80, y: 15 + Math.random() * 70 });
      setOrbVisible(true);
      setGlowing(false);
      setTimeout(() => setGlowing(true), 300);
    };
    const interval = setInterval(move, moveInterval);
    return () => clearInterval(interval);
  }, [active, moveInterval]);

  const tapOrb = useCallback(() => {
    if (!active || doneRef.current) return;
    const now = Date.now();
    tapTs.current.push(now);
    lastTapRef.current = now;
    setTaps((t) => t + 1);
    setOrbVisible(false);
    setGlowing(false);
    setTimeout(() => {
      if (!doneRef.current) {
        setOrbPos({ x: 10 + Math.random() * 80, y: 15 + Math.random() * 70 });
        setOrbVisible(true);
        setTimeout(() => setGlowing(true), 300);
      }
    }, 400);
  }, [active]);

  const handleQuit = useCallback(() => {
    if (doneRef.current || stoppedAt) return;
    setActive(false);
    setStoppedAt(Date.now());
  }, [stoppedAt]);

  return (
    <div className="relative w-full h-full flex flex-col"
      style={{ background: 'linear-gradient(180deg, #0a0a1a, #1f1635)' }}>
      <div className="flex items-center justify-between px-4 pt-3 z-10">
        <div>
          <span className="text-indigo-300 text-sm font-bold">✨ {taps} taps</span>
          <p className="text-white/30 text-xs">{stoppedAt ? 'Perfectly okay to rest.' : 'Keep going as long as you like'}</p>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#818cf8" label="Persist" />
      </div>

      {stoppedAt && (
        <div className="absolute inset-0 flex items-center justify-center z-10 animate-in fade-in duration-1000">
          <p className="text-white/40 text-xl font-medium italic tracking-wide">Reflecting in stillness...</p>
        </div>
      )}

      {/* Orb field */}
      <div className="relative flex-1 w-full">
        {orbVisible && (
          <button
            onClick={tapOrb}
            className="absolute rounded-full flex items-center justify-center text-2xl transition-all active:scale-90 focus:outline-none"
            style={{
              width: `${orbSize}px`,
              height: `${orbSize}px`,
              left: `${orbPos.x}%`,
              top: `${orbPos.y}%`,
              transform: 'translate(-50%, -50%)',
              background: glowing
                ? 'radial-gradient(circle at 40% 35%, #a855f7, #4c1d95)'
                : 'radial-gradient(circle at 40% 35%, #6d28d9, #1e1b4b)',
              boxShadow: glowing ? '0 0 24px 8px rgba(168,85,247,0.5)' : '0 0 8px 2px rgba(109,40,217,0.3)',
              transition: 'box-shadow 0.3s, background 0.3s, width 0.5s, height 0.5s',
            }}
            aria-label="tap the orb"
          >
            ✨
          </button>
        )}
      </div>

      {/* Quit button */}
      <div className="flex justify-center pb-4 z-10">
        {!stoppedAt && (!quitting ? (
          <button
            onClick={() => setQuitting(true)}
            className="px-4 py-2 text-xs text-white/30 border border-white/10 rounded-xl hover:text-white/60 hover:border-white/20 transition-all"
          >
            I want to stop
          </button>
        ) : (
          <div className="flex gap-2 items-center">
            <span className="text-white/50 text-xs">Are you sure?</span>
            <button onClick={handleQuit} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900/20 transition-all">
              Yes, stop
            </button>
            <button onClick={() => setQuitting(false)} className="px-3 py-1.5 text-xs text-white/50 border border-white/10 rounded-lg hover:text-white/70 transition-all">
              Keep going
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
