'use client';

import { motion } from 'framer-motion';
import type { GameResult, CognitiveInsight } from '@/lib/types';

interface Props {
  insight: CognitiveInsight;
  result?: GameResult;
  index: number;
  onDeepAnalyze: (insight: CognitiveInsight, metrics: { label: string; value: string }[]) => void;
}

function avg(arr: number[]) {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}

function getGameSpecificMetrics(insight: CognitiveInsight, result?: GameResult): { label: string; value: string }[] {
  if (!result) return [];
  const rt = avg(result.reactionTimeMs ?? (result as any).reaction_time_ms ?? []);
  const rtDisplay = rt > 0 ? `${rt}ms` : '—';
  const total = result.totalActions || (result as any).total_actions || 1;
  const errors = result.errorCount ?? (result as any).error_count ?? 0;
  const raw = result.rawData || (result as any).raw_data || {};

  switch (insight.cognitive) {
    case 'attention':
      return [
        { label: 'Mean LT', value: rtDisplay },
        { label: 'Att Acc', value: (raw.accuracy ?? raw.accuracy) != null ? `${Math.round(((raw.accuracy ?? raw.accuracy) as number) * 100)}%` : `${Math.round(((total - errors) / total) * 100)}%` },
        { label: 'Fails', value: `${errors}` },
        { label: 'Incongruent RT', value: (raw.incongruentRT ?? raw.incongruent_rt) ? `${Math.round((raw.incongruentRT ?? raw.incongruent_rt) as number)}ms` : '—' },
        { label: 'Interference', value: (raw.interferenceScale ?? raw.interference_scale) ? `${((raw.interferenceScale ?? raw.interference_scale) as number).toFixed(1)}x` : '—' },
      ];
    case 'memory':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Recall Acc', value: (raw.accuracy ?? raw.accuracy) != null ? `${Math.round(((raw.accuracy ?? raw.accuracy) as number) * 100)}%` : '—' },
        { label: 'Hits', value: (raw.hits ?? raw.hits) != null ? `${raw.hits ?? raw.hits}` : `${total - errors}` },
        { label: 'FA/Errors', value: (raw.falsePositives ?? raw.false_positives) != null ? `${raw.falsePositives ?? raw.false_positives}` : `${errors}` },
        { label: 'N-Level', value: '2-Back' },
      ];
    case 'impulsivity':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Failed Inhib', value: (raw.commissionErrors ?? raw.commission_errors) != null ? `${raw.commissionErrors ?? raw.commission_errors}` : `${errors}` },
        { label: 'Missed Go', value: (raw.omissionErrors ?? raw.omission_errors) != null ? `${raw.omissionErrors ?? raw.omission_errors}` : '—' },
        { label: 'Total Trials', value: `${total}` },
        { label: 'Control Rate', value: (raw.commissionErrors ?? raw.commission_errors) != null && (raw.totalNoGo ?? raw.total_no_go) ? `${Math.round((1 - ((raw.commissionErrors ?? raw.commission_errors) as number) / ((raw.totalNoGo ?? raw.total_no_go) as number)) * 100)}%` : '—' },
      ];
    case 'flexibility':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Stickiness', value: (raw.perseverativeErrors ?? raw.perseverative_errors) != null ? `${raw.perseverativeErrors ?? raw.perseverative_errors}` : `${errors}` },
        { label: 'Successes', value: `${total - errors}` },
        { label: 'Rule Shifts', value: (raw.ruleShifts ?? raw.rule_shifts) != null ? `${raw.ruleShifts ?? raw.rule_shifts}` : '—' },
      ];
    case 'risk_behavior':
      return [
        { label: 'Avg Pumps', value: (raw.avgPumps ?? raw.avg_pumps) != null ? ((raw.avgPumps ?? raw.avg_pumps) as number).toFixed(1) : '—' },
        { label: 'Burst Rate', value: (raw.poppedRatio ?? raw.popped_ratio) != null ? `${Math.round(((raw.poppedRatio ?? raw.popped_ratio) as number) * 100)}%` : '—' },
        { label: 'Total Score', value: (raw.totalScore ?? raw.total_score) != null ? `${raw.totalScore ?? raw.total_score}pts` : '—' },
        { label: 'Successes', value: `${total - errors}` },
      ];
    default:
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Errors', value: `${errors}` },
      ];
  }
}

export function MetricCard({ insight, result, index, onDeepAnalyze }: Props) {
  const getStatus = (s: number) => {
    if (s >= 75) return { label: 'STRONG', color: '#34d399' };
    if (s >= 40) return { label: 'OPTIMAL', color: '#9333ea' };
    return { label: 'CONTROLLED', color: '#f59e0b' };
  };

  const status = getStatus(insight.score);
  const metrics = getGameSpecificMetrics(insight, result);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-[2.5rem] p-8 flex flex-col gap-6 relative group border-white/5 transition-all hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <div className="text-6xl font-black tracking-tighter text-white" style={{ textShadow: `0 0 40px ${insight.color}33` }}>
            {insight.score}
          </div>
          <div className="flex flex-col">
            <h4 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">{insight.label}</h4>
            <div
              className="mt-1 self-start px-3 py-0.5 rounded-full border border-white/10 bg-white/5 text-[8px] font-black uppercase tracking-[0.2em]"
              style={{ color: status.color, borderColor: `${status.color}33` }}
            >
              {status.label}
            </div>
          </div>
        </div>
        
        <p className="text-[11px] text-white/40 leading-relaxed font-medium max-w-[180px] text-right">
          {insight.insight.length > 120 ? insight.insight.substring(0, 120) + '...' : insight.insight}
        </p>
      </div>

      <div className="w-full h-px bg-white/5" />

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-6 overflow-x-hidden">
          {metrics.slice(0, 3).map((m, idx) => (
            <div key={idx} className="flex flex-col gap-0.5 min-w-[60px]">
              <span className="text-[8px] font-black tracking-widest text-white/20 uppercase truncate">{m.label}</span>
              <span className="text-sm font-black italic text-white/80">{m.value}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={() => onDeepAnalyze(insight, metrics)}
          className="shrink-0 px-6 py-3 rounded-xl bg-violet-600/10 hover:bg-violet-600/30 border border-violet-500/20 text-violet-400 font-black text-[9px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
        >
          Deep Perspective
        </button>
      </div>

      <div className="absolute bottom-0 left-8 right-8 h-1 overflow-hidden opacity-30 group-hover:opacity-100 transition-opacity">
        <div className="h-full rounded-full" style={{ width: `${insight.score}%`, backgroundColor: insight.color }} />
      </div>
    </motion.div>
  );
}