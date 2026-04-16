'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

const COLOR_WORDS = [
  { text: 'RED',   cls: ['text-red-500',   'text-blue-500',   'text-green-500'] },
  { text: 'BLUE',  cls: ['text-blue-500',  'text-red-500',    'text-green-500'] },
  { text: 'GREEN', cls: ['text-green-500', 'text-red-500',    'text-blue-500']  },
];

function genColor() {
  const w = COLOR_WORDS[Math.floor(Math.random() * 3)];
  const ci = Math.floor(Math.random() * 3);
  const match = (w.text === 'RED' && ci === 0) || (w.text === 'BLUE' && ci === 1) || (w.text === 'GREEN' && ci === 2);
  return { text: w.text, cls: w.cls[ci], match };
}

function genMath(max: number) {
  const a = Math.floor(Math.random() * max), b = Math.floor(Math.random() * max), sum = a + b;
  const opts = [sum, sum + 1 + Math.floor(Math.random() * 3), Math.max(0, sum - 1 - Math.floor(Math.random() * 3))].sort(() => Math.random() - 0.5);
  return { q: `${a} + ${b}`, ans: sum, opts };
}

export default function MultitaskChallengeGame({ durationMs, onComplete }: Props) {
  const [colorTask, setColorTask] = useState(genColor);
  const [mathTask,  setMathTask]  = useState(() => genMath(5));
  const [correct, setCorrect]     = useState(0);
  const [wrong,   setWrong]       = useState(0);
  const [feedback, setFeedback]   = useState<'ok'|'err'|null>(null);
  const [phase,   setPhase]       = useState(0);

  const startRef = useRef(Date.now());
  const rtRef    = useRef<number[]>([]);
  const lastRef  = useRef(Date.now());
  const hesRef   = useRef(0); const firstRef = useRef(false);
  const doneRef  = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete({
      emotion: 'fatigue', gameId: 'multitask-challenge',
      durationMs: Date.now() - startRef.current,
      reactionTimeMs: rtRef.current,
      errorCount: wrong, totalActions: correct + wrong,
      hesitationMs: hesRef.current, engagementScore: 90,
      decisionChanges: 0, quitEarly: false, performanceDrop: 0,
      clickTimestamps: [], panicClickCount: 0,
    });
  }, [correct, wrong, onComplete]);

  useEffect(() => {
    const iv = setInterval(() => {
      setPhase(Math.min(3, Math.floor(((Date.now() - startRef.current) / durationMs) * 4)));
    }, 5000);
    return () => clearInterval(iv);
  }, [durationMs]);

  const record = useCallback((ok: boolean) => {
    const now = Date.now();
    rtRef.current.push(now - lastRef.current);
    lastRef.current = now;
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    setFeedback(ok ? 'ok' : 'err');
    setTimeout(() => setFeedback(null), 200);
    if (ok) setCorrect(c => c + 1); else setWrong(w => w + 1);
  }, []);

  const answerColor = (say: boolean) => {
    if (doneRef.current) return;
    record(say === colorTask.match);
    setColorTask(genColor());
  };

  const answerMath = (n: number) => {
    if (doneRef.current) return;
    record(n === mathTask.ans);
    setMathTask(genMath([5, 8, 12, 18][Math.min(phase, 3)]));
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center p-4 gap-3 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0a192f, #06b6d422)' }}>
      {feedback && <div className={`absolute inset-0 z-50 pointer-events-none ${feedback === 'ok' ? 'bg-emerald-500/10' : 'bg-red-500/15'}`} />}
      <div className="w-full flex justify-between items-center z-10">
        <div className="flex gap-3 text-xs font-bold">
          <span className="text-emerald-400">✅ {correct}</span>
          <span className="text-red-400">❌ {wrong}</span>
          <span className="text-white/30">Phase {phase + 1}/4</span>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#06b6d4" label="Multi" />
      </div>
      <div className="flex-1 w-full grid grid-rows-2 gap-3 z-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
          <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Does the WORD match the COLOR?</h3>
          <div className={`text-5xl font-black ${colorTask.cls}`}>{colorTask.text}</div>
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => answerColor(true)} className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold hover:bg-emerald-500/30 transition-all active:scale-95">✓ YES</button>
            <button onClick={() => answerColor(false)} className="flex-1 py-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl font-bold hover:bg-red-500/30 transition-all active:scale-95">✗ NO</button>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
          <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Solve: {mathTask.q} = ?</h3>
          <div className="text-4xl font-black text-white">{mathTask.q} = ?</div>
          <div className="flex gap-2 w-full max-w-xs">
            {mathTask.opts.map(opt => (
              <button key={opt} onClick={() => answerMath(opt)} className="flex-1 py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl font-bold hover:bg-cyan-500/30 transition-all active:scale-95">{opt}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-white/20 text-[10px] z-10 pb-1">Both tasks get harder — manage your focus!</p>
    </div>
  );
}
