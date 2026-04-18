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

const COLORS = [
  { name: 'RED', hex: '#FF0055' },
  { name: 'BLUE', hex: '#00D4FF' },
  { name: 'GREEN', hex: '#00FF9F' },
  { name: 'YELLOW', hex: '#FBFF00' }
];

export default function StroopGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  const trials = useRef(0);
  const errors = useRef(0);
  const correct = useRef(0);
  const incongruentRTs = useRef<number[]>([]);
  const congruentRTs = useRef<number[]>([]);

  const [currentWord, setCurrentWord] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  const [isCongruent, setIsCongruent] = useState(true);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const stimulusStartTime = useRef(0);

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

  const generateStimulus = () => {
    const wordKey = COLORS[Math.floor(Math.random() * COLORS.length)];
    const roll = Math.random();
    const congruent = roll > 0.5;

    setIsCongruent(congruent);
    setCurrentWord(wordKey.name);

    if (congruent) {
      setCurrentColor(wordKey.hex);
    } else {
      const otherColors = COLORS.filter(c => c.name !== wordKey.name);
      setCurrentColor(otherColors[Math.floor(Math.random() * otherColors.length)].hex);
    }
    stimulusStartTime.current = Date.now();
  };

  const handleSelection = (hex: string) => {
    if (phase !== 'playing') return;

    const rt = Date.now() - stimulusStartTime.current;
    trials.current++;

    // Always push RT to ensure "Mean LT" is calculated from total effort
    if (isCongruent) congruentRTs.current.push(rt);
    else incongruentRTs.current.push(rt);

    if (hex === currentColor) {
      correct.current++;
      sounds.playSuccess();
      setFeedback('correct');
    } else {
      errors.current++;
      sounds.playError();
      setFeedback('wrong');
    }

    setTimeout(() => setFeedback(null), 400);
    generateStimulus();
  };

  const startGame = () => {
    setPhase('playing');
    generateStimulus();
  };

  const endGame = () => {
    setPhase('outro');
    setTimeout(() => {
      const avgCon = congruentRTs.current.length ? congruentRTs.current.reduce((a, b) => a + b, 0) / congruentRTs.current.length : 0;
      const avgIncon = incongruentRTs.current.length ? incongruentRTs.current.reduce((a, b) => a + b, 0) / incongruentRTs.current.length : 0;

      onComplete({
        cognitive: 'attention',
        gameId: 'stroop',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: [...congruentRTs.current, ...incongruentRTs.current],
        errorCount: errors.current,
        totalActions: trials.current,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          congruentRT: avgCon,
          incongruentRT: avgIncon,
          accuracy: trials.current > 0 ? correct.current / trials.current : 0
        }
      });
    }, 1500);
  };

  return (
    <MiniGameChrome
      assignment={assignment}
      phase={phase}
      timeLeftMs={timeLeft}
      onExit={onExit}
      bgImage="/backgrounds/cabin.jpg"
      variant="cabin"
      status="Focus Booster"
    >
      <div className="w-full h-full relative">
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.div key="intro" className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="bg-black p-16 md:p-20 rounded-[4rem] max-w-2xl border border-white/10 shadow-3xl flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  className="w-24 h-24 rounded-3xl bg-amber-500 flex items-center justify-center text-5xl shadow-xl border-2 border-white/20 mb-10"
                >
                  🎨
                </motion.div>

                <h3 className="text-5xl kaboom-text mb-6">The Color Challenge</h3>

                <div className="space-y-6 text-white/90 font-medium leading-relaxed">
                  <p className="text-lg px-4 opacity-90">Stay focused on the <span className="text-amber-400 font-extrabold">paint</span>, not the word.</p>

                  <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 mt-4 text-center">
                    <div className="text-[10px] uppercase font-black tracking-[0.4em] text-amber-500 mb-3">Protocol</div>
                    <p className="text-2xl text-white font-black uppercase tracking-tight">Pick the <span className="text-amber-400 underline underline-offset-8 decoration-4">COLOR</span> of the word</p>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full mt-10 py-7 rounded-3xl bg-amber-600 hover:bg-amber-400 text-white font-black text-sm uppercase tracking-[0.4em] transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl border border-white/20"
                >
                  Initiate Sequence
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="absolute inset-0 flex flex-col items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="relative mb-24 flex flex-col items-center justify-center min-h-[220px]">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={currentWord + currentColor}
                    initial={{ scale: 0.8, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.1, opacity: 0, filter: 'blur(15px)' }}
                    className="text-[11vw] font-black uppercase tracking-[-0.03em] text-center cursor-default select-none transition-all"
                    style={{
                      color: currentColor,
                      textShadow: `0 0 50px ${currentColor}AA, 0 0 100px ${currentColor}33`,
                      lineHeight: 0.8
                    }}
                  >
                    {currentWord}
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                  {feedback && (
                    <motion.div
                      key="feedback"
                      initial={{ opacity: 0, y: 0, scale: 0.5 }}
                      animate={{ opacity: 1, y: -100, scale: 1.5 }}
                      exit={{ opacity: 0, scale: 2 }}
                      className={`absolute font-black text-4xl uppercase italic tracking-tighter ${feedback === 'correct' ? 'text-green-400' : 'text-red-500'}`}
                      style={{ textShadow: feedback === 'correct' ? '0 0 40px #4ade80' : '0 0 40px #ef4444' }}
                    >
                      {feedback === 'correct' ? 'PERFECT' : 'MISS!'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-5xl">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => handleSelection(c.hex)}
                    className="relative group h-28 rounded-[2rem] p-1 flex items-center justify-center transition-all active:scale-90 overflow-hidden border border-white/10 bg-black/40 hover:bg-black/60 shadow-2xl"
                  >
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10 group-hover:bg-white/30 transition-colors" />
                    <div className="relative text-sm font-black uppercase tracking-[0.3em] transition-colors" style={{ color: c.hex, textShadow: `0 0 15px ${c.hex}66` }}>
                      {c.name}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-black/80 backdrop-blur-3xl p-16 rounded-[4rem] flex flex-col items-center border border-white/10 shadow-3xl text-center">
                <div className="relative mb-12">
                  <div className="w-24 h-24 rounded-full border-[8px] border-amber-500/10 border-t-amber-500 animate-[spin_1s_linear_infinite]" />
                </div>
                <h3 className="text-4xl kaboom-text">Mission Complete</h3>
                <p className="text-white/40 uppercase font-black text-xs tracking-[0.4em] mt-6">Analyzing focus metrics...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameChrome>
  );
}
