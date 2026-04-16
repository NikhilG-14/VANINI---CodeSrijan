'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

const COLOR_WORDS = [
  { text: 'RED',  classes: ['text-red-500', 'text-blue-500', 'text-green-500', 'text-yellow-400', 'text-purple-500'] },
  { text: 'BLUE', classes: ['text-blue-500', 'text-red-500', 'text-green-500', 'text-yellow-400', 'text-purple-500'] },
  { text: 'GREEN',classes: ['text-green-500','text-red-500', 'text-blue-500', 'text-yellow-400', 'text-purple-500'] },
];
const MATH_RANGE = [5, 10, 15, 20]; // operand max increases with phases

function generateColor(idx = 0) {
  const word = COLOR_WORDS[Math.floor(Math.random() * COLOR_WORDS.length)];
  const classIdx = Math.floor(Math.random() * word.classes.length);
  return { text: word.text, colorClass: word.classes[classIdx], match: word.text === COLOR_WORDS.find(w => w.classes[0] === word.classes[classIdx])?.text };
}

function generateMath(maxVal: number) {
  const a = Math.floor(Math.random() * maxVal);
  const b = Math.floor(Math.random() * maxVal);
  const sum = a + b;
  const wrong1 = sum + 1 + Math.floor(Math.random() * 3);
  const wrong2 = Math.max(0, sum - 1 - Math.floor(Math.random() * 3));
  const opts = [sum, wrong1, wrong2].sort(() => Math.random() - 0.5);
  return { q: `${a} + ${b}`, answer: sum, opts };
}

export default function MultitaskChallengeGame({ durationMs, onComplete }: Props) {
  const [colorTask, setColorTask] = useState(() => generateColor());
  const [mathTask, setMathTask] = useState(() => generateMath(5));
  const [scores, setScores] = useState({ correct: 0, wrong: 0 });
  const [feedbackColor, setFeedbackColor] = useState<'correct' | 'wrong' | null>(null);
  const [phase, setPhase] = useState(0);

  const startRef = useRef(Date.now());
  const reactionTimes = useRef<number[]>([]);
  const lastActionRef = useRef(Date.now());
  const hesRef = useRef(0);
  const firstRef = useRef(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const result: GameResult = {
      emotion: 'fatigue',
      gameId: 'multitask-challenge',
      durationMs: now - startRef.current,
      reactionTimeMs: reactionTimes.current,
      errorCount: scores.wrong,
      totalActions: scores.correct + scores.wrong,
      hesitationMs: hesRef.current,
      engagementScore: 90,
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: [],
      panicClickCount: 0,
    };
    onComplete(result);
  }, [scores, onComplete]);

  // Phase ramp: increase difficulty every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(3, Math.floor((elapsed / durationMs) * 4));
      setPhase(p);
    }, 5000);
    return () => clearInterval(interval);
  }, [durationMs]);

  const recordAction = useCallback((isCorrect: boolean) => {
    const now = Date.now();
    const rt = now - lastActionRef.current;
    lastActionRef.current = now;
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    reactionTimes.current.push(rt);
    setFeedbackColor(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => setFeedbackColor(null), 200);
    setScores(prev => ({ correct: isCorrect ? prev.correct + 1 : prev.correct, wrong: isCorrect ? prev.wrong : prev.wrong + 1 }));
  }, []);

  const handleColorAnswer = (userSaysMatch: boolean) => {
    if (doneRef.current) return;
    // Check: does the text WORD match the ink COLOR?
    const wordIsRed = colorTask.text === 'RED';
    const inkIsRed = colorTask.colorClass === 'text-red-500';
    const wordIsBlue = colorTask.text === 'BLUE';
    const inkIsBlue = colorTask.colorClass === 'text-blue-500';
    const wordIsGreen = colorTask.text === 'GREEN';
    const inkIsGreen = colorTask.colorClass === 'text-green-500';
    const actualMatch = (wordIsRed && inkIsRed) || (wordIsBlue && inkIsBlue) || (wordIsGreen && inkIsGreen);
    recordAction(userSaysMatch === actualMatch);
    setColorTask(generateColor(phase));
  };

  const handleMathAnswer = (ans: number) => {
    if (doneRef.current) return;
    recordAction(ans === mathTask.answer);
    setMathTask(generateMath(MATH_RANGE[Math.min(phase, 3)]));
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center p-4 gap-3 overflow-hidden"
      style={{ background: `linear-gradient(180deg, #0a192f, #06b6d422)` }}>

      {/* Flash feedback overlay */}
      {feedbackColor && (
        <div className={`absolute inset-0 z-50 pointer-events-none transition-opacity ${feedbackColor === 'correct' ? 'bg-emerald-500/10' : 'bg-red-500/15'}`} />
      )}

      <div className="w-full flex justify-between items-center z-10">
        <div className="flex gap-3 text-xs font-bold">
          <span className="text-emerald-400">✅ {scores.correct}</span>
          <span className="text-red-400">❌ {scores.wrong}</span>
          <span className="text-white/30">Phase {phase + 1}/4</span>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#06b6d4" label="Multi" />
      </div>

      <div className="flex-1 w-full grid grid-rows-2 gap-3 z-10">
        {/* Color Task */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
          <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Does the WORD match the COLOR?</h3>
          <div className={`text-5xl font-black ${colorTask.colorClass}`}>{colorTask.text}</div>
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => handleColorAnswer(true)} className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold hover:bg-emerald-500/30 transition-all active:scale-95">✓ YES</button>
            <button onClick={() => handleColorAnswer(false)} className="flex-1 py-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl font-bold hover:bg-red-500/30 transition-all active:scale-95">✗ NO</button>
          </div>
        </div>

        {/* Math Task */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
          <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Solve: {phase >= 2 ? 'Numbers get bigger!' : 'What is the answer?'}</h3>
          <div className="text-4xl font-black text-white">{mathTask.q} = ?</div>
          <div className="flex gap-2 w-full max-w-xs">
            {mathTask.opts.map(opt => (
              <button key={opt} onClick={() => handleMathAnswer(opt)} className="flex-1 py-3 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl font-bold hover:bg-cyan-500/30 transition-all active:scale-95">{opt}</button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-white/20 text-[10px] z-10 pb-1">Both tasks get harder — manage your focus!</p>
    </div>
  );
}
