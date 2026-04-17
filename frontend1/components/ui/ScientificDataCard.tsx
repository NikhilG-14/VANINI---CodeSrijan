'use client';
import { motion } from 'framer-motion';
import type { GameResult, CognitiveInsight } from '@/lib/types';
import { getScientificMetrics, SessionParameter } from '@/lib/cognitiveScoring';
import { 
  Zap, 
  Brain, 
  Activity, 
  Target, 
  ShieldCheck, 
  Hexagon,
  ChevronRight,
  ClipboardCheck
} from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Props {
  insight: CognitiveInsight;
  result?: GameResult | any;
  index: number;
  onOpenDetails: (insight: CognitiveInsight, params: SessionParameter[]) => void;
}

const COGNITIVE_ICONS: Record<string, any> = {
  attention: Zap,
  memory: Brain,
  impulsivity: Target,
  flexibility: Activity,
  risk_behavior: ShieldCheck
};

export function ScientificDataCard({ insight, result, index, onOpenDetails }: Props) {
  const getStatus = (s: number) => {
    if (s >= 75) return { label: 'OPTIMAL', color: '#10b981' };
    if (s >= 40) return { label: 'MODERATE', color: '#f59e0b' };
    return { label: 'ELEVATED RISK', color: '#ef4444' };
  };

  const status = getStatus(insight.score);
  const params = getScientificMetrics(insight.cognitive, result);
  const Icon = COGNITIVE_ICONS[insight.cognitive] || Hexagon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      className="w-full"
    >
      <GlassCard intensity="medium" hoverGlow className="p-8 flex flex-col gap-8 h-full">
        {/* Header */}
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white/50 border border-white/10 luxury-shadow"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <Icon size={24} style={{ color: insight.color }} />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-[0.2em]">{insight.label}</h4>
              <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mt-1 italic">
                {insight.gameName}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
             <div className="text-3xl font-black tracking-tighter italic" style={{ color: insight.color, textShadow: `0 0 20px ${insight.color}33` }}>
                {insight.score}<span className="text-[10px] ml-1 opacity-20">%</span>
             </div>
             <div
              className="mt-2 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-[0.3em]"
              style={{ color: status.color, borderColor: `${status.color}30`, backgroundColor: `${status.color}05` }}
            >
              {status.label}
            </div>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-2 gap-3">
          {params.length > 0 ? params.map((p) => (
            <div key={p.label} className="bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/20 transition-all group">
              <span className="text-white/20 text-[8px] font-black uppercase tracking-[0.3em] leading-tight w-full truncate mb-3" title={p.desc || p.label}>
                {p.label}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white font-black text-xl italic tabular-nums">{p.value}</span>
                <span className="text-white/20 text-[9px] font-black uppercase tracking-widest">{p.unit}</span>
              </div>
            </div>
          )) : (
            <div className="col-span-2 py-10 flex flex-col items-center justify-center gap-4 opacity-10">
               <Hexagon size={32} />
               <span className="text-[9px] font-black uppercase tracking-[0.4em]">Ready_To_Sync</span>
            </div>
          )}
        </div>

        {/* Action */}
        <button 
          onClick={() => onOpenDetails(insight, params)}
          className="group relative mt-2 w-full py-5 rounded-2xl bg-white/[0.03] border border-white/10 text-white/40 font-black text-[10px] uppercase tracking-[0.5em] transition-all hover:bg-violet-600/10 hover:border-violet-500/30 hover:text-violet-300"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
             <ClipboardCheck size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
             Predict Outcome
             <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </GlassCard>
    </motion.div>
  );
}
