'use client';
import { useEffect, useRef } from 'react';
import type { EmotionInsight } from '@/lib/emotionScoring';

interface EmotionRadarChartProps {
  insights: EmotionInsight[];
  size?: number;
}

export function EmotionRadarChart({ insights, size = 280 }: EmotionRadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || insights.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.36;
    const n = insights.length;

    function angleFor(i: number) {
      return (i / n) * Math.PI * 2 - Math.PI / 2;
    }

    // Grid rings
    ctx.clearRect(0, 0, size, size);
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = angleFor(i);
        const rr = (ring / 4) * r;
        const x = cx + rr * Math.cos(a);
        const y = cy + rr * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Spokes
    for (let i = 0; i < n; i++) {
      const a = angleFor(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon — animated fill
    const points = insights.map((ins, i) => {
      const a = angleFor(i);
      const rr = (ins.score / 100) * r;
      return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
    });

    // Gradient fill
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(124,58,237,0.5)');
    grad.addColorStop(1, 'rgba(124,58,237,0.05)');

    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dots + colors
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = insights[i].color;
      ctx.fill();
      ctx.strokeStyle = '#0a0a1a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Labels
    ctx.font = `bold 11px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    insights.forEach((ins, i) => {
      const a = angleFor(i);
      const labelR = r + 28;
      const lx = cx + labelR * Math.cos(a);
      const ly = cy + labelR * Math.sin(a);
      ctx.fillStyle = ins.color;
      ctx.fillText(ins.emoji, lx, ly - 7);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.fillText(`${ins.score}`, lx, ly + 7);
      ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    });
  }, [insights, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="drop-shadow-[0_0_24px_rgba(124,58,237,0.4)]"
    />
  );
}
