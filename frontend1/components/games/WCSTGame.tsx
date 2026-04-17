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

const COLORS = ['#FF0055', '#3B82F6', '#00FF9F', '#FBFF00']; // Neon Red, Blue, Green, Yellow
const SHAPES = ['circle', 'square', 'triangle', 'star'];
const NUMBERS = [1, 2, 3, 4];
const RULES = ['color', 'shape', 'number'];

interface Card { color: string; shape: string; number: number; }

export default function WCSTGame({ assignment, onComplete, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'outro'>('intro');
  const [timeLeft, setTimeLeft] = useState(assignment.durationMs);

  const [deckCard, setDeckCard] = useState<Card | null>(null);
  const [baseCards, setBaseCards] = useState<Card[]>([]);

  const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);

  const trials = useRef(0);
  const perseverativeErrors = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

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

  const generateCard = (): Card => ({
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    number: NUMBERS[Math.floor(Math.random() * NUMBERS.length)]
  });

  const setNewDeckCard = () => {
    setDeckCard(generateCard());
    stimulusStartTime.current = Date.now();
  };

  const startGame = () => {
    setPhase('playing');
    setBaseCards([
      { color: COLORS[0], shape: SHAPES[0], number: NUMBERS[0] },
      { color: COLORS[1], shape: SHAPES[1], number: NUMBERS[1] },
      { color: COLORS[2], shape: SHAPES[2], number: NUMBERS[2] },
      { color: COLORS[3], shape: SHAPES[3], number: NUMBERS[3] }
    ]);
    setNewDeckCard();
  };

  const endGame = () => {
    setPhase('outro');
    setTimeout(() => {
      onComplete({
        cognitive: 'flexibility',
        gameId: 'wcst',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: reactionTimes.current,
        errorCount: perseverativeErrors.current,
        totalActions: trials.current,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          perseverativeErrors: perseverativeErrors.current,
          adaptationTime: 0
        }
      });
    }, 1500);
  };

  const handleDrop = (targetCard: Card) => {
    if (!deckCard) return;

    const currentRule = RULES[currentRuleIndex % RULES.length];
    let isMatch = false;
    if (currentRule === 'color') isMatch = (deckCard.color === targetCard.color);
    if (currentRule === 'shape') isMatch = (deckCard.shape === targetCard.shape);
    if (currentRule === 'number') isMatch = (deckCard.number === targetCard.number);

    trials.current++;

    if (isMatch) {
      triggerFeedback('correct');
      sounds.playSuccess();
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      if (newStreak >= (trials.current > 30 ? 3 : 5)) {
        setCurrentRuleIndex(r => r + 1);
        setCorrectStreak(0);
      }
    } else {
      triggerFeedback('wrong');
      sounds.playError();
      setCorrectStreak(0);
      const previousRule = RULES[(currentRuleIndex - 1 + RULES.length) % RULES.length];
      let matchPrevRule = false;
      if (previousRule === 'color') matchPrevRule = (deckCard.color === targetCard.color);
      if (previousRule === 'shape') matchPrevRule = (deckCard.shape === targetCard.shape);
      if (previousRule === 'number') matchPrevRule = (deckCard.number === targetCard.number);
      if (matchPrevRule) perseverativeErrors.current++;
    }

    reactionTimes.current.push(Date.now() - stimulusStartTime.current);
    setNewDeckCard();
  };

  const triggerFeedback = (type: 'correct' | 'wrong') => {
    setShowFeedback(type);
    setTimeout(() => setShowFeedback(null), 500);
  };

  const renderShape = (shape: string, color: string) => {
    const style = { backgroundColor: color, boxShadow: `0 0 15px ${color}88` };
    if (shape === 'circle') return <div className="w-8 h-8 rounded-full" style={style} />;
    if (shape === 'square') return <div className="w-8 h-8 rounded-sm" style={style} />;
    if (shape === 'triangle') return (
      <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-b-[24px] drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]" style={{ borderBottomColor: color }} />
    );
    if (shape === 'star') return <div className="text-3xl leading-none drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]" style={{ color }}>★</div>;
  };

  const renderCardBody = (card: Card) => (
    <div className="grid grid-cols-2 gap-3 place-items-center">
      {Array.from({ length: card.number }).map((_, i) => (
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} key={i}>{renderShape(card.shape, card.color)}</motion.div>
      ))}
    </div>
  );

  return (
    <MiniGameChrome
      assignment={assignment}
      phase={phase}
      timeLeftMs={timeLeft}
      onExit={onExit}
      bgImage="/backgrounds/memory.jpg"
      variant="cabin"
      status="Concept Shift"
    >
      <div className="w-full h-full relative flex flex-col items-center justify-center p-8">
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="max-w-xl text-center flex flex-col items-center">
              <div className="bg-black p-16 md:p-20 rounded-[4rem] border border-white/10 shadow-3xl flex flex-col items-center max-w-2xl">
                <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center text-5xl shadow-xl border-2 border-white/20 mb-10 transform rotate-[10deg]">
                  {assignment.theme.emoji}
                </div>

                <h3 className="text-5xl kaboom-text mb-8">Rule Finder</h3>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[2.5rem] p-8 text-center space-y-4 mb-10 w-full">
                  <p className="text-white/90 text-lg leading-relaxed px-6">Find the hidden rule! Match the card at the bottom to one of the four piles at the top.</p>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-7 rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-[0.4em] transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl border border-white/20"
                >
                  Begin Match
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'playing' && (
            <motion.div key="playing" className="w-full h-full flex flex-col items-center justify-between py-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="h-20 flex items-center justify-center">
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.5 }}
                      animate={{ opacity: 1, y: -15, scale: 1.6 }}
                      exit={{ opacity: 0, scale: 2 }}
                      className={`text-3xl font-black uppercase tracking-[0.4em] px-12 py-4 rounded-full backdrop-blur-3xl border-2 ${showFeedback === 'correct' ? 'text-green-400 border-green-500/50 bg-green-500/20' : 'text-red-400 border-red-500/50 bg-red-500/20'}`}
                      style={{ textShadow: showFeedback === 'correct' ? '0 0 30px #4ade80' : '0 0 30px #ef4444' }}
                    >
                      {showFeedback === 'correct' ? 'PERFECT' : 'WRONG RULE'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex justify-center gap-6 sm:gap-12 w-full mt-4">
                {baseCards.map((bc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDrop(bc)}
                    className="w-28 h-40 sm:w-32 sm:h-48 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border-2 border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/15 hover:scale-105 active:scale-95 transition-all shadow-2xl group overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-white/10 group-hover:bg-white/30 transition-colors" />
                    {renderCardBody(bc)}
                  </button>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center">
                <div className="text-[10px] text-white/30 mb-8 font-black uppercase tracking-[0.5em]">Select target column</div>
                {deckCard && (
                  <motion.div
                    key={trials.current}
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-32 h-44 sm:w-36 sm:h-52 bg-white/10 backdrop-blur-3xl rounded-[3rem] border-4 border-white/80 flex items-center justify-center shadow-3xl relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                    {renderCardBody(deckCard)}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center bg-black/80 backdrop-blur-3xl p-16 rounded-[4rem] border border-white/10 shadow-3xl flex flex-col items-center">
              <div className="w-20 h-20 mb-10 mx-auto rounded-full border-[8px] border-emerald-500/10 border-t-emerald-500 animate-[spin_1s_linear_infinite]" />
              <h3 className="text-4xl kaboom-text">Phase Complete</h3>
              <p className="text-white/40 uppercase font-black text-[10px] tracking-[0.4em] mt-6">Measuring conceptual fluidity profile...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MiniGameChrome>
  );
}
