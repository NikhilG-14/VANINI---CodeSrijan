'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { computePanicClicks } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

interface Bolt {
  id: number; x: number; y: number;
  speed: number; createdAt: number; caught: boolean; missed: boolean;
}

let boltId = 0;

export default function StormReactionGame({ durationMs, onComplete }: Props) {
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState(false);

  const startRef = useRef(Date.now());
  const clickTimestamps = useRef<number[]>([]);
  const reactionTimes = useRef<number[]>([]);
  const hesitationRef = useRef<number>(0);
  const firstClickRef = useRef(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    setBolts((b) => {
      const totalMissed = b.filter((bolt) => bolt.missed).length;
      const totalCaught = b.filter((bolt) => bolt.caught).length;
      const total = totalCaught + totalMissed;
      const result: GameResult = {
        emotion: 'anxiety',
        gameId: 'storm-reaction',
        durationMs: now - startRef.current,
        reactionTimeMs: reactionTimes.current,
        errorCount: totalMissed,
        totalActions: total,
        hesitationMs: hesitationRef.current,
        engagementScore: total > 0 ? Math.round((totalCaught / total) * 100) : 0,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: clickTimestamps.current,
        panicClickCount: computePanicClicks(clickTimestamps.current),
      };
      onComplete(result);
      return b;
    });
  }, [onComplete]);

  // Spawn bolts
  useEffect(() => {
    let elapsed = 0;
    const spawnInterval = () => {
      elapsed = Date.now() - startRef.current;
      // Faster spawn: drops from 1800ms to 400ms over the course of the duration
      return Math.max(400, 1800 - (elapsed / durationMs) * 1400);
    };

    const spawn = () => {
      if (doneRef.current) return;
      elapsed = Date.now() - startRef.current;
      // Faster speed: increase from 0.8 to 4.5
      const speed = 0.8 + (elapsed / durationMs) * 3.7;
      setBolts((prev) => [
        ...prev.filter((b) => !b.missed && !b.caught),
        { id: boltId++, x: 5 + Math.random() * 90, y: 0, speed, createdAt: Date.now(), caught: false, missed: false },
      ]);
      if (!doneRef.current) timeoutRef.current = setTimeout(spawn, spawnInterval());
    };
    const timeoutRef = { current: setTimeout(spawn, 800) };
    return () => clearTimeout(timeoutRef.current);
  }, [durationMs]);

  // Animate bolts falling
  useEffect(() => {
    const frame = setInterval(() => {
      if (doneRef.current) return;
      setBolts((prev) =>
        prev.map((b) => {
          if (b.caught || b.missed) return b;
          const elapsed = (Date.now() - b.createdAt) / 1000;
          const newY = b.y + b.speed * elapsed * 3;
          if (newY >= 92) {
            setMisses((m) => m + 1);
            setFlash(true);
            setTimeout(() => setFlash(false), 300);
            return { ...b, y: newY, missed: true };
          }
          return { ...b, y: newY };
        })
      );
    }, 50);
    return () => clearInterval(frame);
  }, []);

  const catchBolt = useCallback((bolt: Bolt) => {
    if (bolt.caught || bolt.missed || doneRef.current) return;
    const now = Date.now();
    clickTimestamps.current.push(now);
    const rt = now - bolt.createdAt;
    reactionTimes.current.push(rt);
    if (!firstClickRef.current) {
      hesitationRef.current = now - startRef.current;
      firstClickRef.current = true;
    }
    setBolts((prev) => prev.map((b) => (b.id === bolt.id ? { ...b, caught: true } : b)));
    setScore((s) => s + 1);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center overflow-hidden select-none"
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)' }}>
      {/* Lightning atmosphere */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, #60a5fa22 0%, transparent 70%)' }} />

      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between w-full px-6 pt-4">
        <div className="flex gap-4 text-sm">
          <span className="text-blue-400 font-bold">⚡ {score} caught</span>
          <span className="text-red-400 font-bold">💨 {misses} missed</span>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#60a5fa" label="Storm" />
      </div>

      {/* Game field */}
      <div className={`relative flex-1 w-full ${flash ? 'bg-red-900/20' : ''} transition-colors duration-200`}>
        {bolts.map((bolt) =>
          !bolt.missed ? (
            <button
              key={bolt.id}
              onClick={() => catchBolt(bolt)}
              className={`absolute w-10 h-10 text-2xl transition-all duration-75 ${bolt.caught ? 'scale-150 opacity-0' : 'hover:scale-110'
                } cursor-pointer`}
              style={{ left: `${bolt.x}%`, top: `${bolt.y}%`, transform: 'translate(-50%,-50%)' }}
              aria-label="catch lightning"
            >
              ⚡
            </button>
          ) : null
        )}
      </div>

      {/* Ground flash line */}
      <div className="w-full h-0.5 bg-blue-500/30" />
      <p className="text-white/40 text-xs py-2">Catch the lightning bolts before they hit the ground!</p>
    </div>
  );
}
