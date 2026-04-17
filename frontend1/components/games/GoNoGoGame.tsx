'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameTimer } from './GameTimer';
import { sounds } from '@/lib/soundEffects';
import type { GameResult, GameAssignment } from '@/lib/types';

interface Props {
  assignment: GameAssignment;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

// --- Constants (edit here to tune the task) ---
const TOTAL_DURATION_MS = 60_000;   // 60-second session
const GO_RATIO          = 0.70;     // 70% Go trials
const STIM_DURATION_MS  = 700;      // stimulus visible for 700 ms
const RESPONSE_WINDOW   = 1_000;    // total window to respond (ms)
const ISI_MIN           = 800;      // inter-stimulus interval min (ms)
const ISI_MAX           = 1_200;    // inter-stimulus interval max (ms)

const AVG_CYCLE_MS = STIM_DURATION_MS + (ISI_MIN + ISI_MAX) / 2;
const EXPECTED_TRIALS   = Math.floor(TOTAL_DURATION_MS / AVG_CYCLE_MS); // ≈ 35

interface TrialRecord {
  trial: number;
  type: 'go' | 'nogo';
  rt: number | null;          
  correct: boolean;
  commission: boolean;        
  omission: boolean;          
  ts: number;                 
}

function buildTrials(n: number): Array<'go' | 'nogo'> {
  const goCount   = Math.round(n * GO_RATIO);
  const nogoCount = n - goCount;
  const t: Array<'go' | 'nogo'> = [
    ...Array(goCount).fill('go'),
    ...Array(nogoCount).fill('nogo'),
  ];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export default function GoNoGoGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft]   = useState(TOTAL_DURATION_MS);
  const [target, setTarget] = useState<{ type: 'go'|'nogo', x: number, y: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ type: 'correct'|'wrong', x: number, y: number } | null>(null);
  const [trialDisplay, setTrialDisplay] = useState(0);

