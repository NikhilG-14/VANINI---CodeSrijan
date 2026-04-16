'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

import { LOOP_QUESTIONS } from '@/lib/gameContent';

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const QUESTIONS = shuffle(LOOP_QUESTIONS).slice(0, 10);

export default function LoopDecisionGame({ durationMs, onComplete }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [changeCounts, setChangeCounts] = useState<number[]>(Array(QUESTIONS.length).fill(0));
  const [activeQ, setActiveQ] = useState(0);
  const [locked, setLocked] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0); // 0-1 opacity for visual noise
  const [shuffled, setShuffled] = useState<number[][]>(QUESTIONS.map((_, i) => [0, 1, 2, 3]));

  const startRef = useRef(Date.now());
  const firstAnswerRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const totalChanges = useRef(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const hesMs = firstAnswerRef.current ? firstAnswerRef.current - startRef.current : now - startRef.current;
    const result: GameResult = {
      emotion: 'overthinking',
      gameId: 'loop-decision',
      durationMs: now - startRef.current,
      reactionTimeMs: [hesMs],
      errorCount: 0,
      totalActions: QUESTIONS.length,
      hesitationMs: hesMs,
      engagementScore: Math.round((answers.filter(a => a !== null).length / QUESTIONS.length) * 100),
      decisionChanges: totalChanges.current,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: [],
      panicClickCount: 0,
      rawData: { answers, changeCounts, totalChanges: totalChanges.current },
    };
    onComplete(result);
  }, [answers, changeCounts, onComplete]);

  // Difficulty ramp: increase visual noise & randomly shuffle option order over time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = elapsed / durationMs;
      setNoiseLevel(pct * 0.12); // max 12% overlay opacity

      // Every 15s, shuffle options on a random unanswered question
      if (pct > 0.2 && Math.random() > 0.6) {
        const unanswered = answers.map((a, i) => (a === null ? i : -1)).filter(i => i !== -1);
        if (unanswered.length > 0) {
          const qIdx = unanswered[Math.floor(Math.random() * unanswered.length)];
          setShuffled(prev => {
            const next = [...prev];
            next[qIdx] = [...next[qIdx]].sort(() => Math.random() - 0.5);
            return next;
          });
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [durationMs, answers]);

  const choose = useCallback((qIdx: number, optIdx: number) => {
    if (locked || doneRef.current) return;
    const now = Date.now();
    if (!firstAnswerRef.current) firstAnswerRef.current = now;

    setAnswers(prev => {
      const next = [...prev];
      if (next[qIdx] !== null && next[qIdx] !== optIdx) {
        totalChanges.current++;
        setChangeCounts(cc => { const nc = [...cc]; nc[qIdx]++; return nc; });
      }
      next[qIdx] = optIdx;
      return next;
    });
  }, [locked]);


  const answeredCount = answers.filter(a => a !== null).length;

  return (
    <div className="relative w-full h-full flex flex-col gap-3 p-4 overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #0a0a1a, #1a0533)' }}>

      {/* Visual noise overlay — increases over time */}
      <div className="absolute inset-0 pointer-events-none z-20 transition-opacity"
        style={{
          opacity: noiseLevel,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }} />

      <div className="flex items-center justify-between z-30">
        <div>
          <h3 className="text-white font-bold text-sm">Answer freely — change your mind anytime</h3>
          <p className="text-white/40 text-xs">{answeredCount}/{QUESTIONS.length} answered · {totalChanges.current} changes</p>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#a855f7" label="Loop" />
      </div>

      {/* Question tabs */}
      <div className="flex gap-1.5 z-30">
        {QUESTIONS.map((_, i) => (
          <button key={i} onClick={() => setActiveQ(i)}
            className={`flex-1 h-1 rounded-full transition-all ${activeQ === i ? 'bg-purple-500' : answers[i] !== null ? 'bg-purple-800' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="flex-1 flex flex-col gap-3 z-30">
        <p className="text-white text-base font-semibold leading-snug">🌀 {QUESTIONS[activeQ].q}</p>
        <div className="flex flex-col gap-2">
          {shuffled[activeQ].map((originalIdx) => {
            const opt = QUESTIONS[activeQ].opts[originalIdx];
            const isSelected = answers[activeQ] === originalIdx;
            const cc = changeCounts[activeQ];
            return (
              <button key={originalIdx} onClick={() => choose(activeQ, originalIdx)} disabled={locked}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.99] ${isSelected
                  ? 'border-purple-500 bg-purple-900/40 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-purple-500/30 hover:text-white/90'}`}>
                <span className="mr-2">{isSelected ? '🔵' : '⚪'}</span>
                {opt}
                {isSelected && cc > 0 && <span className="ml-2 text-purple-400 text-xs">({cc} change{cc > 1 ? 's' : ''})</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-auto">
          {QUESTIONS.map((_, i) => (
            <button key={i} onClick={() => setActiveQ(i)}
              className={`flex-1 py-1.5 rounded-lg text-xs border transition-all ${activeQ === i ? 'border-purple-500 text-purple-400' : answers[i] !== null ? 'border-purple-800 text-purple-600' : 'border-white/10 text-white/30'}`}>
              Q{i + 1}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-white/20 text-[10px] pb-2 z-30">
        You can revisit any question and change your answer until time runs out.
      </p>
    </div>
  );
}
