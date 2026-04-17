'use client';
import { motion } from 'framer-motion';
import type { GameResult, CognitiveInsight } from '@/lib/types';

interface Props {
  insight: CognitiveInsight;
  result?: GameResult;
  index: number;
}

export function MetricCard({ insight, result, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-[2.5rem] p-8 group relative overflow-hidden hover:bg-white/[0.05] transition-all"
    >
      {/* Background Glow */}
      <div 
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: insight.color }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${insight.color}15`, border: `1px solid ${insight.color}30` }}
            >
              {insight.emoji}
            </div>
            <div>
              <h4 className="text-white font-black text-sm tracking-widest uppercase mb-1">{insight.label}</h4>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Cognitive Signature</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white" style={{ textShadow: `0 0 20px ${insight.color}44` }}>
              {insight.score}%
            </div>
          </div>
        </div>

        <p className="text-white/70 text-sm leading-relaxed mb-8 font-medium italic">
          "{insight.insight}"
        </p>

        {/* Raw Data Breakdown */}
        {result && (
          <div className="bg-black/20 rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Raw Metrics</span>
              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] font-black text-white/50 uppercase">Verified</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-wider">Mean RT</p>
                <p className="text-white font-black text-sm">
                  {result.reactionTimeMs.length > 0 
                    ? Math.round(result.reactionTimeMs.reduce((a, b) => a + b, 0) / result.reactionTimeMs.length)
                    : 0}ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-white/40 text-[9px] font-black uppercase tracking-wider">Errors</p>
                <p className="text-white font-black text-sm">{result.errorCount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-wider mb-2">Calculation Logic</p>
              <p className="text-white/60 text-[10px] leading-relaxed font-medium bg-white/5 p-3 rounded-lg border border-white/5">
                {getLogicText(insight.cognitive)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 text-xs">⚡</div>
          <p className="text-white/80 text-xs font-bold leading-relaxed">{insight.suggestion}</p>
        </div>
      </div>
    </motion.div>
  );
}

function getLogicText(key: string) {
  switch(key) {
    case 'attention': return "Calculated via Stroop Interference Effect: Accuracy penalty applied to the reaction time delay between incongruent and congruent stimuli.";
    case 'memory': return "Based on N-Back accuracy and retention: Measures the capacity to update and store sequential information under load.";
    case 'impulsivity': return "Derived from Go/No-Go commission errors: Quantifies the ability to inhibit a prepotent response during rapid stimulus changes.";
    case 'flexibility': return "Measured by perseverance in rule shifts: Assesses the speed of adaptation and the reduction of outdated response patterns.";
    case 'risk_behavior': return "Based on BART pump thresholds: Evaluates the trade-off between reward accumulation and penalty sensitivity.";
    default: return "Analyzed via standardized behavioral parameters.";
  }
}
