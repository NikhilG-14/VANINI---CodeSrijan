'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

import { TIMED_DECISIONS } from '@/lib/gameContent';

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const SCENARIOS = shuffle(TIMED_DECISIONS).slice(0, 10);

export default function TimedDecisionsGame({ durationMs, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3000);
  const [results, setResults] = useState<{ choice: string | null; time: number; windowMs: number }[]>([]);
  const [flash, setFlash] = useState<'correct' | 'skip' | null>(null);

  const startRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());
  const hesRef = useRef(0);
  const firstRef = useRef(false);
  const doneRef = useRef(false);

  // Progressive round window: starts at 3000ms, drops to 1000ms by round 10
  const getRoundMs = (r: number) => Math.max(1000, 3000 - r * 200);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const allResults = results;
    const skips = allResults.filter(r => r.choice === null).length;
    const rt = allResults.map(r => r.time);
    const result: GameResult = {
      emotion: 'paralysis',
      gameId: 'timed-decisions',
      durationMs: now - startRef.current,
      reactionTimeMs: rt.length > 0 ? rt : [3000],
      errorCount: skips,
      totalActions: allResults.length,
      hesitationMs: hesRef.current,
      engagementScore: Math.round(((allResults.length - skips) / Math.max(1, allResults.length)) * 100),
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: [],
      panicClickCount: 0,
    };
    onComplete(result);
  }, [results, onComplete]);

  useEffect(() => {
    if (doneRef.current || round >= SCENARIOS.length) return;
    const currentRoundMs = getRoundMs(round);
    setTimeLeft(currentRoundMs);
    roundStartRef.current = Date.now();

    const interval = setInterval(() => {
      const left = Math.max(0, currentRoundMs - (Date.now() - roundStartRef.current));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        setFlash('skip');
        setTimeout(() => setFlash(null), 300);
        setResults(prev => [...prev, { choice: null, time: currentRoundMs, windowMs: currentRoundMs }]);
        if (round + 1 >= SCENARIOS.length) {
          setRound(0); // Loop content
        } else {
          setRound(r => r + 1);
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [round, finish]);

  const choose = useCallback((opt: string) => {
    if (doneRef.current) return;
    const now = Date.now();
    const rt = now - roundStartRef.current;
    const currentRoundMs = getRoundMs(round);
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    setFlash('correct');
    setTimeout(() => setFlash(null), 200);
    setResults(prev => [...prev, { choice: opt, time: rt, windowMs: currentRoundMs }]);
    if (round + 1 >= SCENARIOS.length) {
      setRound(0); // Loop content
    } else {
      setRound(r => r + 1);
    }
  }, [round, finish]);

  const scenario = SCENARIOS[Math.min(round, SCENARIOS.length - 1)];
  const currentRoundMs = getRoundMs(round);
  const pct = timeLeft / currentRoundMs;

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center p-6 gap-8 overflow-hidden transition-colors duration-200 ${flash === 'skip' ? 'bg-red-900/20' : flash === 'correct' ? 'bg-emerald-900/10' : ''}`}
      style={{ background: 'linear-gradient(180deg, #0f172a, #431407)' }}>

      <div className="w-full flex justify-between items-center z-10">
        <div className="flex flex-col">
          <div className="text-orange-400 font-bold">Round {Math.min(round + 1, SCENARIOS.length)}/{SCENARIOS.length}</div>
          <div className="text-white/30 text-xs">{(currentRoundMs / 1000).toFixed(1)}s window</div>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#fb923c" label="Decide" />
      </div>

      {/* Round timer bar - urgent pulse when < 30% */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden z-10">
        <div className={`h-full rounded-full transition-all duration-75 ${pct < 0.3 ? 'animate-pulse' : ''}`}
          style={{
            width: `${pct * 100}%`,
            background: pct > 0.5 ? '#fb923c' : pct > 0.25 ? '#ef4444' : '#7f1d1d',
          }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 z-10 text-center">
        <h2 className="text-white text-2xl font-bold">{scenario.q}</h2>
        <div className="flex gap-4 w-full max-w-sm">
          {scenario.opts.map(opt => (
            <button key={opt} onClick={() => choose(opt)}
              className="flex-1 py-5 bg-orange-600/20 border border-orange-500/40 text-orange-100 rounded-2xl font-bold text-lg hover:bg-orange-600/40 active:scale-95 transition-all">
              {opt}
            </button>
          ))}
        </div>
      </div>
      <div className="text-white/30 text-xs z-10">Speed increases each round!</div>
    </div>
  );
}
