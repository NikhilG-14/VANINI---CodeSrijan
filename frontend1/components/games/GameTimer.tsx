'use client';
import { useEffect, useState, useRef } from 'react';

interface Props {
  durationMs: number;
  onExpire: () => void;
  accent?: string;
  label?: string;
}

export function GameTimer({ durationMs, onExpire, accent = '#7c3aed', label }: Props) {
  const [remaining, setRemaining] = useState(durationMs);
  const expiredRef = useRef(false);
  const startRef   = useRef(Date.now());

  useEffect(() => {
    expiredRef.current = false;
    startRef.current   = Date.now();
    setRemaining(durationMs);

    const iv = setInterval(() => {
      const left = Math.max(0, durationMs - (Date.now() - startRef.current));
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(iv);
        onExpire();
      }
    }, 100);

    return () => clearInterval(iv);
  }, [durationMs, onExpire]);

  const pct  = remaining / durationMs;
  const secs = Math.ceil(remaining / 1000);
  const mins = Math.floor(secs / 60);
  const s    = secs % 60;
  const timeStr = mins > 0 ? `${mins}:${String(s).padStart(2, '0')}` : `${s}s`;
  const circ    = 2 * Math.PI * 28;
  const offset  = circ * (1 - pct);
  const color   = pct > 0.5 ? accent : pct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r="28" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{timeStr}</span>
        </div>
      </div>
      {label && <span className="text-white/50 text-xs">{label}</span>}
    </div>
  );
}
