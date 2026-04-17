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

const COLORS = [
  { name: 'RED', hex: '#f43f5e' },
  { name: 'BLUE', hex: '#0ea5e9' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'YELLOW', hex: '#eab308' }
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

    if (hex === currentColor) {
      correct.current++;
      if (isCongruent) congruentRTs.current.push(rt);
      else incongruentRTs.current.push(rt);
      sounds.playSuccess();
    } else {
      errors.current++;
      sounds.playError();
    }

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
    <div className="flex flex-col h-full w-full bg-[#0a0f1d] text-white font-sans rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl relative">
      <div className="flex items-center justify-between p-8 bg-white/[0.02] border-b border-white/5 relative z-20">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-3xl border border-white/10">
            {assignment.theme.emoji}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white/90">{assignment.gameName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Selective Attention Shield</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {phase === 'playing' && <GameTimer durationMs={assignment.durationMs} timeLeftMs={timeLeft} />}
          <button onClick={onExit} className="px-8 py-3 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/40 text-[10px] font-black uppercase tracking-widest transition-all border border-white/5">Exit</button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.1)_0%,transparent_100%)]">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-card p-12 rounded-[3.5rem] max-w-xl border border-white/10 shadow-3xl bg-white/[0.03] backdrop-blur-3xl relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-[1.5rem] bg-blue-600 flex items-center justify-center text-4xl shadow-2xl shadow-blue-500/40 animate-pulse border-2 border-white/20">👁️</div>
                <h3 className="text-4xl font-black mb-8 mt-6 bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">Stroop Interference</h3>
                <div className="space-y-6 text-white/60 font-semibold leading-relaxed text-sm">
                  <p>Your cognitive control will be tested by conflicting semantic and visual signals.</p>
                  <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 mt-8 text-center">
                    <div className="text-[10px] uppercase font-black tracking-[0.3em] text-blue-400 mb-4">The Primary Directive</div>
                    <p className="text-lg text-white">Select the <span className="text-blue-400 font-black underline decoration-2 underline-offset-4">INK COLOR</span></p>
                    <p className="text-xs mt-2 opacity-50">Ignore the text. Focus on the light.</p>
                  </div>
                </div>
                <button onClick={startGame} className="w-full mt-12 py-7 rounded-[2rem] bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.4em] transition-all transform hover:scale-[1.03] active:scale-95 shadow-[0_20px_40px_-15px_rgba(14,165,233,0.5)] border border-white/20">Initiate Analysis</button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="absolute inset-0 flex flex-col items-center justify-center p-12">
              <motion.div
                key={currentWord + currentColor}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="text-[9vw] font-black uppercase tracking-[0.2em] text-center mb-24 cursor-default select-none"
                style={{ color: currentColor, textShadow: `0 0 50px ${currentColor}66` }}
              >
                {currentWord}
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    onClick={() => handleSelection(c.hex)}
                    className="relative group h-32 rounded-[2rem] p-1 flex items-center justify-center transition-all active:scale-95 overflow-hidden border border-white/10"
                  >
                    <div className="absolute inset-0 transition-opacity opacity-20 group-hover:opacity-40" style={{ backgroundColor: c.hex }} />
                    <div className="relative text-[11px] font-black uppercase tracking-[0.3em] transition-colors" style={{ color: c.hex }}>
                      {c.name}
                    </div>
                    <div className="absolute bottom-4 w-8 h-1 rounded-full opacity-30 group-hover:opacity-100 transition-all group-hover:w-16" style={{ backgroundColor: c.hex }} />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-[8px] border-blue-500/10 border-t-blue-500 animate-[spin_1.5s_linear_infinite]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 animate-pulse" />
                </div>
              </div>
              <h3 className="mt-10 text-3xl font-black text-white/90 tracking-[0.3em] uppercase animate-pulse">Calculating Interference</h3>
              <p className="text-white/30 text-[10px] uppercase font-bold mt-4 tracking-widest">Processing Attentional Shift...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
