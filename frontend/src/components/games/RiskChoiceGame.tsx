'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { computePanicClicks } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

import { RISK_SCENARIOS } from '@/lib/gameContent';

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const SCENARIOS = shuffle(RISK_SCENARIOS).slice(0, 8);

export default function RiskChoiceGame({ durationMs, onComplete }: Props) {
  const [round, setRound] = useState(0);
  const [chosen, setChosen] = useState<'safe' | 'risk' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);

  const startRef = useRef(Date.now());
  const roundStartRef = useRef(Date.now());
  const hesitationRef = useRef(0);
  const firstChoiceRef = useRef(false);
  const clickTs = useRef<number[]>([]);
  const reactionTimes = useRef<number[]>([]);
  const skipped = useRef(0);
  const safeCount = useRef(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const total = SCENARIOS.length;
    const gameResult: GameResult = {
      emotion: 'anxiety',
      gameId: 'risk-choice',
      durationMs: Date.now() - startRef.current,
      reactionTimeMs: reactionTimes.current,
      errorCount: skipped.current,
      totalActions: total,
      hesitationMs: hesitationRef.current,
      engagementScore: Math.round(((total - skipped.current) / total) * 100),
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: clickTs.current,
      panicClickCount: computePanicClicks(clickTs.current),
      rawData: { safeChoices: safeCount.current, riskChoices: total - skipped.current - safeCount.current },
    };
    onComplete(gameResult);
  }, [onComplete]);

  // Round timer
  useEffect(() => {
    if (doneRef.current || round >= SCENARIOS.length) return;
    if (chosen) return;

    // Progressive difficulty: Round time decreases by 700ms each round, min 3s
    const currentRoundMs = Math.max(3000, 8000 - round * 700);
    setTimeLeft(currentRoundMs);
    roundStartRef.current = Date.now();

    const interval = setInterval(() => {
      const left = Math.max(0, currentRoundMs - (Date.now() - roundStartRef.current));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        skipped.current++;
        if (round + 1 >= SCENARIOS.length) {
          finish();
        } else {
          setRound((r) => r + 1);
          setChosen(null);
          setResult(null);
        }
      }
    }, 80);
    return () => clearInterval(interval);
  }, [round, chosen, finish]);

  const choose = useCallback((type: 'safe' | 'risk') => {
    if (chosen || doneRef.current) return;
    const now = Date.now();
    clickTs.current.push(now);
    const rt = now - roundStartRef.current;
    reactionTimes.current.push(rt);
    if (!firstChoiceRef.current) {
      hesitationRef.current = now - startRef.current;
      firstChoiceRef.current = true;
    }
    if (type === 'safe') safeCount.current++;
    setChosen(type);

    // Brief result flash then advance
    const outcomes = {
      safe: ['You chose safety. +5 pts 🛡️', 'Safe pick. Steady progress 🟢', 'Comfort zone chosen ✅'],
      risk: ['Bold move! Coin flip... 🎲', 'You went for it! 🚀', 'Risk taken! Let\'s see... 🌟'],
    };
    setResult(outcomes[type][Math.floor(Math.random() * 3)]);
    setTimeout(() => {
      if (round + 1 >= SCENARIOS.length) {
        setRound(0); // Loop
      } else {
        setRound(r => r + 1);
      }
      setChosen(null);
      setResult(null);
    }, 900);
  }, [chosen, round, finish]);

  const scenario = SCENARIOS[Math.min(round, SCENARIOS.length - 1)];
  const pct = timeLeft / ROUND_MS;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between py-4 px-4"
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #431407 60%, #0f172a 100%)' }}>
      <div className="flex items-center justify-between w-full">
        <span className="text-amber-400 text-sm font-semibold">Round {Math.min(round + 1, SCENARIOS.length)}/{SCENARIOS.length}</span>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#f59e0b" label="Risk" />
      </div>

      {/* Round timer bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct * 100}%`,
            background: pct > 0.5 ? '#f59e0b' : pct > 0.25 ? '#ef4444' : '#7f1d1d',
            transition: 'width 0.08s linear',
          }}
        />
      </div>

      {/* Question card */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-md">
        <p className="text-white text-xl font-semibold text-center leading-relaxed px-2">
          🎲 {scenario.q}
        </p>

        {result ? (
          <div className="text-white text-lg font-bold animate-bounce">{result}</div>
        ) : (
          <div className="flex gap-4 w-full">
            <button
              onClick={() => choose('safe')}
              className="flex-1 py-4 rounded-2xl font-bold text-sm border border-emerald-500/40 text-emerald-400 bg-emerald-900/20 hover:bg-emerald-800/40 transition-all active:scale-95"
            >
              🛡️ {scenario.safe}
            </button>
            <button
              onClick={() => choose('risk')}
              className="flex-1 py-4 rounded-2xl font-bold text-sm border border-amber-500/40 text-amber-400 bg-amber-900/20 hover:bg-amber-800/40 transition-all active:scale-95"
            >
              🎲 {scenario.risk}
            </button>
          </div>
        )}
      </div>

      <p className="text-white/30 text-xs">Choose before time runs out</p>
    </div>
  );
}
