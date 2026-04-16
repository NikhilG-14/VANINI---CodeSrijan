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

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'H', 'K', 'L', 'M', 'O', 'P', 'R', 'S', 'T'];

export default function NBackGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  const [sequence, setSequence] = useState<string[]>([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(-1);
  const [responses, setResponses] = useState<'hit' | 'miss' | 'false_alarm' | 'correct_rejection'[]>([]);
  
  const [hits, setHits] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);

  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const N = 2; // Fixed 2-back for this implementation

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

  const generateNextLetter = () => {
    setSequence(prev => {
      // 30% chance to force a match (N steps back)
      const forceMatch = Math.random() < 0.30 && prev.length >= N;
      let nextLetter = '';
      
      if (forceMatch) {
        nextLetter = prev[prev.length - N];
      } else {
        do {
          nextLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        } while (prev.length >= N && nextLetter === prev[prev.length - N]);
      }
      
      setCurrentLetterIndex(prev.length);
      return [...prev, nextLetter];
    });
  };

  useEffect(() => {
    if (phase === 'playing' && currentLetterIndex >= 0) {
      stepTimerRef.current = setTimeout(() => {
        // Automatic advance after 2 seconds
        setShowFeedback(null);
        generateNextLetter();
      }, 2000);
    }
    return () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    };
  }, [currentLetterIndex, phase]);

  const startGame = () => {
    setPhase('playing');
    generateNextLetter();
  };

  const endGame = () => {
    setPhase('outro');
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    
    setTimeout(() => {
      // Accuracy = Hits / (Hits + Misses) theoretically, but we use a generic accuracy proxy here
      let expectedMatches = 0;
      for (let i = N; i < sequence.length; i++) {
        if (sequence[i] === sequence[i - N]) expectedMatches++;
      }
      const accuracy = expectedMatches === 0 ? 1 : Math.min(1, hits / expectedMatches);

      onComplete({
        cognitive: 'memory',
        gameId: 'n-back',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: [],
        errorCount: falseAlarms,
        totalActions: sequence.length,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          accuracy,
          falsePositives: falseAlarms,
          hits,
        }
      });
    }, 1500);
  };

  const handleMatchCall = () => {
    if (currentLetterIndex < N) {
      setFalseAlarms(f => f + 1);
      triggerFeedback('wrong');
      return;
    }

    const current = sequence[currentLetterIndex];
    const past = sequence[currentLetterIndex - N];

    if (current === past) {
      setHits(h => h + 1);
      triggerFeedback('correct');
    } else {
      setFalseAlarms(f => f + 1);
      triggerFeedback('wrong');
    }
  };

  const triggerFeedback = (type: 'correct' | 'wrong') => {
    setShowFeedback(type);
    setTimeout(() => setShowFeedback(null), 500); // clear feedback quickly
  };

  const currentLet = sequence[currentLetterIndex] || '';

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/90 text-white font-sans rounded-[2.5rem] overflow-hidden backdrop-blur-2xl border border-white/10 shadow-2xl relative">
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
          <button onClick={onExit} className="p-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/40 transition-colors">
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
              <p className="text-white/70">Letters will appear one by one. Tap the button <span className="font-bold text-white">ONLY IF</span> the current letter matches the letter you saw exactly <span className="font-bold text-violet-400">2 steps ago</span>.</p>
              <button onClick={startGame} className="w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold transition-all text-shadow">
                Start Challenge
              </button>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="w-full max-w-xl flex flex-col items-center justify-center gap-12">
              <div className="relative">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentLetterIndex}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                    transition={{ duration: 0.2 }}
                    className="text-8xl font-black uppercase text-white tracking-widest text-center"
                    style={{ textShadow: '0 0 40px rgba(139,92,246,0.3)' }}
                  >
                    {currentLet}
                  </motion.div>
                </AnimatePresence>
                
                {showFeedback && (
                  <div className={`absolute top-full mt-4 left-1/2 transform -translate-x-1/2 text-sm font-bold px-4 py-1 rounded-full ${showFeedback === 'correct' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {showFeedback === 'correct' ? 'Match!' : 'Incorrect'}
                  </div>
                )}
              </div>

              <div className="w-full pt-10">
                <button
                  onClick={handleMatchCall}
                  className="w-full py-6 rounded-2xl bg-white/5 border border-white/20 hover:bg-white/10 hover:border-violet-500 font-bold text-xl active:scale-95 transition-all text-violet-300"
                >
                  It's a Match (2 steps ago)
                </button>
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
