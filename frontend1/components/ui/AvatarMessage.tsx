'use client';
import { useEffect, useState } from 'react';

interface Props {
  message: string;
  emoji: string;
  label?: string;
}

export function AvatarMessage({ message, emoji, label = 'Therapy Assistant' }: Props) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      if (i >= message.length) { setDone(true); clearInterval(iv); return; }
      setDisplayed(message.slice(0, i + 1));
      i++;
    }, 16);
    return () => clearInterval(iv);
  }, [message]);

  return (
    <div className="relative flex gap-4 p-5 rounded-2xl border border-violet-500/20 bg-white/[0.03] backdrop-blur-sm">
      {/* Avatar orb */}
      <div
        className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl relative"
        style={{ background: 'radial-gradient(circle at 40% 35%, #7c3aed, #1e1b4b)' }}
      >
        <span role="img" aria-label="avatar">{emoji}</span>
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-violet-400 font-black text-[10px] uppercase tracking-widest">{label}</span>
          <span className="text-white/20 text-[9px] font-bold uppercase tracking-widest">• AI Companion</span>
        </div>
        
        <div className="relative max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
          <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap font-medium">
            {displayed}
            {!done && <span className="cursor-blink inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle" />}
          </div>
        </div>
      </div>
    </div>
  );
}
