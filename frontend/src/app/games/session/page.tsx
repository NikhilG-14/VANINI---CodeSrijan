'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGameSession } from '@/components/games/GameSessionContext';
import { GlobalTimerBar } from '@/components/games/GameTimer';
import dynamic from 'next/dynamic';

const StormReactionGame    = dynamic(() => import('@/components/games/StormReactionGame'),      { ssr: false });
const RiskChoiceGame       = dynamic(() => import('@/components/games/RiskChoiceGame'),         { ssr: false });
const InterestExplorerGame = dynamic(() => import('@/components/games/InterestExplorerGame'),   { ssr: false });
const PersistenceTestGame  = dynamic(() => import('@/components/games/PersistenceTestGame'),    { ssr: false });
const LoopDecisionGame     = dynamic(() => import('@/components/games/LoopDecisionGame'),       { ssr: false });
const PerfectChoiceGame    = dynamic(() => import('@/components/games/PerfectChoiceGame'),      { ssr: false });
const TimedDecisionsGame   = dynamic(() => import('@/components/games/TimedDecisionsGame'),     { ssr: false });
const TooManyOptionsGame   = dynamic(() => import('@/components/games/TooManyOptionsGame'),     { ssr: false });
const FocusDropGame        = dynamic(() => import('@/components/games/FocusDropGame'),          { ssr: false });
const MultitaskChallengeGame = dynamic(() => import('@/components/games/MultitaskChallengeGame'), { ssr: false });

const GAME_COMPONENTS: Record<string, any> = {
  'storm-reaction': StormReactionGame,
  'risk-choice': RiskChoiceGame,
  'interest-explorer': InterestExplorerGame,
  'persistence-test': PersistenceTestGame,
  'loop-decision': LoopDecisionGame,
  'perfect-choice': PerfectChoiceGame,
  'timed-decisions': TimedDecisionsGame,
  'too-many-options': TooManyOptionsGame,
  'focus-drop': FocusDropGame,
  'multitask-challenge': MultitaskChallengeGame,
};

export default function GameSessionPage() {
  const { session, currentIndex, isComplete, startSession, submitResult } = useGameSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => { setMounted(true); startSession(); }, [startSession]);

  useEffect(() => {
    if (isComplete) {
      setTransitioning(true);
      setTimeout(() => router.push('/games/results'), 600);
    }
  }, [isComplete, router]);

  const handleSubmit = (result: any) => {
    console.log('--- Game Complete ---', result.gameId, result);
    setTransitioning(true);
    setTimeout(() => {
      console.log('Advancing to next index...');
      submitResult(result);
      setTransitioning(false);
    }, 400);
  };

  if (!mounted || !session) return (
    <div className="flex-1 flex items-center justify-center bg-[#050816]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-white/30 text-sm">Preparing your session...</p>
      </div>
    </div>
  );

  const activeAssignment = session.games[currentIndex];
  const GameComponent = GAME_COMPONENTS[activeAssignment.gameId];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050816]">

      {/* ─── Session Header ─── */}
      <div className="relative z-20 px-4 pt-4 pb-3 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            {/* Game info */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-black border border-white/10"
                style={{ background: `${activeAssignment.theme.accent}22`, color: activeAssignment.theme.accent }}>
                {activeAssignment.theme.emoji}
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">{activeAssignment.theme.label}</p>
                <p className="text-white/30 text-[10px] mt-0.5">{activeAssignment.gameName}</p>
              </div>
            </div>

            {/* Step pips */}
            <div className="flex items-center gap-1.5">
              {session.games.map((g, i) => (
                <div key={i} title={g.gameName}
                  className={`h-2 rounded-full transition-all duration-500 ${i === currentIndex
                    ? 'w-8 opacity-100'
                    : i < currentIndex
                    ? 'w-2 opacity-80'
                    : 'w-2 opacity-20'
                    }`}
                  style={{ backgroundColor: i <= currentIndex ? g.theme.accent : '#ffffff' }} />
              ))}
              <span className="text-white/30 text-xs ml-2 font-mono">{currentIndex + 1}/{session.games.length}</span>
            </div>
          </div>

          {/* Global 10-min countdown bar */}
          <GlobalTimerBar totalMs={session.totalDurationMs} startedAt={session.startedAt} />
        </div>
      </div>

      {/* ─── Game Stage ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden relative">
        {/* Accent glow behind game card */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 50% 60%, ${activeAssignment.theme.accent}10 0%, transparent 70%)` }} />

        {/* Game card */}
        <div className={`w-full max-w-4xl h-full max-h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative transition-all duration-400 ${transitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div key={`${activeAssignment.gameId}-${currentIndex}`} className="w-full h-full">
            <GameComponent
              durationMs={activeAssignment.durationMs}
              onComplete={handleSubmit}
            />
          </div>
        </div>
      </div>

      {/* Pulse footer */}
      <div className="py-3 text-center z-10">
        <p className="text-white/15 text-[10px] font-medium animate-pulse uppercase tracking-widest">
          VANI is observing your behavioral patterns...
        </p>
      </div>
    </div>
  );
}
