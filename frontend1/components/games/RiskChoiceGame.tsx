'use client';
import { useCallback, useRef, useState } from 'react';
import type { GameResult } from '@/lib/types';
import { RISK_SCENARIOS } from '@/lib/gameContent';
import { computePanicClicks } from '@/lib/gameSession';
import { GameTimer } from './GameTimer';

interface Props { durationMs: number; onComplete: (r: GameResult) => void; }

export default function RiskChoiceGame({ durationMs, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<'safe'|'risk'|null>(null);
  const [riskCount, setRiskCount] = useState(0);
  const [safeCount, setSafeCount] = useState(0);

  const startRef = useRef(Date.now());
  const rtRef = useRef<number[]>([]);
  const tsRef = useRef<number[]>([]);
  const hesitationRef = useRef(0);
  const firstRef = useRef(false);
  const qdRef = useRef(Date.now());
  const doneRef = useRef(false);

  const finish = useCallback((rc = riskCount, sc = safeCount) => {
    if (doneRef.current) return;
    doneRef.current = true;
    const total = rc + sc;
    onComplete({
      emotion: 'anxiety',
      gameId: 'risk-choice',
      durationMs: Date.now() - startRef.current,
      reactionTimeMs: rtRef.current,
      errorCount: 0,
      totalActions: total,
      hesitationMs: hesitationRef.current,
      engagementScore: total > 0 ? 100 : 0,
      decisionChanges: 0,
      quitEarly: false,
      performanceDrop: 0,
      clickTimestamps: tsRef.current,
      panicClickCount: computePanicClicks(tsRef.current),
      rawData: { riskChoices: rc, safeChoices: sc },
    });
  }, [riskCount, safeCount, onComplete]);

  const pick = useCallback((type: 'safe' | 'risk') => {
    if (doneRef.current || chosen) return;
    const now = Date.now();
    tsRef.current.push(now);
    rtRef.current.push(now - qdRef.current);
    
    if (!firstRef.current) {
      hesitationRef.current = now - startRef.current;
      firstRef.current = true;
    }
    
    setChosen(type);
    const newRisk = riskCount + (type === 'risk' ? 1 : 0);
    const newSafe = safeCount + (type === 'safe' ? 1 : 0);
    
    if (type === 'risk') setRiskCount(newRisk); else setSafeCount(newSafe);

    setTimeout(() => {
      if (doneRef.current) return;
      setChosen(null);
      qdRef.current = Date.now();
      setIdx(i => {
        const next = i + 1;
        if (next >= RISK_SCENARIOS.length) {
          finish(newRisk, newSafe);
          return i;
        }
        return next;
      });
    }, 800);
  }, [chosen, riskCount, safeCount, finish]);

  const s = RISK_SCENARIOS[idx];
  const progress = (idx / RISK_SCENARIOS.length) * 100;

  return (
    <div className="relative w-full h-full flex flex-col items-center bg-slate-950 overflow-hidden">
      {/* Background ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#451a0333_0%,transparent_50%)]" />
      
      {/* Header HUD */}
      <div className="relative z-20 w-full max-w-4xl flex items-center justify-between px-8 py-6 mt-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Decision Profile</span>
          </div>
          <div className="flex items-center gap-6 mt-2">
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl leading-none">{safeCount}</span>
              <span className="text-[9px] text-emerald-500/60 font-black uppercase mt-1">Conservative</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-white font-black text-2xl leading-none">{riskCount}</span>
              <span className="text-[9px] text-amber-500/60 font-black uppercase mt-1">Aggressive</span>
            </div>
          </div>
        </div>

        <GameTimer durationMs={durationMs} onExpire={() => finish()} accent="#f59e0b" label="Confidence Window" />
      </div>

      {/* Scenario Area */}
      <div className="relative z-10 flex-1 w-full max-w-xl flex flex-col items-center justify-center px-10">
        <div className="w-full text-center space-y-8">
           <div className={`transition-all duration-500 ${chosen ? 'opacity-20 scale-95 blur-sm' : 'opacity-100 scale-100'}`}>
              <div className="text-5xl mb-6">🎲</div>
              <h2 className="text-white text-3xl font-black tracking-tight leading-tight mb-4">
                {s.q}
              </h2>
              <div className="h-0.5 w-12 bg-amber-500/30 mx-auto rounded-full" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => pick('safe')}
                disabled={!!chosen}
                className={`group relative overflow-hidden p-8 rounded-[2rem] border transition-all transform active:scale-95
                  ${chosen === 'safe' 
                    ? 'bg-emerald-500 border-emerald-400 scale-105 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)]' 
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-emerald-500/30'}`}
              >
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-3xl mb-3">🛡️</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${chosen === 'safe' ? 'text-white' : 'text-emerald-400/80 group-hover:text-emerald-400'}`}>
                    {s.safe}
                  </span>
                </div>
                {!chosen && <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>

              <button 
                onClick={() => pick('risk')}
                disabled={!!chosen}
                className={`group relative overflow-hidden p-8 rounded-[2rem] border transition-all transform active:scale-95
                  ${chosen === 'risk' 
                    ? 'bg-amber-500 border-amber-300 scale-105 shadow-[0_20px_40px_-10px_rgba(245,158,11,0.5)]' 
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-amber-500/30'}`}
              >
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-3xl mb-3">🔥</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${chosen === 'risk' ? 'text-white' : 'text-amber-400/80 group-hover:text-amber-400'}`}>
                    {s.risk}
                  </span>
                </div>
                {!chosen && <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </button>
           </div>
        </div>
      </div>

      {/* Progress Footer */}
      <div className="relative z-20 w-full bg-white/[0.02] border-t border-white/5 backdrop-blur-md px-8 py-6 flex flex-col gap-4 overflow-hidden">
        <div className="absolute left-0 top-0 w-full h-[3px] bg-white/5">
           <div 
             className="h-full bg-amber-500 transition-all duration-700 ease-out" 
             style={{ width: `${progress}%` }}
           />
        </div>
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/30">
          <span>Simulation Progress</span>
          <span className="text-white/60">{idx + 1} / {RISK_SCENARIOS.length} Scenarios</span>
        </div>
      </div>
    </div>
  );
}
