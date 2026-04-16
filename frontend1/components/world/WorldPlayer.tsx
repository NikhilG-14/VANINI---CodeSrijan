'use client';
import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { LEVEL_NODES, PATH_WAYPOINTS } from '@/lib/progression';

export function WorldPlayer() {
  const currentLevelIndex = useGameStore(s => s.currentLevelIndex);
  const updateMapPos      = useGameStore(s => s.updateMapPos);
  const playerMapPos      = useGameStore(s => s.playerMapPos);
  const phase             = useGameStore(s => s.phase);

  const [isMoving, setIsMoving] = useState(false);
  const movementRef = useRef<number | null>(null);

  // When currentLevelIndex changes, we move the player along the path
  useEffect(() => {
    if (phase !== 'world') return;

    const targetNode = LEVEL_NODES[currentLevelIndex];
    if (!targetNode) return;

    // In a real game, we'd calculate the path segments. 
    // For this implementation, we'll smoothly transition the component position
    // and let the state know we are moving.
    setIsMoving(true);
    const timer = setTimeout(() => setIsMoving(false), 1500);
    return () => clearTimeout(timer);
  }, [currentLevelIndex, phase]);

  return (
    <div 
      className={`absolute z-30 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-[1500ms] ease-in-out
        ${isMoving ? 'animate-walk' : ''}
      `}
      style={{ 
        left: `${LEVEL_NODES[currentLevelIndex].x}%`, 
        top: `${LEVEL_NODES[currentLevelIndex].y}%` 
      }}
    >
      <div className="relative flex flex-col items-center">
        {/* Footstep/Dust Particle Shadow */}
        <div className={`w-8 h-3 bg-black/20 rounded-full blur-[2px] transition-all duration-300 ${isMoving ? 'scale-125 opacity-40' : 'scale-100 opacity-20'}`} />
        
        {/* Character Sprite */}
        <div className="text-4xl -mt-8 drop-shadow-lg">
          🧑
        </div>

        {/* Name Tag */}
        <div className="mt-1 px-2 py-0.5 rounded bg-black/60 border border-white/20">
          <p className="text-[7px] font-black text-white uppercase tracking-tighter">EXPLORER</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes walk-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px) rotate(3deg); }
        }
        .animate-walk {
          animation: walk-bob 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
