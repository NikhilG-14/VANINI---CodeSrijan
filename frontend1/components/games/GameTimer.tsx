'use client';
import { useEffect, useState, useRef } from 'react';

interface Props {
  durationMs: number;
  timeLeftMs: number;
  accent?: string;
  label?: string;
}

export function GameTimer({ durationMs, timeLeftMs, accent = '#7c3aed', label }: Props) {
  const pct  = timeLeftMs / durationMs;
  const secs = Math.ceil(timeLeftMs / 1000);
  const mins = Math.floor(secs / 60);
  const s    = secs % 60;
  const timeStr = mins > 0 ? `${mins}:${String(s).padStart(2, '0')}` : `${s}s`;
  const circ    = 2 * Math.PI * 28;
  const offset  = circ * (1 - pct);
  const color   = pct > 0.5 ? accent : pct > 0.25 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20 shadow-2xl rounded-full bg-black/20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r="28" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center filter drop-shadow-md">
          <span className="text-white font-bold text-sm tracking-wide">{timeStr}</span>
        </div>
      </div>
      {label && <span className="text-white/50 text-[10px] uppercase tracking-widest font-bold">{label}</span>}
    </div>
  );
}

