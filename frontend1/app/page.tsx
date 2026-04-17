'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Star field decoration
const STARS = Array.from({ length: 50 }, (_, i) => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3,
  dur: 1 + Math.random() * 3,
  delay: Math.random() * 3,
}));

const ZONE_CARDS = [
  { emoji: '⚡', label: 'Storm Lab', emotion: 'Anxiety', color: '#3b82f6', desc: 'Reaction speed test' },
  { emoji: '🌫️', label: 'Grey House', emotion: 'Depression', color: '#818cf8', desc: 'Engagement test' },
  { emoji: '🔋', label: 'Energy Core', emotion: 'Fatigue', color: '#06b6d4', desc: 'Mental stamina' },
  { emoji: '⚖️', label: 'Courthouse', emotion: 'Paralysis', color: '#fb923c', desc: 'Decision delay' },
  { emoji: '🌀', label: 'Mind Library', emotion: 'Overthinking', color: '#a855f7', desc: 'Choice loops' },
];

export default function TitlePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a0a40 0%, #060a14 60%)' }}>

      {/* Star field */}
      <div className="absolute inset-0 pointer-events-none">
        {STARS.map((s, i) => (
          <div
            key={i}
            className="star absolute rounded-full bg-white opacity-20"
            style={{
              left: `${s.x}%`, top: `${s.y}%`,
              width: s.size, height: s.size,
              animation: `twinkle ${s.dur}s ease-in-out infinite`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Glows */}
      <div className="absolute top-[-10%] left-[5%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] pointer-events-none bg-violet-600" />
      <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] pointer-events-none bg-cyan-600" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 pt-24 px-6">
        <div className="px-5 py-2 rounded-full text-sm font-bold uppercase tracking-[0.2em] border border-violet-500/30 text-violet-400 bg-violet-500/10 backdrop-blur-sm">
          Behavioral Analysis System · VANI
        </div>

        <div className={`text-8xl float-anim transition-all duration-700 ${ready ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          🧑
        </div>

        <div className="text-center">
          <h1 className="font-pixel text-white text-3xl md:text-5xl leading-tight tracking-tight mb-2" 
            style={{ textShadow: '0 0 40px rgba(124,58,237,0.8)' }}>
            MIND
          </h1>
          <h1 className="font-pixel text-5xl md:text-7xl leading-tight tracking-tight"
            style={{ 
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.6))'
            }}>
            JOURNEY
          </h1>
          <p className="text-white/50 text-base mt-6 max-w-lg leading-relaxed mx-auto italic">
            "Every step you take, every choice you make, reveals the landscape of your inner world."
          </p>
        </div>

        <div className="flex gap-4 mt-6">
          <Link href="/world"
            className="group relative px-20 py-5 min-w-[320px] flex items-center justify-center rounded-2xl bg-violet-600 font-bold text-white text-lg shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.8)] hover:bg-violet-500 transition-all active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 font-extrabold tracking-widest">START EXPLORATION</span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </div>

        <p className="text-white/20 text-xs uppercase font-bold tracking-[0.2em] title-flicker">
          Use WASD or Arrow Keys to navigate the city
        </p>
      </div>

      {/* Zone Overview */}
      <div className="relative z-10 w-full px-6 pb-12 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">Analysis Zones</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {ZONE_CARDS.map(z => (
            <div key={z.label}
              className="group flex flex-col items-center gap-3 p-4 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.05] transition-all cursor-default text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner transition-transform group-hover:scale-110"
                style={{ background: `${z.color}22`, border: `1px solid ${z.color}33` }}>
                {z.emoji}
              </div>
              <div>
                <p className="text-white font-black text-[10px] uppercase tracking-wider mb-1">{z.label}</p>
                <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: z.color, opacity: 0.5 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
