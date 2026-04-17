'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MiniGameChrome } from './MiniGameChrome';
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
    <MiniGameChrome
      assignment={assignment}
      phase={phase}
      timeLeftMs={timeLeft}
      onExit={onExit}
      bgImage="/backgrounds/memory.jpg"
      variant="cabin"
      status="Memory Trace"
    >
      <div className="w-full h-full relative flex flex-col items-center justify-center p-8">
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="max-w-xl text-center flex flex-col items-center">
              <div className="bg-black p-16 md:p-24 rounded-[4rem] border border-white/10 shadow-3xl flex flex-col items-center">
                <div className="w-24 h-24 rounded-3xl bg-violet-600 flex items-center justify-center text-5xl shadow-xl border-2 border-white/20 mb-10 transform rotate-[-6deg]">
                  {assignment.theme.emoji}
                </div>

                <h3 className="text-5xl kaboom-text mb-8">Memory Echoes</h3>

                <div className="bg-violet-500/10 border border-violet-500/20 rounded-[2.5rem] p-8 text-center space-y-4 mb-10 w-full">
                  <p className="text-white/90 text-lg leading-relaxed">Letters will flash fast. Click <span className="font-bold text-violet-300">Match!</span> ONLY if the letter is the <span className="font-bold text-violet-300">SAME</span> as 2 steps ago.</p>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-7 rounded-3xl bg-violet-600 hover:bg-violet-400 text-white font-black text-sm uppercase tracking-[0.4em] transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl border border-white/20"
                >
                  Start Mission
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="w-full max-w-2xl flex flex-col items-center justify-center gap-16" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="relative flex flex-col items-center h-64 justify-center">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={letterKey}
                    initial={{ opacity: 0, scale: 0.8, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
                    transition={{ duration: 0.2 }}
                    className="text-[14vw] font-black text-white tracking-widest select-none"
                    style={{
                      lineHeight: 0.7,
                      textShadow: '0 0 60px rgba(139,92,246,0.8)'
                    }}
                  >
                    {displayLetter}
                  </motion.div>
                </AnimatePresence>

                <div className="absolute -bottom-16 w-full flex items-center justify-center pointer-events-none">
                  <AnimatePresence>
                    {showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -60, scale: 1.5 }}
                        exit={{ opacity: 0, scale: 2 }}
                        className={`font-black uppercase tracking-tighter italic text-5xl ${showFeedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}
                        style={{ textShadow: showFeedback === 'correct' ? '0 0 40px #4ade80' : '0 0 40px #ef4444' }}
                      >
                        {showFeedback === 'correct' ? 'PERFECT' : 'MISS!'}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="w-full text-center space-y-10 flex flex-col items-center mt-12">
                <button
                  onClick={handleMatchCall}
                  className="w-full max-w-lg py-12 rounded-[4rem] bg-violet-600/50 border-t-2 border-white/20 hover:bg-violet-500/70 active:scale-90 transition-all font-black text-6xl text-white shadow-2xl uppercase tracking-[0.2em]"
                >
                  Match!
                </button>
                <div className="flex justify-center gap-4 opacity-10 mt-8">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-1.5 w-16 rounded-full bg-white" />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-black/80 backdrop-blur-3xl p-16 rounded-[4rem] border border-white/10 shadow-3xl">
              <div className="w-24 h-24 mb-10 mx-auto rounded-full border-[8px] border-violet-400/10 border-t-violet-400 animate-[spin_1s_linear_infinite]" />
              <h3 className="text-4xl kaboom-text">Phase Complete</h3>
              <p className="text-white/40 uppercase font-black text-[10px] tracking-[0.4em] mt-6">Decoding memory fragments...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameChrome>
  );
}