  const trialsRef       = useRef<Array<'go' | 'nogo'>>([]);
  const trialIndexRef   = useRef(0);
  const resultsRef      = useRef<TrialRecord[]>([]);
  const stimOnRef       = useRef(false);
  const respondedRef    = useRef(false);
  const stimStartRef    = useRef(0);
  const gameStartRef    = useRef(0);
  const stepTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef        = useRef<'intro' | 'playing' | 'outro'>('intro');

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    clockRef.current = setInterval(() => {
      const elapsed = Date.now() - gameStartRef.current;
      const remaining = Math.max(0, TOTAL_DURATION_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) endGame();
    }, 500);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [phase]);

  const scheduleNextTrial = () => {
    if (phaseRef.current !== 'playing') return;
    if (trialIndexRef.current >= trialsRef.current.length) { endGame(); return; }
    
    stimOnRef.current   = false;
    respondedRef.current = false;
    setTarget(null);

    const isi = ISI_MIN + Math.random() * (ISI_MAX - ISI_MIN);
    stepTimerRef.current = setTimeout(showStimulus, isi);
  };

  const showStimulus = () => {
    if (phaseRef.current !== 'playing') return;
    
    const x = 15 + Math.random() * 70;
    const y = 15 + Math.random() * 70;
    const type = trialsRef.current[trialIndexRef.current];

    setTarget({ type, x, y });
    stimOnRef.current  = true;
    stimStartRef.current = Date.now();

    stepTimerRef.current = setTimeout(resolveRound, RESPONSE_WINDOW);
  };

  const resolveRound = () => {
    if (respondedRef.current) return;
    
    const current = target;
    const type = trialsRef.current[trialIndexRef.current];
    
    stimOnRef.current = false;
    setTarget(null);

    if (type === 'go') {
      resultsRef.current.push({
        trial: trialIndexRef.current, type, rt: null,
        correct: false, commission: false, omission: true, ts: Date.now(),
      });
      if (current) triggerFeedback('wrong', current.x, current.y);
    } else {
      resultsRef.current.push({
        trial: trialIndexRef.current, type, rt: null,
        correct: true, commission: false, omission: false, ts: Date.now(),
      });
    }

    trialIndexRef.current++;
    setTrialDisplay(trialIndexRef.current);
    stepTimerRef.current = setTimeout(scheduleNextTrial, 300);
  };

  const handleBallClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!stimOnRef.current || respondedRef.current || !target) return;
    
    respondedRef.current = true;
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);

    const rt = Date.now() - stimStartRef.current;
    const type = target.type;

    if (type === 'go') {
      resultsRef.current.push({
        trial: trialIndexRef.current, type, rt,
        correct: true, commission: false, omission: false, ts: Date.now(),
      });
      triggerFeedback('correct', target.x, target.y);
      sounds.playSuccess();
    } else {
      resultsRef.current.push({
        trial: trialIndexRef.current, type, rt,
        correct: false, commission: true, omission: false, ts: Date.now(),
      });
      triggerFeedback('wrong', target.x, target.y);
      sounds.playError();
    }

    stimOnRef.current = false;
    setTarget(null);
    trialIndexRef.current++;
    setTrialDisplay(trialIndexRef.current);
    stepTimerRef.current = setTimeout(scheduleNextTrial, 300);
  };

  const triggerFeedback = (type: 'correct' | 'wrong', x: number, y: number) => {
    setShowFeedback({ type, x, y });
    setTimeout(() => setShowFeedback(null), 500);
  };

  const startGame = () => {
    trialsRef.current     = buildTrials(EXPECTED_TRIALS);
    trialIndexRef.current = 0;
    resultsRef.current    = [];
    gameStartRef.current  = Date.now();
    setTimeLeft(TOTAL_DURATION_MS);
    setTrialDisplay(0);
    setPhase('playing');
    setTimeout(scheduleNextTrial, 500);
  };

  const endGame = () => {
    if (phaseRef.current === 'outro') return;
    setPhase('outro');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (clockRef.current)    clearInterval(clockRef.current);

    const records = resultsRef.current;
    const rts = records.filter(r => r.rt !== null && r.type === 'go').map(r => r.rt as number);
    const commission = records.filter(r => r.commission).length;
    const omission = records.filter(r => r.omission).length;

    setTimeout(() => {
      onComplete({
        cognitive: 'impulsivity',
        gameId: 'go-no-go',
        durationMs: TOTAL_DURATION_MS - timeLeft,
        reactionTimeMs: rts,
        errorCount: commission + omission,
        totalActions: records.length,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: records.map(r => r.ts),
        panicClickCount: 0,
        rawData: {
          commissionErrors: commission,
          omissionErrors: omission,
          meanRT: Math.round(mean(rts)),
          accuracy: records.length > 0 ? ((records.filter(r => r.correct).length / records.length) * 100).toFixed(1) : '0',
        },
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0f1d] text-white font-sans rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl relative">
      <div className="flex items-center justify-between p-8 bg-white/[0.02] border-b border-white/5 relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-3xl border border-white/10">
            {assignment.theme.emoji}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white/90">{assignment.gameName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Inhibitory Precision Active</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {phase === 'playing' && <GameTimer durationMs={TOTAL_DURATION_MS} timeLeftMs={timeLeft} />}
          <button onClick={onExit} className="px-8 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/40 text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">Exit</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1)_0%,transparent_100%)]">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-card p-12 rounded-[3.5rem] max-w-xl border border-white/10 shadow-3xl bg-white/[0.03] backdrop-blur-3xl relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-[1.5rem] bg-violet-600 flex items-center justify-center text-4xl shadow-2xl shadow-violet-500/40 animate-pulse border-2 border-white/20">🎯</div>
                <h3 className="text-4xl font-black mb-8 mt-6 bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">Impulsivity Probe</h3>
                <div className="space-y-6 text-white/60 font-semibold leading-relaxed text-sm">
                  <p>A high-velocity sequence of randomized behavioral signals will be projected across the spatial interface.</p>
                  <div className="grid grid-cols-2 gap-6 mt-10">
                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 backdrop-blur-xl group hover:bg-emerald-500/10 transition-all cursor-default">
                      <div className="text-3xl mb-3 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">🟢</div>
                      <div className="text-[10px] uppercase font-black tracking-[0.2em] text-emerald-400 mb-1">Go Signal</div>
                      <div className="text-[9px] opacity-70">TARGET & CLICK</div>
                    </div>
                    <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/20 backdrop-blur-xl group hover:bg-rose-500/10 transition-all cursor-default">
                      <div className="text-3xl mb-3 drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">🔴</div>
                      <div className="text-[10px] uppercase font-black tracking-[0.2em] text-rose-400 mb-1">No-Go Signal</div>
                      <div className="text-[9px] opacity-70">SUPPRESS ACTION</div>
                    </div>
                  </div>
                </div>
                <button onClick={startGame} className="w-full mt-12 py-7 rounded-[2rem] bg-violet-600 hover:bg-violet-500 text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all transform hover:scale-[1.03] active:scale-95 shadow-[0_20px_40px_-15px_rgba(124,58,237,0.5)] border border-white/20">Initiate Neural Sync</button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="absolute inset-0">
              {target && (
                <motion.div
                  key={`${trialDisplay}-${target.x}-${target.y}`}
                  initial={{ scale: 0, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  onPointerDown={handleBallClick}
                  className={`absolute w-32 h-32 rounded-full cursor-pointer flex items-center justify-center group pointer-events-auto`}
                  style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-30 ${target.type === 'go' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div className={`w-full h-full rounded-full border-[6px] border-white/20 shadow-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-90 ${target.type === 'go' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/60' : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/60'}`}>
                    <div className="w-1/2 h-1/2 rounded-full bg-white/30 blur-md animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4)_0%,transparent_60%)]" />
                  </div>
                </motion.div>
              )}

              {showFeedback && (
                <motion.div
                  key={`feedback-${showFeedback.x}-${showFeedback.y}`}
                  initial={{ opacity: 0, scale: 0.5, y: 0 }}
                  animate={{ opacity: 1, scale: 2, y: -80 }}
                  exit={{ opacity: 0 }}
                  className="absolute pointer-events-none z-50"
                  style={{ left: `${showFeedback.x}%`, top: `${showFeedback.y}%` }}
                >
                  <div className={`font-black text-3xl uppercase italic tracking-tighter drop-shadow-2xl ${showFeedback.type === 'correct' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {showFeedback.type === 'correct' ? 'PERFECT' : 'MISS!'}
                  </div>
                </motion.div>
              )}

              <div className="absolute bottom-8 right-8 flex flex-col items-end gap-1 opacity-20 group">
                <div className="text-[10px] font-black uppercase tracking-widest">Progress Trace</div>
                <div className="text-4xl font-black italic">{trialDisplay} <span className="text-xl opacity-30">/ {trialsRef.current.length}</span></div>
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-[8px] border-violet-500/10 border-t-violet-500 animate-[spin_1.5s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-violet-500/10 animate-pulse" />
                </div>
              </div>
              <h3 className="mt-10 text-3xl font-black text-white/90 tracking-[0.3em] uppercase animate-pulse">Analyzing Latency</h3>
              <p className="text-white/30 text-[10px] uppercase font-bold mt-4 tracking-widest">Compiling Inhibitory Metrics...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}