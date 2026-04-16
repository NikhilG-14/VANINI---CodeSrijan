'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

const OPTION_SETS = [
  { q: "Choose a weekend trip", opts: ["Beach", "Mountains", "City Break", "Countryside", "Theme Park", "Lake House", "Road Trip", "Staycation"] },
  { q: "Pick a meal to cook tonight", opts: ["Pasta", "Stir Fry", "Soup", "Salad", "Tacos", "Pizza", "Curry", "Sandwich"] },
  { q: "Choose a hobby to start", opts: ["Painting", "Guitar", "Running", "Reading", "Coding", "Gardening", "Chess", "Photography"] },
  { q: "Pick a show to watch", opts: ["Drama", "Comedy", "Thriller", "Documentary", "Sci-Fi", "Romance", "Crime", "Anime"] },
  { q: "Choose a morning routine item", opts: ["Meditation", "Exercise", "Journaling", "Cold Shower", "Reading", "Stretching", "Walk", "Breathing"] },
  { q: "Select a skill to learn", opts: ["Language", "Cooking", "Music", "Finance", "Design", "Fitness", "Writing", "Public Speaking"] },
  { q: "Pick a way to relax", opts: ["Music", "Bath", "Gaming", "Nap", "Movie", "Tea", "Walk", "Call a friend"] },
  { q: "Choose a life goal", opts: ["Travel more", "Save money", "Get fit", "Learn new skill", "Make new friends", "Get promoted", "Start business", "Be healthier"] },
];

export default function TooManyOptionsGame({ durationMs, onComplete }: Props) {
  const [idx, setIdx]         = useState(0);
  const [chosen, setChosen]   = useState<string | null>(null);
  const [decided, setDecided] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [totalTime, setTotalTime] = useState<number[]>([]);

  const startRef = useRef(Date.now());
  const rtRef    = useRef<number[]>([]);
  const hesRef   = useRef(0); const firstRef = useRef(false);
  const qdRef    = useRef(Date.now());
  const doneRef  = useRef(false);

  const finish = useCallback((dec = decided, sk = skipped) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const total = dec + sk;
    onComplete({
      emotion: 'paralysis', gameId: 'too-many-options',
      durationMs: Date.now() - startRef.current,
      reactionTimeMs: rtRef.current,
      errorCount: sk, totalActions: total,
      hesitationMs: hesRef.current,
      engagementScore: total > 0 ? Math.round((dec / total) * 100) : 0,
      decisionChanges: 0, quitEarly: false, performanceDrop: 0,
      clickTimestamps: [], panicClickCount: 0,
    });
  }, [decided, skipped, onComplete]);

  const pick = useCallback((opt: string) => {
    if (doneRef.current || chosen) return;
    const now = Date.now();
    const rt  = now - qdRef.current;
    rtRef.current.push(rt);
    setTotalTime(prev => [...prev, rt]);
    if (!firstRef.current) { hesRef.current = now - startRef.current; firstRef.current = true; }
    setChosen(opt);
    const newDec = decided + 1;
    setDecided(newDec);

    setTimeout(() => {
      setChosen(null);
      qdRef.current = Date.now();
      setIdx(i => {
        const next = i + 1;
        if (next >= OPTION_SETS.length) { finish(newDec, skipped); return i; }
        return next;
      });
    }, 600);
  }, [chosen, decided, skipped, finish]);

  const skip = useCallback(() => {
    if (doneRef.current) return;
    const newSkip = skipped + 1;
    setSkipped(newSkip);
    qdRef.current = Date.now();
    setIdx(i => {
      const next = i + 1;
      if (next >= OPTION_SETS.length) { finish(decided, newSkip); return i; }
      return next;
    });
  }, [decided, skipped, finish]);

  const set = OPTION_SETS[idx];
  const avgRt = totalTime.length > 0 ? Math.round(totalTime.reduce((a,b)=>a+b,0)/totalTime.length/1000*10)/10 : 0;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d0a00, #1a0f00)' }}>
      <div className="absolute top-4 right-4 z-10">
        <GameTimer durationMs={durationMs} onExpire={() => finish()} accent="#fb923c" label="Choose" />
      </div>

      <div className="flex-1 flex flex-col items-center gap-6 px-6 py-8 overflow-y-auto">
        <div className="text-center max-w-md mt-8">
          <p className="text-orange-400/60 text-xs font-bold uppercase tracking-widest mb-2">
            🔀 {idx + 1}/{OPTION_SETS.length} · avg {avgRt}s
          </p>
          <h3 className="text-white text-lg font-semibold leading-relaxed">{set.q}</h3>
          <p className="text-white/30 text-xs mt-1">Pick the first one that feels right</p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {set.opts.map((opt, i) => (
            <button key={i} onClick={() => pick(opt)}
              className={`py-4 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-95 text-left
                ${chosen === opt
                  ? 'bg-orange-500 text-white scale-105 shadow-[0_0_20px_rgba(251,146,60,0.4)]'
                  : 'bg-white/[0.04] border border-white/10 text-white/70 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-white'}`}>
              {opt}
            </button>
          ))}
        </div>

        <button onClick={skip} className="text-white/20 text-xs hover:text-white/40 transition-colors mt-auto">
          Can't decide, skip →
        </button>
      </div>

      <div className="px-6 pb-4 flex gap-4 text-xs font-bold justify-center">
        <span className="text-emerald-400">✓ {decided} decided</span>
        <span className="text-red-400/60">⏭ {skipped} skipped</span>
      </div>
    </div>
  );
}
