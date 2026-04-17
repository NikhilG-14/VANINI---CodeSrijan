'use client';
import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles, Activity, ChevronRight, Hexagon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Props {
  insights: string[];
  isLoading: boolean;
  onOpenFull: () => void;
}

export function InsightList({ insights, isLoading, onOpenFull }: Props) {
  const displayPoints = insights.slice(0, 4);
  const hasMore = insights.length > 4;

  return (
    <div className="w-full h-full">
      <GlassCard intensity="high" className="p-10 flex flex-col gap-8 h-full min-h-[500px] justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-violet-500/5 blur-[120px] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/5 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 luxury-shadow">
              <BrainCircuit size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em]">AI Clinical Inference</h3>
              </div>
              <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em] mt-1 italic">VANI_BEHAVIORAL_NARRATIVE.LOG</p>
            </div>
          </div>
          <span className="px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-violet-400 text-[8px] font-black uppercase tracking-[0.3em]">Live_Sync</span>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex flex-col gap-5 flex-1 justify-center">
          {isLoading ? (
            <div className="flex flex-col gap-6 py-10">
              <div className="space-y-3">
                 <div className="w-3/4 h-3 bg-white/5 rounded-full animate-pulse" />
                 <div className="w-full h-3 bg-white/5 rounded-full animate-pulse" />
                 <div className="w-5/6 h-3 bg-white/5 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center gap-4 text-violet-400/40">
                 <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                 >
                    <Hexagon size={16} />
                 </motion.div>
                 <span className="text-[9px] font-black uppercase tracking-[0.4em] italic animate-pulse">Filtering telemetry noise...</span>
              </div>
            </div>
          ) : insights.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center opacity-20">
               <Sparkles size={40} />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Awaiting behavioral stream...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {displayPoints.map((pt, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: i * 0.1 }}
                  className="group flex items-start gap-5 p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-violet-500/20 transition-all"
                >
                  <Activity size={14} className="mt-1 text-violet-500/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="text-sm text-white/70 leading-relaxed font-medium tracking-tight">
                    {pt.replace(/^[-*•]\s*/, '')}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Action */}
        {hasMore && !isLoading && (
          <button 
            onClick={onOpenFull}
            className="group relative z-10 w-full py-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white/40 font-black text-[10px] uppercase tracking-[0.5em] transition-all hover:bg-white/5 hover:text-white"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
               Load Full 8-Point Analysis
               <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        )}
      </GlassCard>
    </div>
  );
}
