'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

import { PERFECT_ROUNDS } from '@/lib/gameContent';

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const ROUNDS = shuffle(PERFECT_ROUNDS).slice(0, 8);

const BASE_ROUND_MS = 20000;
const MIN_ROUND_MS = 6000;

export default function PerfectChoiceGame({ durationMs, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [changes, setChanges] = useState(0);
  const [timeLeft, setTimeLeft] = useState(BASE_ROUND_MS);
  const [totalDecisionTime, setTotalDecisionTime] = useState<number[]>([]);
  const [optBlur, setOptBlur] = useState(false); // brief blur to disrupt reading

  const startRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());
  const hesRef = useRef(0);
  const firstRef = useRef(false);
  const doneRef = useRef(false);
  const totalChangesRef = useRef(0);

  // Round window shrinks as game progresses
  const getRoundMs = (r: number) => Math.max(MIN_ROUND_MS, BASE_ROUND_MS - r * 2000);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const result: GameResult = {
      emotion: 'overthinking',
      gameId: 'perfect-choice',
      durationMs: now - startRef.current,
      reactionTimeMs: totalDecisionTime,
      errorCount: 0,
      totalActions: ROUNDS.length,
      hesitationMs: hesRef.current,
      engagementScore: 70,
      decisionChanges: totalChangesRef.current,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: [],
      panicClickCount: 0,
      rawData: { totalChanges: totalChangesRef.current },
    };
    onComplete(result);
  }, [totalDecisionTime, onComplete]);

  // Round timer with shrinking window
  useEffect(() => {
    if (doneRef.current) return;
    const currentRoundMs = getRoundMs(round);
    setTimeLeft(currentRoundMs);
    roundStartRef.current = Date.now();

    const interval = setInterval(() => {
      const left = Math.max(0, currentRoundMs - (Date.now() - roundStartRef.current));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        const rt = currentRoundMs;
        setTotalDecisionTime(prev => [...prev, rt]);
        if (round + 1 >= ROUNDS.length) {
          setRound(0); 
          setChosen(null);
        } else {
          setRound(r => r + 1);
          setChosen(null);
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [round, finish]); // eslint-disable-line

  // Blur ramp: every 8s, briefly blur options to force re-reading
  useEffect(() => {
    if (doneRef.current) return;
    const blurInterval = setInterval(() => {
      if (doneRef.current) return;
      setOptBlur(true);
      setTimeout(() => setOptBlur(false), 500);
    }, 8000);
    return () => clearInterval(blurInterval);
  }, []);

  const choose = useCallback((idx: number) => {
    if (doneRef.current) return;
    const now = Date.now();
    const rt = now - roundStartRef.current;
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    if (chosen !== null && chosen !== idx) {
      totalChangesRef.current++;
      setChanges(c => c + 1);
    }
    setChosen(idx);
    // Auto-advance after 1.5s
    setTimeout(() => {
      if (!doneRef.current) {
        setTotalDecisionTime(prev => [...prev, rt]);
        if (round + 1 >= ROUNDS.length) {
          setRound(0);
          setChosen(null);
        } else {
          setRound(r => r + 1);
          setChosen(null);
        }
      }
    }, 1500);
  }, [chosen, round, finish]);

  const currentRoundMs = getRoundMs(round);
  const pct = timeLeft / currentRoundMs;
  const currentRound = ROUNDS[Math.min(round, ROUNDS.length - 1)];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a0a1a, #1a0533)' }}>

      <div className="flex items-center justify-between w-full">
        <span className="text-purple-400 text-xs font-semibold">
          Round {Math.min(round + 1, ROUNDS.length)}/{ROUNDS.length} · {changes} edits · {(currentRoundMs / 1000).toFixed(1)}s window
        </span>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#a855f7" label="Perfect" />
      </div>

      {/* Round timer bar */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-purple-500 transition-all"
          style={{ width: `${pct * 100}%`, transition: 'width 0.08s linear' }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm">
        <p className="text-white text-lg font-semibold text-center leading-relaxed">
          🧩 {currentRound.q}
        </p>
        <div className={`w-full flex flex-col gap-2 transition-all duration-300 ${optBlur ? 'blur-sm' : 'blur-0'}`}>
          {currentRound.opts.map((opt, i) => {
            const isSelected = chosen === i;
            return (
              <button key={i} onClick={() => choose(i)}
                className={`w-full py-3 px-4 rounded-xl text-sm border font-medium transition-all active:scale-[0.99] text-left ${isSelected
                  ? 'border-purple-500 bg-purple-900/50 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-purple-400/30 hover:text-white/80'
                  }`}>
                {isSelected ? '🔮' : '○'} {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-white/20 text-xs">All options are similar — choice window shrinks each round!</p>
        <p className="text-purple-500/40 text-[10px]">{Math.round(currentRoundMs / 1000)}s per round</p>
      </div>
    </div>
  );
}
