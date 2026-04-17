'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MiniGamePortal } from '@/components/ui/MiniGamePortal';
import { useGameStore } from '@/store/gameStore';
import { LEVEL_NODES } from '@/lib/progression';

// Load Game ONLY on client (Phaser uses window/document)
const Game = dynamic(() => import('@/components/game/Game'), { ssr: false });

const EMOTION_COLORS: Record<string, string> = {
  attention: '#3b82f6',
  memory: '#8b5cf6',
  impulsivity: '#ef4444',
  flexibility: '#10b981',
  risk_behavior: '#f59e0b',
};

export default function WorldPage() {
  const router = useRouter();
  const phase = useGameStore(s => s.phase);
  const completedZones = useGameStore(s => s.completedZones);
  const nearZone = useGameStore(s => s.nearZone);
  const dialogOpen = useGameStore(s => s.dialogOpen);
  const enterZone = useGameStore(s => s.enterZone);
  const closeDialog = useGameStore(s => s.closeDialog);

  // Redirect on completion
  useEffect(() => {
    if (phase === 'complete') {
      router.push('/report');
    }
  }, [phase, router]);

  // Handle keys
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialogOpen) closeDialog();
      if (e.key === 'Enter' && dialogOpen && nearZone) enterZone(nearZone.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen, nearZone, closeDialog, enterZone]);

  return (
    <div className="w-full h-full flex flex-col bg-[#060a14] selection:bg-violet-500/30">
      {/* === TOP FLOATING HUD === */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-5xl z-50 flex items-center justify-between px-5 py-3 rounded-2xl glass-panel scanline overflow-hidden ring-1 ring-inset ring-white/10 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_#a78bfa]" />
              <span className="font-pixel text-[8px] text-white tracking-[0.2em] text-shadow-strong">WORLD_MAP.V2</span>
            </div>
            <span className="text-[8px] text-white/50 font-bold uppercase tracking-[0.15em] mt-0.5 ml-3.5 items-center flex gap-2 text-shadow-strong">
              <span className="w-2 h-[1px] bg-white/20" /> Exploring Sector-01
            </span>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1" />

          {/* Controls */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex gap-1">
              {['W', 'A', 'S', 'D'].map(key => (
                <kbd key={key} className="w-6 h-6 flex items-center justify-center rounded-md border border-white/20 bg-black/60 text-[8px] text-white font-bold shadow-inner">
                  {key}
                </kbd>
              ))}
            </div>
            <span className="text-[9px] text-white/40 font-black uppercase tracking-tighter text-shadow-strong">Navigate</span>
          </div>
        </div>

        {/* Progress tracker */}
        <div className="flex items-center gap-5">
          <div className="flex -space-x-1.5">
            {LEVEL_NODES.map((node, i) => {
              const isActive = completedZones.has(node.id);
              const color = EMOTION_COLORS[node.cognitive] || node.color || '#fff';
              return (
                <div
                  key={node.id}
                  title={node.label}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-base transition-all duration-500 relative group
                    ${isActive
                      ? 'z-10 scale-105'
                      : 'opacity-40 z-0 hover:opacity-100 border-white/10 bg-black/60 shadow-lg'}`}
                  style={isActive ? { 
                    borderColor: color, 
                    backgroundColor: `${color}44`,
                    boxShadow: `0 0 20px ${color}88`,
                    filter: 'drop-shadow(0 0 8px currentColor)',
                    color: '#fff'
                  } : {}}
                >
                  <span className={isActive ? 'text-white drop-shadow-md' : 'grayscale opacity-70'}>
                    {isActive ? '✓' : node.buildingEmoji}
                  </span>
                  {!isActive && (
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/95 rounded border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                      <span className="text-[9px] text-white tracking-widest uppercase font-bold">{node.label}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col items-end pl-3.5 border-l border-white/10">
            <div className="flex items-baseline gap-1">
              <span className="text-white font-black text-xl italic tabular-nums text-shadow-strong">{completedZones.size}</span>
              <span className="text-white/40 text-[9px] font-bold">/5</span>
            </div>
            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest text-shadow-strong">Analysis</span>
          </div>
        </div>
      </header>


      {/* === Main area === */}
      <main className="flex-1 relative overflow-hidden bg-[#060a14]">
        {phase === 'world' ? (
          <Game />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full border-t-2 border-violet-500 animate-spin shadow-[0_0_15px_#8b5cf6]" />
              <span className="font-pixel text-[10px] text-violet-400 tracking-[0.3em] ml-2 text-shadow-strong">INITIALIZING_LINK...</span>
            </div>
          </div>
        )}

        {/* Fullscreen Mini Games */}
        <MiniGamePortal />

      </main>


    </div>
  );
}
