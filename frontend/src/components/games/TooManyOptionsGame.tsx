'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameResult } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

const BASE_OPTIONS = [
  "Read a book", "Go for a walk", "Watch a movie", "Call a friend", "Clean the house",
  "Cook a meal", "Play a game", "Take a nap", "Start a project", "Listen to music",
  "Meditate", "Draw something",
];
const EXTRA_OPTIONS = [
  "Reorganize app icons", "Check the news", "Scroll social media", "Do laundry",
  "Water the plants", "Write a journal entry", "Practice an instrument",
];

const QUESTIONS = [
  "You have a free afternoon. What do you want to do?",
  "What would help you feel better right now?",
  "What do you wish you had time for?",
];

export default function TooManyOptionsGame({ durationMs, onComplete }: Props) {
  const [questionIdx, setQuestionIdx] = useState(0);
  const [options, setOptions] = useState(BASE_OPTIONS.slice(0, 8));
  const [jitter, setJitter] = useState(0); // px of random displacement
  const [decisionTimes, setDecisionTimes] = useState<number[]>([]);

  const startRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const hesRef = useRef(0);
  const firstRef = useRef(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const result: GameResult = {
      emotion: 'paralysis',
      gameId: 'too-many-options',
      durationMs: now - startRef.current,
      reactionTimeMs: decisionTimes,
      errorCount: 0,
      totalActions: QUESTIONS.length,
      hesitationMs: hesRef.current,
      engagementScore: 80,
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: [],
      panicClickCount: 0,
    };
    onComplete(result);
  }, [decisionTimes, onComplete]);

  // Ramp: increase jitter and add distractor options over time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(1, elapsed / durationMs);

      // Add distractors every 20s up to full list
      const totalOptions = Math.min(BASE_OPTIONS.length + EXTRA_OPTIONS.length, Math.floor(8 + pct * 11));
      const combined = [...BASE_OPTIONS, ...EXTRA_OPTIONS].slice(0, totalOptions);
      setOptions([...combined].sort(() => Math.random() - 0.5)); // shuffle

      // Jitter grows from 0 to 8px
      setJitter(pct * 8);
    }, 5000);
    return () => clearInterval(interval);
  }, [durationMs]);

  const choose = useCallback((opt: string) => {
    if (doneRef.current) return;
    const now = Date.now();
    const rt = now - questionStartRef.current;
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }

    setDecisionTimes(prev => [...prev, rt]);
    if (questionIdx + 1 < QUESTIONS.length) {
      setQuestionIdx(q => q + 1);
      questionStartRef.current = Date.now();
      setOptions([...BASE_OPTIONS, ...EXTRA_OPTIONS.slice(0, Math.floor((Date.now() - startRef.current) / durationMs * 7))].sort(() => Math.random() - 0.5));
    } else {
      setQuestionIdx(0); // Loop content
      questionStartRef.current = Date.now();
    }
  }, [questionIdx, finish, durationMs]);

  return (
    <div className="relative w-full h-full flex flex-col items-center p-6 gap-6 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0f172a, #2c1810)' }}>

      <div className="w-full flex justify-between items-center z-10">
        <div>
          <div className="text-orange-400 font-bold">Question {questionIdx + 1}/{QUESTIONS.length}</div>
          <div className="text-white/30 text-xs">{options.length} options available</div>
        </div>
        <GameTimer durationMs={durationMs} onExpire={finish} accent="#fb923c" label="Pick" />
      </div>

      <div className="flex-1 w-full flex flex-col items-center gap-4 z-10 overflow-y-auto custom-scrollbar">
        <h2 className="text-white text-xl font-bold text-center">{QUESTIONS[questionIdx]}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full">
          {options.map(opt => {
            const dx = (Math.random() - 0.5) * jitter;
            const dy = (Math.random() - 0.5) * jitter;
            return (
              <button key={opt} onClick={() => choose(opt)}
                className="py-3 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm hover:bg-white/10 hover:border-orange-500/40 hover:text-orange-100 transition-all active:scale-95"
                style={{ transform: `translate(${dx}px, ${dy}px)` }}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-white/20 text-xs z-10">Options keep growing — pick before it gets worse!</div>
    </div>
  );
}
