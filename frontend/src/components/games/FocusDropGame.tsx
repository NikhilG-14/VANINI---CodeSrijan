'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

interface Target { x: number; y: number; id: number; bornAt: number; }

let nextId = 0;

export default function FocusDropGame({ durationMs, onComplete }: Props) {
  const [target, setTarget] = useState<Target | null>(null);
  const [targetSize, setTargetSize] = useState(52); // shrinks 52→22px over game
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  const startRef = useRef(Date.now());
  const reactionTimesRef = useRef<number[]>([]);
  const earlyHitsRef = useRef(0);
  const earlyMissesRef = useRef(0);
  const lateHitsRef = useRef(0);
  const lateMissesRef = useRef(0);
  const hesRef = useRef(0);
  const firstRef = useRef(false);
  const doneRef = useRef(false);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);

    const now = Date.now();
    const earlyAcc = earlyHitsRef.current / Math.max(1, earlyHitsRef.current + earlyMissesRef.current);
    const lateAcc = lateHitsRef.current / Math.max(1, lateHitsRef.current + lateMissesRef.current);
    const drop = Math.max(0, Math.round((earlyAcc - lateAcc) * 100) / 100);

    onComplete({
      emotion: 'fatigue',
      gameId: 'focus-drop',
      durationMs: now - startRef.current,
      reactionTimeMs: reactionTimesRef.current,
      errorCount: misses,
      totalActions: hits + misses,
      hesitationMs: hesRef.current,
      engagementScore: 100,
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: drop,
      clickTimestamps: [],
      panicClickCount: 0,
    });
  }, [hits, misses, onComplete]);

  // Spawn the next target after a delay that shrinks over time
  const spawnNext = useCallback(() => {
    if (doneRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(1, elapsed / durationMs);

    // Delay: 1400ms → 600ms as time progresses
    const delay = 1400 - pct * 800;
    // Size: 52px → 22px
    setTargetSize(Math.max(22, 52 - Math.round(pct * 30)));

    spawnTimerRef.current = setTimeout(() => {
      if (doneRef.current) return;
      const newTarget: Target = {
        id: nextId++,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 75,
        bornAt: Date.now(),
      };
      setTarget(newTarget);

      // If not clicked within (delay + 300ms), it disappears as a miss
      const missTimeout = delay + 300;
      spawnTimerRef.current = setTimeout(() => {
        if (doneRef.current) return;
        setTarget(prev => {
          if (prev?.id === newTarget.id) {
            // Missed this target
            const elapsed2 = Date.now() - startRef.current;
            const pct2 = elapsed2 / durationMs;
            if (pct2 < 0.5) earlyMissesRef.current++;
            else lateMissesRef.current++;
            setMisses(m => m + 1);
            spawnNext();
            return null;
          }
          return prev;
        });
      }, missTimeout);
    }, delay);
  }, [durationMs]);

  // Kick off on mount
  useEffect(() => {
    spawnNext();
    return () => { if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current); };
  }, []); // eslint-disable-line

  const clickTarget = useCallback((t: Target) => {
    if (doneRef.current) return;
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    setTarget(null);

    const now = Date.now();
    const rt = now - t.bornAt;
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    reactionTimesRef.current.push(rt);

    const pct = (now - startRef.current) / durationMs;
    if (pct < 0.5) earlyHitsRef.current++;
    else lateHitsRef.current++;
    setHits(h => h + 1);

    spawnNext();
  }, [spawnNext, durationMs]);

  const elapsed = Date.now() - startRef.current;
  const phaseColor = elapsed / durationMs < 0.5 ? '#22d3ee' : '#f472b6';

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#060f1e]">
      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-4 z-10">
        <div className="flex gap-4 text-sm font-bold">
          <span className="text-cyan-400">✅ {hits}</span>
          <span className="text-red-400">❌ {misses}</span>
          <span className="text-white/20 text-xs font-normal">size: {targetSize}px</span>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#06b6d4" label="Focus" />
      </div>

      {/* Ambient text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <p className="text-white/[0.025] text-8xl font-black select-none tracking-widest">FOCUS</p>
      </div>

      {/* Target field */}
      <div className="relative flex-1 w-full z-10">
        {target && (
          <button
            key={target.id}
            onClick={() => clickTarget(target)}
            className="absolute rounded-full active:scale-90 transition-transform duration-75 animate-in fade-in zoom-in duration-150 focus:outline-none"
            style={{
              width: targetSize,
              height: targetSize,
              left: `${target.x}%`,
              top: `${target.y}%`,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle at 35% 35%, ${phaseColor}, ${phaseColor}55)`,
              boxShadow: `0 0 ${targetSize * 0.7}px ${targetSize * 0.25}px ${phaseColor}55`,
            }}
          />
        )}
      </div>

      <p className="text-center text-white/15 text-[10px] pb-3 z-10">
        Tap the dot — it gets smaller &amp; faster as time goes on!
      </p>
    </div>
  );
}
