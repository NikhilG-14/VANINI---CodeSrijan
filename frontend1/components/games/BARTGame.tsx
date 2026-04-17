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

export default function BARTGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  const [totalScore, setTotalScore] = useState(0);
  const [currentPumps, setCurrentPumps] = useState(0);

  const totalScoreRef = useRef(0);
  const poppedCount = useRef(0);
  const trials = useRef(0);
  const pumpHistory = useRef<number[]>([]);
  const reactionTimes = useRef<number[]>([]);

  const [balloonStatus, setBalloonStatus] = useState<'normal' | 'popped' | 'saved'>('normal');
  const popThreshold = useRef(Math.random() * 20 + 5);
  const stimulusStartTime = useRef(0);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) { endGame(); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startGame = () => { setPhase('playing'); resetBalloon(); };

  const resetBalloon = () => {
    setCurrentPumps(0);
    setBalloonStatus('normal');
    const difficultyOffset = Math.min(10, Math.floor(totalScoreRef.current / 20));
    popThreshold.current = Math.random() * (20 - difficultyOffset) + 5;
    stimulusStartTime.current = Date.now();
  };

  const handlePump = () => {
    if (balloonStatus !== 'normal') return;
    const newPumps = currentPumps + 1;
    setCurrentPumps(newPumps);
    sounds.playTick();
    const rt = Date.now() - stimulusStartTime.current;
    reactionTimes.current.push(rt);
    stimulusStartTime.current = Date.now();
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
    totalScoreRef.current += currentPumps;
    setTotalScore(totalScoreRef.current);
    trials.current++;
    pumpHistory.current.push(currentPumps);
    setTimeout(resetBalloon, 1000);
  };

  const endGame = () => {
    setPhase('outro');
    setTimeout(() => {
      const avgPumps = pumpHistory.current.length > 0 ? pumpHistory.current.reduce((a, b) => a + b, 0) / pumpHistory.current.length : 0;
      onComplete({
        cognitive: 'risk_behavior', gameId: 'bart',
        durationMs: assignment.durationMs - timeLeft, reactionTimeMs: reactionTimes.current,
        errorCount: poppedCount.current, totalActions: trials.current,
        hesitationMs: 0, engagementScore: 100, decisionChanges: 0, quitEarly: false,
        performanceDrop: 0, clickTimestamps: [], panicClickCount: 0,
        rawData: { avgPumps, poppedRatio: trials.current > 0 ? poppedCount.current / trials.current : 0, totalScore: totalScoreRef.current }
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
      status="Risk & Reward"
      stat={
        <div className="bg-amber-400/20 px-6 py-2 rounded-full text-amber-300 font-extrabold border border-amber-400/30 text-xs shadow-lg backdrop-blur-md">
           BANK: {totalScore}
        </div>
      }
    >
      <div className="w-full h-full relative flex flex-col items-center justify-center">
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="w-full max-w-xl flex flex-col items-center">
              <div className="bg-[#0a0a0f] p-12 md:p-16 w-full rounded-[3.5rem] flex flex-col items-center border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(245,158,11,0.4)] mb-10 relative z-10 transform rotate-[-6deg]">
                  {assignment.theme.emoji}
                </div>
                
                <h3 className="text-6xl kaboom-text mb-8 text-center relative z-10 tracking-tight">Balloon Challenge</h3>
                
                <p className="text-lg text-white/60 mb-10 px-6 font-medium leading-relaxed font-sans text-center relative z-10">Pump the balloon to earn units, but don't let it pop!</p>
                
                <div className="grid grid-cols-2 gap-6 w-full mb-12 text-center relative z-10">
                  <div className="p-8 rounded-[2.5rem] bg-orange-500/10 border border-orange-500/20 shadow-xl backdrop-blur-sm group hover:bg-orange-500/20 transition-all">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎈</div>
                    <div className="text-[10px] uppercase font-black tracking-[0.5em] text-orange-400 mb-2">PUMP</div>
                    <div className="text-[11px] font-black uppercase text-white/40 tracking-widest">INCREASE STAKE</div>
                  </div>
                  <div className="p-8 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 shadow-xl backdrop-blur-sm group hover:bg-emerald-500/20 transition-all">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💰</div>
                    <div className="text-[10px] uppercase font-black tracking-[0.5em] text-emerald-400 mb-2">BANK</div>
                    <div className="text-[11px] font-black uppercase text-white/40 tracking-widest">SAVE POINTS</div>
                  </div>
                </div>
                
                <button 
                  onClick={startGame} 
                  className="w-full py-8 rounded-[2rem] bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-400 text-white font-black text-lg uppercase tracking-[0.6em] transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl border-t-2 border-white/20 relative z-10"
                >
                  Initiate Mission
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full flex flex-col items-center justify-between py-12">
              <div className="text-center space-y-1 mt-4">
                <div className="text-7xl kaboom-text text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.6)]">{currentPumps}</div>
                <div className="text-[10px] uppercase font-black tracking-[0.4em] text-white/40">Current Stake</div>
              </div>
              <div className="flex-1 flex items-center justify-center relative w-full min-h-[350px]">
                {balloonStatus === 'normal' && (
                  <motion.div key="balloon" animate={{ scale: 1 + (currentPumps * 0.052) }} className="w-28 h-32 bg-gradient-to-br from-red-400 via-red-500 to-red-600 rounded-t-[50%] rounded-b-[40%] shadow-[0_30px_100px_rgba(220,38,38,0.6)] border-2 border-red-300/40 relative" style={{ originY: 1 }}>
                    <div className="absolute top-4 left-5 w-8 h-11 bg-white/30 blur-md rounded-full rotate-[15deg]" />
                    <div className="absolute top-[100%] left-1/2 w-[2px] h-32 bg-white/10 transform -translate-x-1/2" />
                  </motion.div>
                )}
                <AnimatePresence>
                  {balloonStatus === 'popped' && (
                    <motion.div key="popped" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: [1, 1.6, 1], opacity: 1 }} exit={{ opacity: 0 }} className="text-[12vw] font-black text-red-500 italic tracking-tighter drop-shadow-[0_0_60px_rgba(239,68,68,1)] uppercase">BOOM!</motion.div>
                  )}
                  {balloonStatus === 'saved' && (
                    <motion.div key="saved" initial={{ y: 20, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1.2 }} exit={{ opacity: 0, y: -40 }} className="text-7xl font-black text-green-400 drop-shadow-[0_0_40px_rgba(74,222,128,0.8)] uppercase">+{currentPumps} SAVED</motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-8 w-full max-w-xl px-6 mb-4">
                <button onClick={handlePump} disabled={balloonStatus !== 'normal'} className="flex-1 py-10 rounded-[2.5rem] bg-amber-600 hover:bg-amber-400 active:scale-90 disabled:opacity-30 disabled:grayscale font-black tracking-[0.4em] text-sm transition-all shadow-2xl border-orange-500/50 border-b-8 uppercase text-white">PUMP</button>
                <button onClick={handleCollect} disabled={balloonStatus !== 'normal' || currentPumps === 0} className="flex-1 py-10 rounded-[2.5rem] bg-green-600 hover:bg-green-400 active:scale-90 disabled:opacity-30 disabled:grayscale font-black tracking-[0.4em] text-sm transition-all shadow-2xl border-emerald-500/50 border-b-8 uppercase text-white">BANK</button>
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-[#0a0a0f] p-16 rounded-[4rem] border border-white/10 shadow-3xl">
              <div className="w-24 h-24 mb-10 mx-auto rounded-full border-[8px] border-amber-400/10 border-t-amber-400 animate-[spin_1s_linear_infinite]" />
              <h3 className="text-4xl kaboom-text">Phase Complete</h3>
              <p className="text-white/40 uppercase font-black text-[10px] tracking-[0.4em] mt-6">Optimizing reward profile...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameChrome>
  );
}
