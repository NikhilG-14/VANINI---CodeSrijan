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

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#eab308'];
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
  
  const [trials, setTrials] = useState(0);
  const [perseverativeErrors, setPerseverativeErrors] = useState(0); 
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

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

  const startGame = () => {
    setPhase('playing');
    
    // Fixed base cards representing specific combos so the user has standard anchoring columns
    setBaseCards([
      { color: COLORS[0], shape: SHAPES[0], number: NUMBERS[0] },
      { color: COLORS[1], shape: SHAPES[1], number: NUMBERS[1] },
      { color: COLORS[2], shape: SHAPES[2], number: NUMBERS[2] },
      { color: COLORS[3], shape: SHAPES[3], number: NUMBERS[3] }
    ]);

    setDeckCard(generateCard());
  };

  const endGame = () => {
    setPhase('outro');
    setTimeout(() => {
      onComplete({
        cognitive: 'flexibility',
        gameId: 'wcst',
        durationMs: assignment.durationMs - timeLeft,
        reactionTimeMs: [],
        errorCount: perseverativeErrors,
        totalActions: trials,
        hesitationMs: 0,
        engagementScore: 100,
        decisionChanges: 0,
        quitEarly: false,
        performanceDrop: 0,
        clickTimestamps: [],
        panicClickCount: 0,
        rawData: {
          perseverativeErrors,
          adaptationTime: 0 // Mock metric
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

    setTrials(t => t + 1);

    if (isMatch) {
      triggerFeedback('correct');
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      
      // Hidden rule change after 5 correct matches (accelerated from clinical 10 for a mini-game)
      if (newStreak >= 5) {
        setCurrentRuleIndex(r => r + 1);
        setCorrectStreak(0);
      }
    } else {
      triggerFeedback('wrong');
      setCorrectStreak(0);
      
      // If they used the OLD rule when it just changed, it's a perseverative error
      const previousRule = RULES[(currentRuleIndex - 1 + RULES.length) % RULES.length];
      let matchPrevRule = false;
      if (previousRule === 'color') matchPrevRule = (deckCard.color === targetCard.color);
      if (previousRule === 'shape') matchPrevRule = (deckCard.shape === targetCard.shape);
      if (previousRule === 'number') matchPrevRule = (deckCard.number === targetCard.number);

      if (matchPrevRule) {
        setPerseverativeErrors(e => e + 1);
      }
    }

    setDeckCard(generateCard());
  };

  const triggerFeedback = (type: 'correct' | 'wrong') => {
    setShowFeedback(type);
    setTimeout(() => setShowFeedback(null), 500);
  };

  const renderShape = (shape: string, color: string) => {
    if (shape === 'circle') return <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />;
    if (shape === 'square') return <div className="w-6 h-6" style={{ backgroundColor: color }} />;
    if (shape === 'triangle') return (
      <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px]" style={{ borderBottomColor: color }} />
    );
    if (shape === 'star') return <div className="text-xl leading-none" style={{ color }}>★</div>;
  };

  const renderCardBody = (card: Card) => {
    return (
      <div className="grid grid-cols-2 gap-1 place-items-center">
        {Array.from({ length: card.number }).map((_, i) => (
          <div key={i}>{renderShape(card.shape, card.color)}</div>
        ))}
      </div>
    );
  };

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

      <div className="flex-1 flex flex-col items-center p-8 relative">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="max-w-md text-center space-y-6 mt-10">
              <div className="text-5xl">{assignment.theme.emoji}</div>
              <h3 className="text-2xl font-bold">Rule Adaptation Test</h3>
              <p className="text-white/70">Match the bottom card to one of the four top columns. The matching rule (color, shape, or number) is secret. Use feedback ("Correct" / "Wrong") to figure out the rule. <br/><br/><span className="text-emerald-400 font-bold">Warning: The rule will change without telling you!</span></p>
              <button onClick={startGame} className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition-all text-shadow">
                Start Challenge
              </button>
            </motion.div>
          )}

          {phase === 'playing' && (
             <motion.div key="playing" className="w-full h-full flex flex-col items-center justify-between py-10">
               
               {/* Feedback display */}
               <div className="h-8 absolute top-8">
                  {showFeedback && (
                    <div className={`text-2xl font-black ${showFeedback === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
                      {showFeedback === 'correct' ? 'CORRECT MATCH' : 'WRONG MATCH'}
                    </div>
                  )}
               </div>

               {/* Base Cards Columns */}
               <div className="flex justify-center gap-4 sm:gap-8 w-full mt-10">
                 {baseCards.map((bc, idx) => (
                   <button 
                    key={idx}
                    onClick={() => handleDrop(bc)}
                    className="w-20 h-28 sm:w-28 sm:h-40 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-105 transition-all shadow-lg"
                   >
                     {renderCardBody(bc)}
                   </button>
                 ))}
               </div>

               {/* Deck Card */}
               <div className="mt-12 flex flex-col items-center">
                 <div className="text-sm text-white/50 mb-4 font-bold uppercase tracking-widest">Tap column to match</div>
                 {deckCard && (
                    <motion.div 
                      key={trials}
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="w-24 h-32 sm:w-32 sm:h-44 bg-white/10 rounded-xl border-2 border-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      {renderCardBody(deckCard)}
                    </motion.div>
                 )}
               </div>

             </motion.div>
          )}

          {phase === 'outro' && (
            <motion.div key="outro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mt-20">
              <h3 className="text-3xl font-bold mb-2">Analyzing Set-Shifting...</h3>
              <p className="text-white/60">Evaluating perseverative errors and adaptation speed.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
