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

export default function BARTGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  // States for UI
  const [totalScore, setTotalScore] = useState(0);
  const [currentPumps, setCurrentPumps] = useState(0);
  
  // Refs for stable telemetry and interval closures
  const totalScoreRef = useRef(0);
  const poppedCount = useRef(0);
  const trials = useRef(0);
  const pumpHistory = useRef<number[]>([]);
  const reactionTimes = useRef<number[]>([]);

  const [balloonStatus, setBalloonStatus] = useState<'normal' | 'popped' | 'saved'>('normal');

  // Probability of pop increases with each pump.
  const popThreshold = useRef(Math.random() * 20 + 5); 
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

  const startGame = () => {
    setPhase('playing');
    resetBalloon();
  };

  const resetBalloon = () => {
    setCurrentPumps(0);
    setBalloonStatus('normal');
    // Difficulty Scaling: Base range 5-25, shrinks as totalScore increases
    const difficultyOffset = Math.min(10, Math.floor(totalScoreRef.current / 20));
    popThreshold.current = Math.random() * (20 - difficultyOffset) + 5; 
    stimulusStartTime.current = Date.now();
  };

  const handlePump = () => {
    if (balloonStatus !== 'normal') return;
    
    const newPumps = currentPumps + 1;
    setCurrentPumps(newPumps);
    sounds.playTick();
    
    // Capture inter-pump RT
    const rt = Date.now() - stimulusStartTime.current;
    reactionTimes.current.push(rt);
    stimulusStartTime.current = Date.now(); // reset for next pump
    
    // Check for pop
    if (newPumps >= popThreshold.current) {
      setBalloonStatus('popped');
      sounds.playPop();
      poppedCount.current++;
      trials.current++;
      pumpHistory.current.push(0);
      setTimeout(resetBalloon, 1000);
    }
  };

  const handleCollect = () => {
    if (balloonStatus !== 'normal' || currentPumps === 0) return;
    
    setBalloonStatus('saved');
    sounds.playSuccess();
    
    const gained = currentPumps;
    totalScoreRef.current += gained;
    setTotalScore(totalScoreRef.current);
    
    trials.current++;
    pumpHistory.current.push(currentPumps);
    
    setTimeout(resetBalloon, 1000);
  };

  const endGame = () => {
    setPhase('outro');
    
    setTimeout(() => {
      const avgPumps = pumpHistory.current.length > 0 
        ? pumpHistory.current.reduce((a,b)=>a+b,0) / pumpHistory.current.length 
        : 0;

      onComplete({
        cognitive: 'risk_behavior',
        gameId: 'bart',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: reactionTimes.current,
        errorCount: poppedCount.current,
        totalActions: trials.current,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          avgPumps,
          poppedRatio: trials.current > 0 ? poppedCount.current / trials.current : 0,
          totalScore: totalScoreRef.current
        }
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-900/90 text-white font-sans rounded-[2.5rem] overflow-hidden backdrop-blur-2xl border border-white/10 shadow-2xl relative">
      <div className="flex items-center justify-between p-6 bg-black/20 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{assignment.theme.emoji}</span>
          <div>
            <h2 className="text-lg font-bold tracking-wide">{assignment.gameName}</h2>
            <p className="text-xs text-white/50">{assignment.theme.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-amber-500/20 px-4 py-2 rounded-xl text-amber-400 font-bold border border-amber-500/30">
            Score: {totalScore}
          </div>
          {phase === 'playing' && <GameTimer durationMs={assignment.durationMs} timeLeftMs={timeLeft} />}
          <button onClick={e => { e.stopPropagation(); onExit(); }} className="p-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/40 transition-colors">
            Exit
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-8 relative">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md text-center space-y-6 mt-10">
              <div className="text-5xl">{assignment.theme.emoji}</div>
              <h3 className="text-2xl font-bold">Risk Assessment Task</h3>
              <p className="text-white/70">Pump the balloon to earn points (1 pump = 1 point). You can <span className="font-bold text-amber-400">Collect</span> to save your points at any time.</p>
              <p className="text-white/70"><span className="text-red-400 font-bold">If the balloon pops, you lose the points for that balloon.</span> Each balloon has a random popping point.</p>
              <button onClick={startGame} className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold transition-all text-shadow">
                Start Challenge
              </button>
            </motion.div>
          )}

          {phase === 'playing' && (
             <motion.div key="playing" className="w-full h-full flex flex-col items-center justify-between pb-10">
               
               <div className="text-center space-y-2 mt-4">
                  <div className="text-4xl font-black text-amber-400">{currentPumps}</div>
                  <div className="text-sm uppercase tracking-widest text-white/50">Current Pumps</div>
               </div>

               <div className="flex-1 flex items-center justify-center relative w-full h-[300px]">
                  {balloonStatus === 'normal' && (
                    <motion.div 
                      key="balloon"
                      animate={{ scale: 1 + (currentPumps * 0.05) }}
                      className="w-20 h-24 bg-gradient-to-br from-red-400 to-red-600 rounded-t-[50%] rounded-b-[40%] shadow-[0_0_40px_rgba(239,68,68,0.4)] border border-red-300/50"
                      style={{ originY: 1 }}
                    >
                      <div className="absolute top-[100%] left-1/2 w-[2px] h-20 bg-white/30 transform -translate-x-1/2" />
                    </motion.div>
                  )}
                  {balloonStatus === 'popped' && (
                    <div className="text-7xl font-black text-red-500 animate-ping">POP!</div>
                  )}
                  {balloonStatus === 'saved' && (
                    <div className="text-4xl font-black text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]">+{currentPumps} SAVED!</div>
                  )}
               </div>

               <div className="flex gap-4 w-full max-w-sm">
                 <button 
                  onClick={handlePump}
                  disabled={balloonStatus !== 'normal'}
                  className="flex-1 py-5 rounded-2xl bg-amber-600 hover:bg-amber-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 font-black tracking-widest text-xl transition-all shadow-xl border-orange-500/50 border-b-4 uppercase"
                 >
                   PUMP
                 </button>
                 <button 
                  onClick={handleCollect}
                  disabled={balloonStatus !== 'normal' || currentPumps === 0}
                  className="flex-1 py-5 rounded-2xl bg-green-600 hover:bg-green-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 font-bold tracking-widest text-lg transition-all shadow-xl border-emerald-500/50 border-b-4 uppercase"
                 >
                   COLLECT
                 </button>
               </div>

             </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-20">
              <h3 className="text-3xl font-bold mb-2">Analyzing Risk...</h3>
              <p className="text-white/60">Evaluating optimal stopping strategies and loss sensitivity.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
