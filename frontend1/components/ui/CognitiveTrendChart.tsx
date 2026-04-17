'use client';
import { useEffect, useRef } from 'react';
import { CognitiveKey } from '@/lib/types';

interface SessionData {
  date: string;
  scores: Record<string, number>;
}

interface Props {
  history: SessionData[];
  size?: { width: number; height: number };
}

const COLORS: Record<string, string> = {
  attention: '#3b82f6',
  memory: '#8b5cf6',
  impulsivity: '#ef4444',
  flexibility: '#10b981',
  risk_behavior: '#f59e0b',
};

export function CognitiveTrendChart({ history, size = { width: 600, height: 300 } }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.scale(dpr, dpr);

    const padding = { top: 40, right: 30, bottom: 40, left: 50 };
    const chartW = size.width - padding.left - padding.right;
    const chartH = size.height - padding.top - padding.bottom;

    const domains: CognitiveKey[] = ['attention', 'memory', 'impulsivity', 'flexibility', 'risk_behavior'];

    const draw = () => {
      ctx.clearRect(0, 0, size.width, size.height);

      // Grid Lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (i / 4) * chartH;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartW, y);
        ctx.stroke();

        // Y Labels
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '9px font-mono';
        ctx.textAlign = 'right';
        ctx.fillText(`${100 - i * 25}%`, padding.left - 10, y + 3);
      }

      const pointCount = history.length;
      const getX = (i: number) => padding.left + (pointCount > 1 ? (i / (pointCount - 1)) * chartW : chartW / 2);
      const getY = (score: number) => padding.top + chartH - (score / 100) * chartH;

      // Draw Lines for each domain
      domains.forEach(domain => {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = COLORS[domain];
        
        history.forEach((session, i) => {
          const score = session.scores[domain] ?? 50;
          const px = getX(i);
          const py = getY(score);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Points
        history.forEach((session, i) => {
          const score = session.scores[domain] ?? 50;
          ctx.beginPath();
          ctx.arc(getX(i), getY(score), 3, 0, Math.PI * 2);
          ctx.fillStyle = '#060a14';
          ctx.fill();
          ctx.strokeStyle = COLORS[domain];
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      });

      // X Labels
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      history.forEach((session, i) => {
        if (pointCount > 5 && i % Math.ceil(pointCount / 5) !== 0) return;
        const date = new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        ctx.fillText(date, getX(i), size.height - 15);
      });
    };

    draw();
  }, [history, size]);

  return (
    <div className="relative group">
        <canvas ref={canvasRef} className="max-w-full" />
        {history.length < 2 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl">
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">Awaiting longitudinal data sync...</p>
            </div>
        )}
    </div>
  );
}
