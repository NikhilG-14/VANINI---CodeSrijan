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

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'YELLOW', hex: '#eab308' }
];

export default function StroopGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  const [trials, setTrials] = useState(0);
  const [errors, setErrors] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incongruentRTs, setIncongruentRTs] = useState<number[]>([]);
  const [congruentRTs, setCongruentRTs] = useState<number[]>([]);

  const [currentWord, setCurrentWord] = useState('');
  const [currentColor, setCurrentColor] = useState('');
  const [isCongruent, setIsCongruent] = useState(true);

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

  const startGame = () => {
    setPhase('playing');
    generateStimulus();
  };

  const endGame = () => {
    setPhase('outro');
    setTimeout(() => {
      const avgCon = congruentRTs.length ? congruentRTs.reduce((a,b)=>a+b,0)/congruentRTs.length : 0;
      const avgIncon = incongruentRTs.length ? incongruentRTs.reduce((a,b)=>a+b,0)/incongruentRTs.length : 0;

      onComplete({
        cognitive: 'attention',
        gameId: 'stroop',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: [...congruentRTs, ...incongruentRTs],
        errorCount: errors,
        totalActions: trials,
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
          accuracy: trials > 0 ? correct / trials : 0
        }
      });
    }, 1500);
  };

  const handleSelection = (hex: string) => {
    const rt = Date.now() - stimulusStartTime.current;
    
    if (hex === currentColor) {
      setCorrect(c => c + 1);
    } else {
      setErrors(e => e + 1);
    }

    if (isCongruent) setCongruentRTs(prev => [...prev, rt]);
    else setIncongruentRTs(prev => [...prev, rt]);

    setTrials(t => t + 1);
    generateStimulus();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/90 text-white font-sans rounded-[2.5rem] overflow-hidden backdrop-blur-2xl border border-white/10 shadow-2xl relative">
      {/* Header */}
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

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md text-center space-y-6">
              <div className="text-5xl">{assignment.theme.emoji}</div>
              <h3 className="text-2xl font-bold">Stroop Test</h3>
              <p className="text-white/70">Select the <span className="font-bold text-white">COLOR of the ink</span>, NOT the word itself. Go as fast as possible.</p>
              <button onClick={startGame} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-all text-shadow">
                Start Challenge
              </button>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="w-full max-w-xl flex flex-col items-center justify-center gap-12">
              <div 
                className="text-7xl font-black uppercase tracking-widest text-center"
                style={{ color: currentColor, textShadow: '0 0 30px rgba(255,255,255,0.1)' }}
              >
                {currentWord}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => handleSelection(c.hex)}
                    className="h-24 rounded-2xl flex items-center justify-center font-bold text-xl uppercase transition-all active:scale-95 border-2 border-white/20 hover:border-white/50"
                    style={{ backgroundColor: `${c.hex}33`, color: c.hex }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <h3 className="text-3xl font-bold mb-2">Analyzing Focus...</h3>
              <p className="text-white/60">Processing reaction interference pattern.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
