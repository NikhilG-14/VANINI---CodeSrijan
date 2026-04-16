'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { PERFECT_ROUNDS } from '@/lib/gameContent';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

export default function PerfectChoiceGame({ durationMs, onComplete }: Props) {
  const [idx, setIdx]         = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [changes, setChanges] = useState(0);
  const [answered, setAnswered] = useState(0);

  const startRef = useRef(Date.now());
  const rtRef    = useRef<number[]>([]);
  const hesRef   = useRef(0); const firstRef = useRef(false);
  const qdRef    = useRef(Date.now());
  const prevSel  = useRef<string | null>(null);
  const doneRef  = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete({
      emotion: 'overthinking', gameId: 'perfect-choice',
      durationMs: Date.now() - startRef.current,
      reactionTimeMs: rtRef.current,
      errorCount: 0, totalActions: answered,
      hesitationMs: hesRef.current, engagementScore: 100,
      decisionChanges: changes, quitEarly: false, performanceDrop: 0,
      clickTimestamps: [], panicClickCount: 0,
    });
  }, [answered, changes, onComplete]);

  const choose = (opt: string) => {
    const now = Date.now();
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    if (prevSel.current && prevSel.current !== opt) setChanges(c => c + 1);
    prevSel.current = opt;
    setSelected(opt);
  };

  const next = () => {
    if (!selected) return;
    rtRef.current.push(Date.now() - qdRef.current);
    qdRef.current = Date.now();
    setAnswered(a => a + 1);
    setIdx(i => {
      if (i + 1 >= PERFECT_ROUNDS.length) { finish(); return i; }
      return i + 1;
    });
    setSelected(null);
    prevSel.current = null;
  };

  const q = PERFECT_ROUNDS[idx];
  const pct = (idx / PERFECT_ROUNDS.length) * 100;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0e0818, #1a0830)' }}>
      <div className="h-1 w-full bg-white/5">
        <div className="h-full bg-purple-400/60 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="absolute top-4 right-4 z-10">
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#a855f7" label="Perfect" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center max-w-md">
          <p className="text-purple-400/60 text-xs font-bold uppercase tracking-widest mb-3">🧩 {idx + 1}/{PERFECT_ROUNDS.length}</p>
          <p className="text-white text-lg font-semibold leading-relaxed">{q.q}</p>
          <p className="text-purple-400/40 text-xs mt-2">Four nearly identical options. Which one feels most right?</p>
        </div>

        {changes > 1 && (
          <div className="text-purple-400/60 text-xs bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Reconsidering {changes}× 🌀
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 w-full max-w-md">
          {q.opts.map(opt => (
            <button key={opt} onClick={() => choose(opt)}
              className={`w-full px-5 py-3.5 rounded-2xl text-left text-sm font-medium transition-all duration-200 active:scale-[0.98]
                ${selected === opt
                  ? 'bg-purple-600/40 border-2 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                  : 'bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.06] hover:border-white/20'}`}>
              {opt}
            </button>
          ))}
        </div>

        <button onClick={next} disabled={!selected}
          className={`px-10 py-3 rounded-2xl font-bold text-sm transition-all duration-200
            ${selected ? 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
          {idx + 1 < PERFECT_ROUNDS.length ? 'Next →' : 'Finish'}
        </button>
      </div>
    </div>
  );
}
