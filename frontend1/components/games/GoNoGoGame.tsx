'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniGameChrome } from './MiniGameChrome';
import { sounds } from '@/lib/soundEffects';
import type { GameResult, GameAssignment } from '@/lib/types';

interface Props {
  assignment: GameAssignment;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

// --- Constants (edit here to tune the task) ---
const TOTAL_DURATION_MS = 60_000;   // 60-second session
const GO_RATIO = 0.70;     // 70% Go trials
const STIM_DURATION_MS = 700;      // stimulus visible for 700 ms
const RESPONSE_WINDOW = 1_000;    // total window to respond (ms)
const ISI_MIN = 800;      // inter-stimulus interval min (ms)
const ISI_MAX = 1_200;    // inter-stimulus interval max (ms)

const AVG_CYCLE_MS = STIM_DURATION_MS + (ISI_MIN + ISI_MAX) / 2;
const EXPECTED_TRIALS = Math.floor(TOTAL_DURATION_MS / AVG_CYCLE_MS); // ≈ 35

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
  const goCount = Math.round(n * GO_RATIO);
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
  const [timeLeft, setTimeLeft] = useState(TOTAL_DURATION_MS);
  const [target, setTarget] = useState<{ type: 'go' | 'nogo', x: number, y: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ type: 'correct' | 'wrong', x: number, y: number } | null>(null);
  const [trialDisplay, setTrialDisplay] = useState(0);

  const trialsRef = useRef<Array<'go' | 'nogo'>>([]);
  const trialIndexRef = useRef(0);
  const resultsRef = useRef<TrialRecord[]>([]);
  const stimOnRef = useRef(false);
  const respondedRef = useRef(false);
  const stimStartRef = useRef(0);
  const gameStartRef = useRef(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef<'intro' | 'playing' | 'outro'>('intro');

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

    stimOnRef.current = false;
    respondedRef.current = false;
    setTarget(null);

    const isi = ISI_MIN + Math.random() * (ISI_MAX - ISI_MIN);
    stepTimerRef.current = setTimeout(showStimulus, isi);
  };

  const showStimulus = () => {
    if (phaseRef.current !== 'playing') return;

    const x = 20 + Math.random() * 60;
    const y = 20 + Math.random() * 60;
    const type = trialsRef.current[trialIndexRef.current];

    setTarget({ type, x, y });
    stimOnRef.current = true;
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
    trialsRef.current = buildTrials(EXPECTED_TRIALS);
    trialIndexRef.current = 0;
    resultsRef.current = [];
    gameStartRef.current = Date.now();
    setTimeLeft(TOTAL_DURATION_MS);
    setTrialDisplay(0);
    setPhase('playing');
    setTimeout(scheduleNextTrial, 500);
  };

  const endGame = () => {
    if (phaseRef.current === 'outro') return;
    setPhase('outro');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (clockRef.current) clearInterval(clockRef.current);

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
    <MiniGameChrome
      assignment={assignment}
      phase={phase}
      timeLeftMs={timeLeft}
      onExit={onExit}
      bgImage="/backgrounds/memory.jpg"
      variant="cabin"
      status="Reflex Check"
      durationMs={TOTAL_DURATION_MS}
    >
      <div className="w-full h-full relative">
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.div key="intro" className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="bg-black p-16 md:p-20 rounded-[4rem] max-w-2xl border border-white/10 shadow-3xl flex flex-col items-center">
                <div className="w-20 h-20 rounded-2xl bg-violet-600 flex items-center justify-center text-5xl shadow-xl border-2 border-white/20 mb-10 transform rotate-[8deg]">
                  {assignment.theme.emoji}
                </div>

                <h3 className="text-5xl kaboom-text mb-8">Reflex Control</h3>

                <div className="space-y-6 text-white/90 font-medium leading-relaxed">
                  <p className="text-lg opacity-90 px-4">React fast but stay in control! Circles will blink randomly.</p>
                  <div className="grid grid-cols-2 gap-8 mt-10">
                    <div className="p-8 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl">
                      <div className="text-4xl mb-4">🟢</div>
                      <div className="text-[10px] uppercase font-black tracking-[0.3em] text-emerald-400 mb-2">TARGET</div>
                      <div className="text-[11px] font-black uppercase text-white tracking-widest">TAP FAST!</div>
                    </div>
                    <div className="p-8 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/30 backdrop-blur-xl">
                      <div className="text-4xl mb-4">🔴</div>
                      <div className="text-[10px] uppercase font-black tracking-[0.3em] text-rose-400 mb-2">STOP</div>
                      <div className="text-[11px] font-black uppercase text-white tracking-widest">DON'T TOUCH!</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full mt-10 py-7 rounded-3xl bg-violet-600 hover:bg-violet-400 text-white font-black text-sm uppercase tracking-[0.4em] transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl border border-white/20"
                >
                  Initiate Training
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {target && (
                <motion.div
                  key={`${trialDisplay}-${target.x}-${target.y}`}
                  initial={{ scale: 0, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                  onPointerDown={handleBallClick}
                  className={`absolute w-40 h-40 rounded-full cursor-pointer flex items-center justify-center group pointer-events-auto`}
                  style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={`absolute inset-0 rounded-full animate-ping opacity-60 ${target.type === 'go' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                  <div className={`w-full h-full rounded-full border-[8px] border-white/40 shadow-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-90 ${target.type === 'go' ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-400 via-red-500 to-red-600'}`}>
                    <div className="w-1/2 h-1/2 rounded-full bg-white/50 blur-xl animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.6)_0%,transparent_70%)]" />
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {showFeedback && (
                  <motion.div
                    key={`feedback-${showFeedback.x}-${showFeedback.y}`}
                    initial={{ opacity: 0, scale: 0.5, y: 0 }}
                    animate={{ opacity: 1, scale: 2, y: -120 }}
                    exit={{ opacity: 0, scale: 2.5 }}
                    className="absolute pointer-events-none z-50 flex flex-col items-center"
                    style={{ left: `${showFeedback.x}%`, top: `${showFeedback.y}%` }}
                  >
                    <div className={`font-black text-5xl uppercase italic tracking-tighter drop-shadow-[0_0_30px_rgba(0,0,0,0.6)] ${showFeedback.type === 'correct' ? 'text-emerald-400' : 'text-red-500'}`} style={{ textShadow: showFeedback.type === 'correct' ? '0 0 30px #4ade80' : '0 0 30px #ef4444' }}>
                      {showFeedback.type === 'correct' ? 'PERFECT' : 'MISS!'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="absolute bottom-12 right-12 flex flex-col items-end gap-1 opacity-20 transform skew-x-[-10deg]">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Progress Trace</div>
                <div className="text-5xl font-black italic text-white">{trialDisplay} <span className="text-2xl opacity-40">/ {trialsRef.current.length}</span></div>
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-black/80 backdrop-blur-3xl p-16 rounded-[4rem] border border-white/10 shadow-3xl text-center flex flex-col items-center">
                <div className="relative mb-12">
                  <div className="w-24 h-24 rounded-full border-[8px] border-violet-500/10 border-t-violet-500 animate-[spin_1s_linear_infinite]" />
                </div>
                <h3 className="text-4xl kaboom-text mb-4">Phase Complete</h3>
                <p className="text-white/40 uppercase font-black text-[10px] tracking-[0.4em] mt-6">Optimizing reflex precision profile...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameChrome>
  );
}