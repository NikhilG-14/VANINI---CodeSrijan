'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

const TASKS = [
  { emoji: '🧩', label: 'Solve a complex logic puzzle', effort: 4 },
  { emoji: '📖', label: 'Read a dense medical research paper', effort: 3 },
  { emoji: '✉️', label: 'Draft 50 formal professional emails', effort: 5 },
  { emoji: '🎵', label: 'Compose a new orchestral piece', effort: 4 },
  { emoji: '🏃', label: 'Run a full marathon (in real-time)', effort: 5 },
  { emoji: '🍲', label: 'Prepare a 12-course gourmet dinner', effort: 5 },
  { emoji: '🌿', label: 'Identify and water 100 rare plants', effort: 3 },
  { emoji: '📝', label: 'Write a full 50,000 word novel', effort: 5 },
  { emoji: '🎨', label: 'Paint a massive photorealistic mural', effort: 4 },
  { emoji: '🧹', label: 'Deep clean a 10,000 sq ft mansion', effort: 5 },
  { emoji: '📞', label: 'Call every person in your contacts list', effort: 4 },
  { emoji: '🧘', label: 'Meditate for 4 hours without moving', effort: 3 },
  { emoji: '🧪', label: 'Learn organic chemistry in 1 minute', effort: 4 },
  { emoji: '🏗️', label: 'Design a skyscraper blueprint', effort: 5 },
];

export default function PersistenceTestGame({ durationMs, onComplete }: Props) {
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [quitVisible, setQuitVisible] = useState(false);

  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  const finish = useCallback((quit = false) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const now = Date.now();
    const done = completed.size;
    const total = TASKS.length;

    onComplete({
      emotion: 'depression',
      gameId: 'persistence-test',
      durationMs: now - startRef.current,
      reactionTimeMs: [],
      errorCount: total - done,
      totalActions: done,
      hesitationMs: quit ? now - startRef.current : 0,
      engagementScore: Math.round((done / total) * 100),
      decisionChanges: 0,
      quitEarly: quit,
      performanceDrop: 0,
      clickTimestamps: [],
      panicClickCount: 0,
    });
  }, [completed, onComplete]);

  const toggle = (i: number) => {
    if (doneRef.current) return;
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const pct = (completed.size / TASKS.length) * 100;

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-slate-950 overflow-hidden">
      {/* Background ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e1b4b_0%,transparent_70%)]" />

      {/* Header HUD */}
      <div className="relative z-20 w-full max-w-4xl flex items-center justify-between px-8 py-6 mt-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]" />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Motivation Spectrum</span>
          </div>
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-4xl font-black text-white tracking-tighter">{completed.size}</span>
            <span className="text-indigo-400/50 text-xs font-bold uppercase">Points of Interest</span>
            <span className="text-white/10 text-xs font-bold uppercase ml-2 select-none tracking-widest">{TASKS.length} Potential</span>
          </div>
        </div>

        <GameTimer durationMs={durationMs} onExpire={() => finish(false)} accent="#818cf8" label="Observation Window" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 w-full max-w-2xl px-8 flex flex-col items-center py-4">
        <div className="text-center mb-10 max-w-sm">
           <p className="text-white/40 text-sm leading-relaxed">
             A list of theoretical objectives. Check off anything that captures your interest.
             There is no specific goal — stop whenever you're ready.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-h-[50vh] overflow-y-auto pr-2 custom-scroll">
          {TASKS.map((task, i) => {
            const isDone = completed.has(i);
            return (
              <button 
                key={i} 
                onClick={() => toggle(i)}
                className={`flex items-center gap-4 p-5 rounded-[1.5rem] text-left transition-all transform active:scale-[0.98] border
                  ${isDone 
                    ? 'bg-indigo-600/20 border-indigo-400/40 shadow-xl' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/20'}`}
              >
                <span className={`text-2xl transition-transform ${isDone ? 'scale-110 grayscale-0' : 'grayscale opacity-30 select-none'}`}>
                  {task.emoji}
                </span>
                <div className="flex flex-col flex-1">
                  <span className={`text-[11px] font-black uppercase tracking-tight transition-colors ${isDone ? 'text-white' : 'text-white/40'}`}>
                    {task.label}
                  </span>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <div 
                        key={j} 
                        className={`w-1.5 h-1.5 rounded-full transition-all 
                          ${j < task.effort 
                            ? (isDone ? 'bg-indigo-400' : 'bg-white/10') 
                            : 'bg-transparent'}`} 
                      />
                    ))}
                  </div>
                </div>
                {isDone && (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center animate-in zoom-in duration-300">
                    <span className="text-white text-[10px]">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="mt-auto w-full max-w-sm pt-8 flex flex-col gap-3">
           <button 
             onClick={() => finish(false)}
             className="w-full py-5 rounded-[1.5rem] bg-indigo-600 font-pixel text-[10px] text-white tracking-widest hover:bg-indigo-500 transition-all shadow-[0_15px_30px_-10px_rgba(129,140,248,0.5)] active:scale-95"
           >
             COMPLETE SESSION
           </button>
           
           {!quitVisible ? (
             <button 
               onClick={() => setQuitVisible(true)}
               className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-colors py-2"
             >
               Nothing here interests me
             </button>
           ) : (
             <button 
               onClick={() => finish(true)}
               className="group flex items-center justify-center gap-2 py-4 rounded-[1.5rem] border border-red-500/20 bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all font-black text-[10px] uppercase tracking-widest"
             >
               <span>Abort Persistence Analysis</span>
             </button>
           )}
        </div>
      </div>

      {/* Progress Footer */}
      <div className="relative z-20 w-full bg-white/[0.02] border-t border-white/5 backdrop-blur-md px-8 py-6 flex flex-col gap-4 overflow-hidden">
        <div className="absolute left-0 top-0 w-full h-[3px] bg-white/5">
           <div 
             className="h-full bg-indigo-500 transition-all duration-700 ease-out" 
             style={{ width: `${pct}%` }}
           />
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
          <span>Simulation Integrity</span>
          <span className="text-white/60">Session Status: {completed.size > 0 ? 'PARTIAL' : 'STATIC'}</span>
        </div>
      </div>

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 3px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(129,140,248,0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}
