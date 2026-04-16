'use client';
import { useCallback, useRef, useState, useEffect } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { computePanicClicks } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';
import { RetroModal } from '../world/RetroModal';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

import { RISK_SCENARIOS } from '@/lib/gameContent';

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const SCENARIOS = shuffle(RISK_SCENARIOS).slice(0, 8);
const ROUND_MS = 8000;

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
  const currentRoundMs = Math.max(3000, 8000 - round * 700);
  const pct = timeLeft / currentRoundMs;

  return (
    <RetroModal title="WILD ENCOUNTER" onClose={() => finish()}>
      <div className="w-full h-full flex flex-col items-center justify-between pb-4">
        
        {/* Status Bar */}
        <div className="flex items-center justify-between w-full mb-6 bg-white border-[4px] border-black p-3 shadowed-box">
          <span className="text-black text-[10px]">
            Rnd {Math.min(round + 1, SCENARIOS.length)}/{SCENARIOS.length}
          </span>
          <span className="text-red-600 text-[10px]">
            TIME: {(currentRoundMs / 1000).toFixed(1)}s
          </span>
        </div>

        {/* Round timer bar (Retro Style HP Bar) */}
        <div className="w-full h-4 bg-gray-300 border-2 border-black mb-8 relative">
          <div className="absolute top-0 left-0 bottom-0 text-[10px] pl-1 z-10 font-bold leading-3">HP</div>
          <div
            className="h-full border-r-2 border-black transition-all"
            style={{
              width: `${pct * 100}%`,
              background: pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.08s linear',
            }}
          />
        </div>

        {/* Dialogue Box */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full mt-4">
          <div className="bg-white border-[4px] border-black p-4 w-full min-h-[100px] flex items-center shadow-[4px_4px_0_0_#000]">
            <p className="text-black text-sm leading-8">
              {result ? <span className="animate-pulse">{result}</span> : `* ${scenario.q}`}
            </p>
          </div>

          {!result && (
            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={() => choose('safe')}
                className="w-full text-left bg-white border-[4px] border-black p-4 hover:bg-gray-200 active:bg-gray-300 transition-colors shadow-[4px_4px_0_0_#000]"
              >
                <span className="text-sm">▶ {scenario.safe}</span>
              </button>
              <button
                onClick={() => choose('risk')}
                className="w-full text-left bg-white border-[4px] border-black p-4 hover:bg-gray-200 active:bg-gray-300 transition-colors shadow-[4px_4px_0_0_#000]"
              >
                <span className="text-sm">▶ {scenario.risk} </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </RetroModal>
  );
}
