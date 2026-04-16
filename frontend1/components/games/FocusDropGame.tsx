'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }
interface Target { x: number; y: number; id: number; bornAt: number; }

let nextId = 0;

export default function FocusDropGame({ durationMs, onComplete }: Props) {
  const [target, setTarget]       = useState<Target | null>(null);
  const [targetSize, setTargetSize] = useState(52);
  const [hits, setHits]           = useState(0);
  const [misses, setMisses]       = useState(0);

  const startRef    = useRef(Date.now());
  const rtRef       = useRef<number[]>([]);
  const earlyHits   = useRef(0); const earlyMiss = useRef(0);
  const lateHits    = useRef(0); const lateMiss  = useRef(0);
  const hesRef      = useRef(0); const firstRef  = useRef(false);
  const doneRef     = useRef(false);
  const spawnRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (spawnRef.current) clearTimeout(spawnRef.current);
    const now = Date.now();
    const earlyAcc = earlyHits.current / Math.max(1, earlyHits.current + earlyMiss.current);
    const lateAcc  = lateHits.current  / Math.max(1, lateHits.current  + lateMiss.current);
    onComplete({
      emotion: 'fatigue', gameId: 'focus-drop',
      durationMs: now - startRef.current,
      reactionTimeMs: rtRef.current,
      errorCount: misses, totalActions: hits + misses,
      hesitationMs: hesRef.current, engagementScore: 100,
      decisionChanges: 0, quitEarly: false,
      performanceDrop: Math.max(0, Math.round((earlyAcc - lateAcc) * 100) / 100),
      clickTimestamps: [], panicClickCount: 0,
    });
  }, [hits, misses, onComplete]);

  const spawnNext = useCallback(() => {
    if (doneRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(1, elapsed / durationMs);
    const delay = 1400 - pct * 800;
    setTargetSize(Math.max(22, 52 - Math.round(pct * 30)));
    spawnRef.current = setTimeout(() => {
      if (doneRef.current) return;
      const t: Target = { id: nextId++, x: 10 + Math.random() * 80, y: 10 + Math.random() * 75, bornAt: Date.now() };
      setTarget(t);
      spawnRef.current = setTimeout(() => {
        if (doneRef.current) return;
        setTarget(prev => {
          if (prev?.id === t.id) {
            const p2 = (Date.now() - startRef.current) / durationMs;
            if (p2 < 0.5) earlyMiss.current++; else lateMiss.current++;
            setMisses(m => m + 1);
            spawnNext();
            return null;
          }
          return prev;
        });
      }, delay + 300);
    }, delay);
  }, [durationMs]);

  useEffect(() => {
    spawnNext();
    return () => { if (spawnRef.current) clearTimeout(spawnRef.current); };
  }, []); // eslint-disable-line

  const clickTarget = useCallback((t: Target) => {
    if (doneRef.current) return;
    if (spawnRef.current) clearTimeout(spawnRef.current);
    setTarget(null);
    const now = Date.now();
    rtRef.current.push(now - t.bornAt);
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    const pct = (now - startRef.current) / durationMs;
    if (pct < 0.5) earlyHits.current++; else lateHits.current++;
    setHits(h => h + 1);
    spawnNext();
  }, [spawnNext, durationMs]);

  const phaseColor = (Date.now() - startRef.current) / durationMs < 0.5 ? '#22d3ee' : '#f472b6';

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#060f1e]">
      <div className="flex justify-between items-center px-5 pt-4 z-10">
        <div className="flex gap-4 text-sm font-bold">
          <span className="text-cyan-400">✅ {hits}</span>
          <span className="text-red-400">❌ {misses}</span>
          <span className="text-white/20 text-xs font-normal">size: {targetSize}px</span>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#06b6d4" label="Focus" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <p className="text-white/[0.025] text-8xl font-black select-none tracking-widest">FOCUS</p>
      </div>
      <div className="relative flex-1 w-full z-10">
        {target && (
          <button key={target.id} onClick={() => clickTarget(target)}
            className="absolute rounded-full active:scale-90 transition-transform duration-75 focus:outline-none"
            style={{
              width: targetSize, height: targetSize,
              left: `${target.x}%`, top: `${target.y}%`,
              transform: 'translate(-50%,-50%)',
              background: `radial-gradient(circle at 35% 35%, ${phaseColor}, ${phaseColor}55)`,
              boxShadow: `0 0 ${targetSize * 0.7}px ${targetSize * 0.25}px ${phaseColor}55`,
            }}
          />
        )}
      </div>
      <p className="text-center text-white/15 text-[10px] pb-3 z-10">Tap the dot — it gets smaller &amp; faster!</p>
    </div>
  );
}
