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
  anxiety: '#3b82f6', depression: '#818cf8', fatigue: '#06b6d4',
  paralysis: '#fb923c', overthinking: '#a855f7',
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
      {/* HUD Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#060a14]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-lg border border-violet-500/30 bg-violet-500/10">
            <span className="font-pixel text-[8px] text-violet-400 tracking-widest">WORLD MAP</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-[10px] text-white/50">W</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-[10px] text-white/50">A</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-[10px] text-white/50">S</kbd>
            <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-[10px] text-white/50">D</kbd>
            <span className="text-[10px] text-white/30 ml-1">to Explore</span>
          </div>
        </div>

        {/* Progress tracker */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {LEVEL_NODES.map((node, i) => (
              <div
                key={node.id}
                title={node.label}
                className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center text-lg transition-all 
                  ${completedZones.has(node.id)
                    ? 'opacity-100 z-10 scale-100'
                    : 'opacity-20 z-0 scale-90 border-white/10 bg-white/5'}`}
                style={completedZones.has(node.id) ? { 
                  borderColor: EMOTION_COLORS[node.emotion], 
                  backgroundColor: `${EMOTION_COLORS[node.emotion]}22`,
                  boxShadow: `0 0 15px ${EMOTION_COLORS[node.emotion]}33`
                } : {}}
              >
                {completedZones.has(node.id) ? '✓' : node.buildingEmoji}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-white font-black text-xs leading-none">{completedZones.size}/5</span>
            <span className="text-[9px] text-white/30 uppercase tracking-tighter mt-1 font-bold">Analysis Complete</span>
          </div>
        </div>
      </div>

      {/* === Main area === */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {phase === 'world' ? (
          <Game />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {/* Loading or transitioning state */}
            <span className="font-pixel text-[10px] text-white/20 animate-pulse">TRANSMITTING...</span>
          </div>
        )}

        {/* Fullscreen Mini Games */}
        <MiniGamePortal />
      </div>

      {/* === Bottom status bar === */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/5 flex-shrink-0"
        style={{ background: '#060a14' }}>
        <div className="flex gap-6">
          {LEVEL_NODES.map(node => (
            <div key={node.id} className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
              <div className="w-1.5 h-1.5 rounded-full" style={{
                background: completedZones.has(node.id) ? EMOTION_COLORS[node.emotion] : 'rgba(255,255,255,0.1)',
              }} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${completedZones.has(node.id) ? 'text-white' : 'text-white/20'}`}>
                {node.label}
              </span>
            </div>
          ))}
        </div>
        <span className="text-white/20 text-[10px] uppercase font-bold tracking-widest">
          {completedZones.size === 5 ? '✨ ALL SESSIONS VERIFIED' : `${5 - completedZones.size} SESSIONS PENDING`}
        </span>
      </div>
    </div>
  );
}
