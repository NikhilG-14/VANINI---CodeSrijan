'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameTimer } from './GameTimer';
import { sounds } from '@/lib/soundEffects';
import type { GameResult, GameAssignment } from '@/lib/types';

interface Props {
  assignment: GameAssignment;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'H', 'K', 'L', 'M', 'O', 'P', 'R', 'S', 'T'];
const N = 2; // 2-back

export default function NBackGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  // UI state (for rendering only)
  const [displayLetter, setDisplayLetter] = useState('');
  const [letterKey, setLetterKey] = useState(0); // forces re-animation
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Telemetry refs — never stale inside closures
  const hits = useRef(0);
  const falseAlarms = useRef(0);
  const expectedMatches = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const totalSteps = useRef(0);

  // Game state refs — avoids closure staleness in setTimeout chains
  const sequenceRef = useRef<string[]>([]);
  const currentIndexRef = useRef(-1);
  const stimulusStartTime = useRef(0);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<'intro' | 'playing' | 'outro'>('intro');

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Timer countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          doEndGame();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Show next letter ──────────────────────────────────────────────────────
  const showNextLetter = useCallback(() => {
    if (phaseRef.current !== 'playing') return;

    // Generate next letter
    const seq = sequenceRef.current;
    const forceMatch = Math.random() < 0.30 && seq.length >= N;
    let nextLetter: string;

    if (forceMatch) {
      nextLetter = seq[seq.length - N];
    } else {
      do {
        nextLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      } while (seq.length >= N && nextLetter === seq[seq.length - N]);
    }

    seq.push(nextLetter);
    currentIndexRef.current = seq.length - 1;
    totalSteps.current++;

    // Track expected matches for accuracy calculation
    if (seq.length > N && nextLetter === seq[seq.length - 1 - N]) {
      expectedMatches.current++;
    }

    stimulusStartTime.current = Date.now();
    setDisplayLetter(nextLetter);
    setLetterKey(k => k + 1);
    setShowFeedback(null);

    // Difficulty: window shortens as hits increase, floor 1200ms
    const stepDuration = Math.max(1200, 2000 - (hits.current * 50));
    stepTimerRef.current = setTimeout(showNextLetter, stepDuration);
  }, []);

  const startGame = () => {
    sequenceRef.current = [];
    currentIndexRef.current = -1;
    hits.current = 0;
    falseAlarms.current = 0;
    expectedMatches.current = 0;
    totalSteps.current = 0;
    reactionTimes.current = [];
    setPhase('playing');
    // Small delay so phase state propagates before first letter
    setTimeout(showNextLetter, 300);
  };

  const doEndGame = useCallback(() => {
    if (phaseRef.current === 'outro') return; // prevent double-fire
    setPhase('outro');
    phaseRef.current = 'outro';
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);

    const exp = expectedMatches.current;
    const accuracy = exp === 0 ? 1 : Math.min(1, hits.current / exp);

    setTimeout(() => {
      onComplete({
        cognitive: 'memory',
        gameId: 'n-back',
        durationMs: assignment.durationMs,
        reactionTimeMs: reactionTimes.current,
        errorCount: falseAlarms.current,
        totalActions: totalSteps.current,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          accuracy,
          falsePositives: falseAlarms.current,
          hits: hits.current,
          expectedMatches: exp,
        }
      });
    }, 1000);
  }, [assignment.durationMs, onComplete]);

  // ── Response handler ──────────────────────────────────────────────────────
  const handleMatchCall = () => {
    if (phaseRef.current !== 'playing') return;

    const idx = currentIndexRef.current;
    const seq = sequenceRef.current;

    // Can't match until we have N prior letters
    if (idx < N) {
      falseAlarms.current++;
      setShowFeedback('wrong');
      sounds.playError();
      return;
    }

    const current = seq[idx];
    const past = seq[idx - N];
    const rt = Date.now() - stimulusStartTime.current;

    if (current === past) {
      hits.current++;
      reactionTimes.current.push(rt);
      setShowFeedback('correct');
      sounds.playSuccess();
    } else {
      falseAlarms.current++;
      reactionTimes.current.push(rt);
      setShowFeedback('wrong');
      sounds.playError();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/90 text-white font-sans rounded-2xl overflow-hidden backdrop-blur-2xl border border-white/10 shadow-2xl relative">
      <div className="flex items-center justify-between p-6 bg-black/20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{assignment.theme.emoji}</span>
          <div>
            <h2 className="text-lg font-bold tracking-wide">{assignment.gameName}</h2>
            <p className="text-xs text-white/50">{assignment.theme.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {phase === 'playing' && <GameTimer durationMs={assignment.durationMs} timeLeftMs={timeLeft} />}
          <button onClick={onExit} className="px-14 py-3 min-w-[150px] flex items-center justify-center bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/40 transition-colors">
            Exit
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md text-center space-y-6">
              <div className="text-5xl">{assignment.theme.emoji}</div>
              <h3 className="text-2xl font-bold">2-Back Memory Test</h3>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 text-left space-y-2">
                <p className="text-violet-300 font-bold text-sm">How to play:</p>
                <p className="text-white/70 text-sm">Letters appear one at a time. Press <span className="font-bold text-white">"It's a Match"</span> ONLY if the current letter is the <span className="font-bold text-violet-400">same as 2 letters ago</span>.</p>
                <p className="text-white/50 text-xs">Example: A → K → <span className="text-violet-400 font-bold">A</span> ← press here!</p>
              </div>
              <button onClick={startGame} className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold transition-all">
                Start Challenge
              </button>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="w-full max-w-xl flex flex-col items-center justify-center gap-12">
              <div className="relative flex flex-col items-center">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={letterKey}
                    initial={{ opacity: 0, scale: 0.4, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30, scale: 0.8, filter: 'blur(8px)' }}
                    transition={{ duration: 0.18, ease: 'backOut' }}
                    className="text-9xl font-black text-white tracking-widest"
                    style={{ textShadow: '0 0 60px rgba(139,92,246,0.5)' }}
                  >
                    {displayLetter}
                  </motion.div>
                </AnimatePresence>

                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 text-sm font-bold px-5 py-1.5 rounded-full ${showFeedback === 'correct' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                  >
                    {showFeedback === 'correct' ? '✓ Match!' : '✕ Not a match'}
                  </motion.div>
                )}
              </div>

              <div className="w-full text-center space-y-3">
                <p className="text-white/30 text-xs uppercase tracking-widest font-bold">
                  Does this match the letter from 2 steps ago?
                </p>
                <button
                  onClick={handleMatchCall}
                  className="w-full py-6 rounded-2xl bg-violet-600/20 border-2 border-violet-500/40 hover:bg-violet-600/40 hover:border-violet-400 font-black text-2xl active:scale-95 transition-all text-violet-300 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                >
                  ✓ It's a Match
                </button>
                <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
                  Say nothing if it's not a match — just wait
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <h3 className="text-3xl font-bold mb-2">Analyzing Memory...</h3>
              <p className="text-white/60">Evaluating working memory update capacity.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
