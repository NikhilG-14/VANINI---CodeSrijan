'use client';
import { useEffect, useRef } from 'react';
import type { CognitiveInsight } from '@/lib/types';

interface Props {
  insights: CognitiveInsight[];
  size?: number;
}

export function CognitiveRadarChart({ insights, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !insights.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const r  = size * 0.28; // Reduced to give more room for labels
    const n  = insights.length;
    const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;

    let progress = 0;
    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Background Pulse Glow
      const pulseScale = 1 + Math.sin(Date.now() / 1500) * 0.03;
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * pulseScale);
      bgGrad.addColorStop(0, 'rgba(124,58,237,0.03)');
      bgGrad.addColorStop(0.5, 'rgba(124,58,237,0.01)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.5 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Grid rings
      for (let ring = 1; ring <= 4; ring++) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = angle(i), rr = (ring / 4) * r;
          i === 0 ? ctx.moveTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
                  : ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Spokes
      for (let i = 0; i < n; i++) {
        const a = angle(i);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Data polygon with animation progress
      const pts = insights.map((ins, i) => {
        const a = angle(i), rr = ((ins.score * progress) / 100) * r;
        return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
      });

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, 'rgba(124,58,237,0.5)'); 
      grad.addColorStop(1, 'rgba(124,58,237,0.05)');

      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Dots
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = insights[i].color;
        ctx.fill();
        ctx.strokeStyle = '#060a14';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // Labels 
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      insights.forEach((ins, i) => {
        const a = angle(i), lr = r + 45; // More distance for label text
        const lx = cx + lr * Math.cos(a);
        const ly = cy + lr * Math.sin(a);
        
        // Emoji
        ctx.font = '16px serif';
        ctx.fillText(ins.emoji, lx, ly - 14);
        
        // Score
        ctx.font = 'bold 12px Inter, system-ui';
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillText(`${ins.score}%`, lx, ly + 2);
        
        // Game Name
        ctx.font = 'bold 9px Inter, system-ui'; 
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(ins.gameName?.toUpperCase() || '', lx, ly + 14);
      });

      if (progress < 1) {
        progress += 0.02; // Animation speed
        animationId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [insights, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="drop-shadow-[0_0_24px_rgba(124,58,237,0.4)]"
    />
  );
}
