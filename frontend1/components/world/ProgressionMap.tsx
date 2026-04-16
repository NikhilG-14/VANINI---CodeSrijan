'use client';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { LEVEL_NODES, PATH_WAYPOINTS, SCENERY, type LevelNode } from '@/lib/progression';

export function ProgressionMap() {
  const currentLevelIndex = useGameStore(s => s.currentLevelIndex);
  const completedZones    = useGameStore(s => s.completedZones);
  const openDialog        = useGameStore(s => s.openDialog);
  const setNearZone       = useGameStore(s => s.setNearZone);
  const phase             = useGameStore(s => s.phase);

  const containerRef = useRef<HTMLDivElement>(null);

  // When we reach a node, open the dialog
  useEffect(() => {
    if (phase === 'world') {
      const node = LEVEL_NODES[currentLevelIndex];
      if (node) {
        setNearZone(node);
        // Add a small delay for the walking animation to finish before popping the dialog
        const timer = setTimeout(() => {
          openDialog();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentLevelIndex, phase, setNearZone, openDialog]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #166534 100%)', // Lush green
      }}
    >
      {/* ── Background Detail: Dots/Grass ── */}
      <div className="absolute inset-0 opacity-10" 
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* ── Path Winding ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M ${PATH_WAYPOINTS.map(w => `${w.x}% ${w.y}%`).join(' L ')}`}
          fill="none"
          stroke="#d97706" // Dirt path color
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-80"
        />
        <path
          d={`M ${PATH_WAYPOINTS.map(w => `${w.x}% ${w.y}%`).join(' L ')}`}
          fill="none"
          stroke="#b45309"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1, 8"
          className="opacity-40"
        />
      </svg>

      {/* ── Scenery ── */}
      {SCENERY.map(item => (
        <div 
          key={item.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 text-3xl select-none"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        >
          {item.type === 'tree' && '🌲'}
          {item.type === 'rock' && '🪨'}
          {item.type === 'water' && <div className="w-32 h-20 bg-blue-500/40 rounded-full blur-md border-4 border-blue-400/20" />}
          {item.type === 'bridge' && <div className="w-16 h-8 bg-amber-900/60 rounded-sm skew-x-12 flex items-center justify-center font-bold text-[8px] text-white/30 tracking-tighter">BRIDGE</div>}
        </div>
      ))}

      {/* ── Nodes (Buildings) ── */}
      {LEVEL_NODES.map((node, i) => {
        const isCompleted = completedZones.has(node.id);
        const isCurrent   = currentLevelIndex === i;
        const isLocked    = i > currentLevelIndex && !isCompleted;

        return (
          <div 
            key={node.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {/* Building Icon */}
            <div 
              className={`relative w-16 h-16 rounded-3xl flex items-center justify-center text-4xl cursor-pointer transition-all duration-500
                ${isLocked ? 'grayscale opacity-30 scale-90' : 'z-10 shadow-xl'}
                ${isCurrent ? 'animate-bounce-slow border-2' : ''}
              `}
              style={{ 
                background: isCurrent ? `${node.color}44` : 'rgba(255,255,255,0.05)',
                borderColor: isCurrent ? node.color : 'rgba(255,255,255,0.1)',
                boxShadow: isCurrent ? `0 0 30px ${node.color}66` : 'none'
              }}
              onClick={() => isCurrent && openDialog()}
            >
              <span className="relative z-10">{node.buildingEmoji}</span>
              {isCompleted && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                  ✓
                </div>
              )}
              {isCurrent && (
                <div className="absolute -inset-4 bg-white/10 rounded-full blur-xl animate-pulse" />
              )}
            </div>

            {/* Label */}
            <div className={`mt-3 px-3 py-1 rounded-full border bg-black/40 backdrop-blur-sm transition-all
              ${isLocked ? 'opacity-20' : 'opacity-100'}
            `}
              style={{ borderColor: isCurrent ? `${node.color}66` : 'rgba(255,255,255,0.1)' }}
            >
              <p className={`text-[9px] font-black uppercase tracking-widest ${isCurrent ? 'text-white' : 'text-white/40'}`}>
                Level {i + 1}: {node.label}
              </p>
            </div>
            
            {/* Emotional Hint (Visual Filter) */}
            {isCurrent && (
              <div 
                className="fixed inset-0 pointer-events-none transition-opacity duration-1000 z-0"
                style={{ 
                  background: `radial-gradient(circle at ${node.x}% ${node.y}%, transparent 20%, ${node.color}11 80%)`,
                  opacity: 0.6
                }}
              />
            )}
          </div>
        );
      })}

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
