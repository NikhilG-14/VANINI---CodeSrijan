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

// Expected trials = floor(60 000 / avg_cycle)
// avg_cycle = STIM_DURATION + avg(ISI) = 700 + 1000 = 1700 ms → ~35 cycles
// With ISI jitter and 300 ms post-response pause the real count is ~48-52.
const AVG_CYCLE_MS = STIM_DURATION_MS + (ISI_MIN + ISI_MAX) / 2;
const EXPECTED_TRIALS   = Math.floor(TOTAL_DURATION_MS / AVG_CYCLE_MS); // ≈ 35

interface TrialRecord {
  trial: number;
  type: 'go' | 'nogo';
  rt: number | null;          // ms, null = no response
  correct: boolean;
  commission: boolean;        // responded to No-Go
  omission: boolean;          // missed Go
  ts: number;                 // epoch timestamp of response
}

// Build a deterministic, shuffled trial list so ratio is always exact.
function buildTrials(n: number): Array<'go' | 'nogo'> {
  const goCount   = Math.round(n * GO_RATIO);
  const nogoCount = n - goCount;
  const t: Array<'go' | 'nogo'> = [
    ...Array(goCount).fill('go'),
    ...Array(nogoCount).fill('nogo'),
  ];
  // Fisher-Yates shuffle
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function stddev(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

export default function GoNoGoGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft]   = useState(TOTAL_DURATION_MS);
  const [targetType, setTargetType] = useState<'go' | 'nogo' | null>(null);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [trialDisplay, setTrialDisplay] = useState(0);

  // All mutable game state lives in refs to avoid stale-closure bugs.
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

  // Keep phaseRef in sync with state so callbacks can read it without stale closure.
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ─── Clock ───────────────────────────────────────────────────────────────
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

  // ─── Trial sequencer ─────────────────────────────────────────────────────
  const scheduleNextTrial = () => {
    if (phaseRef.current !== 'playing') return;
    if (trialIndexRef.current >= trialsRef.current.length) { endGame(); return; }
    if (Date.now() - gameStartRef.current >= TOTAL_DURATION_MS) { endGame(); return; }

    stimOnRef.current   = false;
    respondedRef.current = false;
    setTargetType(null);

    // ISI with ±100 ms jitter
    const jitter = Math.random() * 200 - 100;
    const isi = Math.max(600, ISI_MIN + Math.random() * (ISI_MAX - ISI_MIN) + jitter);
    stepTimerRef.current = setTimeout(showStimulus, isi);
  };

  const showStimulus = () => {
    if (phaseRef.current !== 'playing') return;
    if (Date.now() - gameStartRef.current >= TOTAL_DURATION_MS) { endGame(); return; }

    const type = trialsRef.current[trialIndexRef.current];
    setTargetType(type);
    stimOnRef.current  = true;
    stimStartRef.current = Date.now();

    stepTimerRef.current = setTimeout(resolveRound, RESPONSE_WINDOW);
  };

  const resolveRound = () => {
    stimOnRef.current = false;
    setTargetType(null);

    const type = trialsRef.current[trialIndexRef.current];

    if (!respondedRef.current) {
      if (type === 'go') {
        // Omission error — missed a Go
        resultsRef.current.push({
          trial: trialIndexRef.current, type, rt: null,
          correct: false, commission: false, omission: true, ts: Date.now(),
        });
        triggerFeedback('wrong');
      } else {
        // Correct rejection — held back on No-Go
        resultsRef.current.push({
          trial: trialIndexRef.current, type, rt: null,
          correct: true, commission: false, omission: false, ts: Date.now(),
        });
        triggerFeedback('correct');
      }
    }

    trialIndexRef.current++;
    setTrialDisplay(trialIndexRef.current);
    stepTimerRef.current = setTimeout(scheduleNextTrial, 300);
  };

  // ─── User response ────────────────────────────────────────────────────────
  const handleTap = () => {
    if (!stimOnRef.current || respondedRef.current) return;
    respondedRef.current = true;

    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);

    const rt   = Date.now() - stimStartRef.current;
    const type = trialsRef.current[trialIndexRef.current];

    if (type === 'go') {
      resultsRef.current.push({
        trial: trialIndexRef.current, type, rt,
        correct: true, commission: false, omission: false, ts: Date.now(),
      });
      triggerFeedback('correct');
      sounds.playSuccess();
    } else {
      // Commission error — tapped on No-Go
      resultsRef.current.push({
        trial: trialIndexRef.current, type, rt,
        correct: false, commission: true, omission: false, ts: Date.now(),
      });
      triggerFeedback('wrong');
      sounds.playError();
    }

    stimOnRef.current = false;
    setTargetType(null);
    trialIndexRef.current++;
    setTrialDisplay(trialIndexRef.current);
    stepTimerRef.current = setTimeout(scheduleNextTrial, 300);
  };

  // ─── Feedback flash ───────────────────────────────────────────────────────
  const triggerFeedback = (type: 'correct' | 'wrong') => {
    setShowFeedback(type);
    setTimeout(() => setShowFeedback(null), 350);
  };

  // ─── Start / End ──────────────────────────────────────────────────────────
  const startGame = () => {
    trialsRef.current     = buildTrials(EXPECTED_TRIALS);
    trialIndexRef.current = 0;
    resultsRef.current    = [];
    gameStartRef.current  = Date.now();
    setTimeLeft(TOTAL_DURATION_MS);
    setTrialDisplay(0);
    setPhase('playing');
    // scheduleNextTrial is called via the useEffect that watches phase
    setTimeout(scheduleNextTrial, 100);
  };

  const endGame = () => {
    if (phaseRef.current === 'outro') return;
    setPhase('outro');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (clockRef.current)    clearInterval(clockRef.current);

    const records   = resultsRef.current;
    const total     = records.length;
    const rts       = records.filter(r => r.rt !== null && r.type === 'go').map(r => r.rt as number);
    const commission = records.filter(r => r.commission).length;
    const omission   = records.filter(r => r.omission).length;
    const goCount    = records.filter(r => r.type === 'go').length;
    const nogoCount  = records.filter(r => r.type === 'nogo').length;

    setTimeout(() => {
      onComplete({
        cognitive: 'impulsivity',
        gameId: 'go-no-go',
        durationMs: TOTAL_DURATION_MS - timeLeft,
        reactionTimeMs: rts,
        errorCount: commission + omission,
        totalActions: total,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: records.map(r => r.ts),
        panicClickCount: 0,
        rawData: {
          commissionErrors: commission,
          omissionErrors:   omission,
          totalGoTrials:    goCount,
          totalNoGoTrials:  nogoCount,
          totalTrials:      total,
          meanRT:           Math.round(mean(rts)),
          stddevRT:         Math.round(stddev(rts)),
          accuracy:         total > 0 ? ((records.filter(r => r.correct).length / total) * 100).toFixed(1) : '0',
          impulsivityScore: total > 0 ? (commission / total).toFixed(3) : '0',
          inhibitoryScore:  total > 0 ? (1 - commission / total).toFixed(3) : '1',
          goRatio:          total > 0 ? (goCount / total).toFixed(2) : '0',
          nogoRatio:        total > 0 ? (nogoCount / total).toFixed(2) : '0',
        },
      });
    }, 1500);
  };

  // ─── Keyboard support ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'playing') { e.preventDefault(); handleTap(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full w-full bg-slate-900/90 text-white font-sans rounded-2xl overflow-hidden backdrop-blur-2xl border border-white/10 shadow-2xl relative"
      onClick={handleTap}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-black/20 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{assignment.theme.emoji}</span>
          <div>
            <h2 className="text-lg font-bold tracking-wide">{assignment.gameName}</h2>
            <p className="text-xs text-white/50">{assignment.theme.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {phase === 'playing' && (
            <GameTimer durationMs={TOTAL_DURATION_MS} timeLeftMs={timeLeft} />
          )}
          <button
            onClick={e => { e.stopPropagation(); onExit(); }}
            className="px-14 py-3 min-w-[150px] flex items-center justify-center bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/40 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Trial progress bar */}
      {phase === 'playing' && (
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-green-500/60 transition-all duration-300"
            style={{ width: `${(trialDisplay / trialsRef.current.length) * 100}%` }}
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">

          {/* ── Intro ── */}
          {phase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="max-w-md text-center space-y-6"
            >
              <div className="text-5xl">{assignment.theme.emoji}</div>
              <h3 className="text-2xl font-bold">Inhibitory Control</h3>
              <div className="text-white/70 space-y-2">
                <p>When you see a <span className="font-bold text-green-400">Green Circle</span>, tap anywhere.</p>
                <p>When you see a <span className="font-bold text-red-400">Red Circle</span>, do NOT tap.</p>
                <p className="text-sm text-white/40">~{EXPECTED_TRIALS} trials · 60 seconds · 70% green / 30% red</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); startGame(); }}
                className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 font-bold transition-all z-10 relative"
              >
                Start Challenge
              </button>
            </motion.div>
          )}

          {/* ── Playing ── */}
          {phase === 'playing' && (
            <motion.div key="playing" className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer">

              {/* Stimulus */}
              {targetType === 'go' && (
                <motion.div
                  key="go-stim"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="w-32 h-32 rounded-full bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.5)]"
                />
              )}
              {targetType === 'nogo' && (
                <motion.div
                  key="nogo-stim"
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="w-32 h-32 rounded-full bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]"
                />
              )}

              {/* Feedback overlays */}
              {showFeedback === 'wrong' && (
                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-1/4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 text-2xl font-bold">✕</div>
                  <div className="text-red-500 font-black text-2xl tracking-tighter uppercase italic">Ouch!</div>
                </motion.div>
              )}
              {showFeedback === 'correct' && (
                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-1/4 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-2xl font-bold">✓</div>
                  <div className="text-emerald-500 font-black text-2xl tracking-tighter uppercase italic">Perfect!</div>
                </motion.div>
              )}

              {/* Trial counter */}
              <div className="absolute bottom-4 text-xs text-white/30">
                Trial {trialDisplay} / {trialsRef.current.length}
              </div>
            </motion.div>
          )}

          {/* ── Outro ── */}
          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <h3 className="text-3xl font-bold mb-2">Analyzing Impulsivity...</h3>
              <p className="text-white/60">Calculating commission and omission error rates.</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}