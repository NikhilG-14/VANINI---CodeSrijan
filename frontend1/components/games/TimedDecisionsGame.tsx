'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { TIMED_DECISIONS } from '@/lib/gameContent';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

export default function TimedDecisionsGame({ durationMs, onComplete }: Props) {
  const [idx, setIdx]         = useState(0);
  const [chosen, setChosen]   = useState<string | null>(null);
  const [decided, setDecided] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [timeouts, setTimeouts] = useState(0);

  const startRef  = useRef(Date.now());
  const rtRef     = useRef<number[]>([]);
  const hesRef    = useRef(0); const firstRef = useRef(false);
  const qdRef     = useRef(Date.now());
  const doneRef   = useRef(false);

  const questions = TIMED_DECISIONS;
  const Q_TIME    = 6000; // ms per question

  const finish = useCallback((skip = 0, to = 0, dec = 0) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const total = dec + skip + to;
    onComplete({
      emotion: 'paralysis', gameId: 'timed-decisions',
      durationMs: now - startRef.current,
      reactionTimeMs: rtRef.current,
      errorCount: skip + to, totalActions: total,
      hesitationMs: hesRef.current, engagementScore: total > 0 ? Math.round((dec / total) * 100) : 0,
      decisionChanges: 0, quitEarly: false, performanceDrop: 0,
      clickTimestamps: [], panicClickCount: 0,
    });
  }, [onComplete]);

  const pick = useCallback((opt: string) => {
    if (doneRef.current || chosen) return;
    const now = Date.now();
    rtRef.current.push(now - qdRef.current);
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    setChosen(opt);
    setDecided(d => d + 1);

    setTimeout(() => {
      setChosen(null);
      setIdx(i => {
        const next = i + 1;
        if (next >= questions.length) { finish(skipped, timeouts, decided + 1); return i; }
        qdRef.current = Date.now();
        return next;
      });
    }, 600);
  }, [chosen, questions.length, decided, skipped, timeouts, finish]);

  const skip = useCallback(() => {
    if (doneRef.current) return;
    setSkipped(s => s + 1);
    setIdx(i => {
      const next = i + 1;
      if (next >= questions.length) { finish(skipped + 1, timeouts, decided); return i; }
      qdRef.current = Date.now();
      return next;
    });
  }, [questions.length, decided, skipped, timeouts, finish]);

  const q = questions[idx];
  const progress = (idx / questions.length) * 100;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d0f1a, #1a0a00)' }}>
      {/* Progress */}
      <div className="h-1 w-full bg-white/5">
        <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-8">
        <div className="flex justify-between w-full max-w-sm text-xs font-bold">
          <span className="text-emerald-400">✓ {decided}</span>
          <span className="text-white/30">{idx + 1}/{questions.length}</span>
          <span className="text-red-400">⏭ {skipped}</span>
        </div>

        <div className="text-center">
          <GameTimer key={idx} durationMs={Q_TIME} onExpire={skip} accent="#fb923c" label="Decide!" />
        </div>

        <div className="bg-white/5 border border-orange-500/20 rounded-2xl px-6 py-4 text-center max-w-sm w-full">
          <p className="text-white font-semibold text-base leading-relaxed">{q.q}</p>
        </div>

        <div className="flex gap-4 w-full max-w-sm">
          {q.opts.map(opt => (
            <button key={opt} onClick={() => pick(opt)}
              className={`flex-1 py-4 rounded-2xl font-bold transition-all duration-200 active:scale-95
                ${chosen === opt ? 'bg-orange-500 text-white scale-105 shadow-[0_0_20px_rgba(251,146,60,0.5)]' :
                  'bg-white/5 border border-white/10 text-white hover:bg-orange-500/20 hover:border-orange-500/40'}`}>
              {opt}
            </button>
          ))}
        </div>

        <button onClick={skip} className="text-white/20 text-xs hover:text-white/40 transition-colors">
          skip this one ›
        </button>
      </div>
    </div>
  );
}
