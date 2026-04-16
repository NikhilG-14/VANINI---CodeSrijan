'use client';
import { useState, useEffect } from 'react';

interface AvatarMessageProps {
  message: string;
  dominantEmotion: string;
  dominantEmoji: string;
}

export function AvatarMessage({ message, dominantEmoji }: AvatarMessageProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i >= message.length) {
        setDone(true);
        clearInterval(interval);
        return;
      }
      setDisplayed(message.slice(0, i + 1));
      i++;
    }, 18);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div className="relative flex gap-4 p-5 rounded-2xl border border-violet-500/20 bg-white/[0.03] backdrop-blur-sm">
      {/* Avatar orb */}
      <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-2xl relative"
        style={{ background: 'radial-gradient(circle at 40% 35%, #7c3aed, #1e1b4b)' }}
      >
        <span role="img" aria-label="avatar">{dominantEmoji}</span>
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
      </div>

      {/* Speech bubble */}
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-violet-400 font-semibold text-sm">VANI</span>
          <span className="text-white/30 text-xs">• AI Companion</span>
        </div>
        <p className="text-white/80 text-sm leading-relaxed min-h-[3rem]">
          {displayed}
          {!done && <span className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />}
        </p>
      </div>
    </div>
  );
}
