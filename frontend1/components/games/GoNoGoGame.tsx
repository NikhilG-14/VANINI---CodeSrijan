'use client';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameTimer } from './GameTimer';
import type { GameResult, GameAssignment } from '@/lib/types';

interface Props {
  assignment: GameAssignment;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

export default function GoNoGoGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  const [trials, setTrials] = useState(0);
  const [commissionErrors, setCommissionErrors] = useState(0); // Tapped on No-Go
  const [omissionErrors, setOmissionErrors] = useState(0); // Missed a Go
  const [targetType, setTargetType] = useState<'go' | 'nogo' | null>(null);
  
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  const activeStimulus = useRef(false);
  const userActed = useRef(false);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          endGame();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const triggerNextRound = () => {
    setTargetType(null); // Blank screen
    activeStimulus.current = false;
    userActed.current = false;

    // Wait between 0.5s - 1.5s before showing stimulus
    const delay = 500 + Math.random() * 1000;
    stepTimerRef.current = setTimeout(() => {
      // 70% Go (Green), 30% No-Go (Red)
      const isGo = Math.random() < 0.7;
      setTargetType(isGo ? 'go' : 'nogo');
      activeStimulus.current = true;

      // They have 1000ms to react
      stepTimerRef.current = setTimeout(resolveRound, 1000);
    }, delay);
  };

  const resolveRound = () => {
    if (phase !== 'playing') return;
    
    setTrials(t => t + 1);

    if (activeStimulus.current) {
      if (!userActed.current && targetType === 'go') {
        // Missed a Go (Omission error)
        setOmissionErrors(e => e + 1);
        triggerFeedback('wrong');
      } else if (!userActed.current && targetType === 'nogo') {
        // Correct Rejection
        triggerFeedback('correct');
      }
    }
    
    triggerNextRound();
  };

  const triggerFeedback = (type: 'correct' | 'wrong') => {
    setShowFeedback(type);
    setTimeout(() => setShowFeedback(null), 300);
  };

  const handleTap = () => {
    if (!activeStimulus.current) return; // Don't penalize early taps for now to keep it simple
    if (userActed.current) return; // Already acted this round
    
    userActed.current = true;
    
    if (targetType === 'go') {
      // Hit (Correct)
      triggerFeedback('correct');
    } else if (targetType === 'nogo') {
      // Commission error (Tapped on No-go)
      setCommissionErrors(e => e + 1);
      triggerFeedback('wrong');
    }
  };

  const startGame = () => {
    setPhase('playing');
    triggerNextRound();
  };

  const endGame = () => {
    setPhase('outro');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    
    setTimeout(() => {
      onComplete({
        cognitive: 'impulsivity',
        gameId: 'go-no-go',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: [],
        errorCount: commissionErrors + omissionErrors,
        totalActions: trials,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          commissionErrors,
          omissionErrors
        }
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/90 text-white font-sans rounded-[2.5rem] overflow-hidden backdrop-blur-2xl border border-white/10 shadow-2xl relative" onClick={handleTap}>
      <div className="flex items-center justify-between p-6 bg-black/20 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{assignment.theme.emoji}</span>
          <div>
            <h2 className="text-lg font-bold tracking-wide">{assignment.gameName}</h2>
            <p className="text-xs text-white/50">{assignment.theme.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {phase === 'playing' && <GameTimer durationMs={assignment.durationMs} timeLeftMs={timeLeft} />}
          <button onClick={e => { e.stopPropagation(); onExit(); }} className="p-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/40 transition-colors">
            Exit
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md text-center space-y-6">
              <div className="text-5xl">{assignment.theme.emoji}</div>
              <h3 className="text-2xl font-bold">Inhibitory Control</h3>
              <div className="text-white/70 space-y-2">
                <p>When you see a <span className="font-bold text-green-400">Green Circle</span>, tap anywhere.</p>
                <p>When you see a <span className="font-bold text-red-400">Red Circle</span>, do NOT tap.</p>
                <p>React as quickly as possible!</p>
              </div>
              <button onClick={e => { e.stopPropagation(); startGame(); }} className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold transition-all text-shadow z-10 relative">
                Start Challenge
              </button>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="w-full h-full flex flex-col items-center justify-center relative cursor-pointer">
              {targetType === 'go' && (
                <div className="w-32 h-32 rounded-full bg-green-500 shadow-[0_0_50px_rgba(34,197,94,0.6)]" />
              )}
              {targetType === 'nogo' && (
                <div className="w-32 h-32 rounded-full bg-red-500 shadow-[0_0_50px_rgba(239,68,68,0.6)]" />
              )}
              
              {showFeedback === 'wrong' && (
                <div className="absolute top-1/4 text-red-500 font-black text-2xl animate-pulse">Miss / Wrong!</div>
              )}
            </motion.div>
          )}

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
