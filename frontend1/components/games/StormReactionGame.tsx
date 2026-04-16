'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameResult } from '@/lib/types';
import { computePanicClicks } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

interface Bolt { 
  id: number; 
  x: number; 
  y: number; 
  speed: number; 
  createdAt: number; 
  caught: boolean; 
  missed: boolean; 
  size: number;
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
  const hesitationRef = useRef(0);
  const firstRef = useRef(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    
    // Calculate final results
    const totalCaught = score;
    const totalMissed = misses;
    const total = totalCaught + totalMissed;
    
    onComplete({
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
    });
  }, [onComplete, score, misses]);

  // Spawning logic
  useEffect(() => {
    let timeoutHandle: ReturnType<typeof setTimeout>;
    const spawn = () => {
      if (doneRef.current) return;
      const elapsed = Date.now() - startRef.current;
      
      // Ramping difficulty
      const progress = Math.min(1, elapsed / durationMs);
      const interval = Math.max(350, 1500 - (progress * 1200));
      const speed = 1.2 + (progress * 4.5);
      const size = 30 + Math.random() * 20;

      setBolts(prev => [
        ...prev.filter(b => !b.missed && !b.caught),
        { 
          id: boltId++, 
          x: 10 + Math.random() * 80, 
          y: -10, 
          speed, 
          createdAt: Date.now(), 
          caught: false, 
          missed: false,
          size
        }
      ]);

      timeoutHandle = setTimeout(spawn, interval);
    };
    
    timeoutHandle = setTimeout(spawn, 500);
    return () => clearTimeout(timeoutHandle);
  }, [durationMs]);

  // Movement/Miss logic
  useEffect(() => {
    const frame = setInterval(() => {
      if (doneRef.current) return;
      
      setBolts(prev => prev.map(b => {
        if (b.caught || b.missed) return b;
        
        const delta = 16.67 / 1000; // ~60fps
        const newY = b.y + b.speed * 60 * delta;
        
        if (newY >= 100) {
          setMisses(m => m + 1);
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          return { ...b, y: newY, missed: true };
        }
        return { ...b, y: newY };
      }));
    }, 16);
    return () => clearInterval(frame);
  }, []);

  const catchBolt = useCallback((bolt: Bolt) => {
    if (bolt.caught || bolt.missed || doneRef.current) return;
    
    const now = Date.now();
    clickTimestamps.current.push(now);
    reactionTimes.current.push(now - bolt.createdAt);
    
    if (!firstRef.current) {
      hesitationRef.current = now - startRef.current;
      firstRef.current = true;
    }
    
    setBolts(prev => prev.map(b => b.id === bolt.id ? { ...b, caught: true } : b));
    setScore(s => s + 1);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center overflow-hidden select-none bg-slate-950">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e3a8a33_0%,transparent_50%)]" />
      <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${flash ? 'opacity-30 bg-red-900' : 'opacity-0'}`} />
      
      {/* HUD Wrapper */}
      <div className="relative z-20 w-full max-w-4xl flex items-center justify-between px-8 py-6 mt-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#60a5fa]" />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Neural Response</span>
          </div>
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-4xl font-black text-white tracking-tighter">{score}</span>
            <span className="text-blue-400/50 text-xs font-bold uppercase">Captured</span>
            <span className="text-red-500/30 text-xs font-bold uppercase ml-2">{misses} Missed</span>
          </div>
        </div>

        <GameTimer durationMs={durationMs} onExpire={finish} accent="#3b82f6" label="Analysis Window" />
      </div>

      {/* Game Field */}
      <div className="relative flex-1 w-full max-w-5xl self-center mx-auto overflow-visible px-10">
        {bolts.map(bolt => !bolt.missed && (
          <button 
            key={bolt.id} 
            onClick={() => catchBolt(bolt)}
            className={`absolute flex items-center justify-center transition-all 
              ${bolt.caught ? 'scale-[2] opacity-0 pointer-events-none rotate-[20deg]' : 'hover:scale-110 active:scale-95'}`}
            style={{ 
              left: `${bolt.x}%`, 
              top: `${bolt.y}%`, 
              width: bolt.size * 1.5,
              height: bolt.size * 1.5,
              transform: 'translate(-50%, -50%)',
              filter: `drop-shadow(0 0 ${bolt.size/3}px #3b82f6)`
            }}
          >
            {/* Retro bolt SVG style or emoji */}
            <div className="relative flex items-center justify-center">
               <span className="text-4xl">⚡</span>
               {/* Inner glow */}
               <div className="absolute inset-0 bg-blue-400 blur-xl opacity-30 animate-pulse" />
            </div>
          </button>
        ))}
      </div>

      {/* Footer Instructions */}
      <div className="relative z-20 w-full bg-white/[0.02] border-t border-white/5 backdrop-blur-md px-8 py-4 flex justify-between items-center overflow-hidden">
        <div className="absolute left-0 bottom-0 w-full h-[2px] bg-white/5 overflow-hidden">
           <div 
             className="h-full bg-blue-500 transition-all duration-300" 
             style={{ width: `${Math.min(100, (score / 30) * 100)}%` }}
           />
        </div>
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
          Requirement: Intercept all incoming electrical surges
        </p>
        <div className="flex gap-2">
           <div className="px-2 py-0.5 rounded border border-white/10 text-[9px] text-white/50 bg-white/5 font-black">STRESS LOAD: {(score + misses) > 0 ? Math.round((misses / (score+misses)) * 100) : 0}%</div>
        </div>
      </div>
    </div>
  );
}
