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

  // Data extraction helper with multi-key support
  const get = (obj: any, keys: string[]) => {
    for (const key of keys) {
      if (obj[key] != null) return obj[key];
    }
    return null;
  };

  switch (insight.cognitive) {
    case 'attention':
      const accAtt = get(raw, ['accuracy', 'acc']);
      const inRTAtt = get(raw, ['incongruentRT', 'incongruent_rt', 'incon_rt']);
      const confRTAtt = get(raw, ['interferenceScale', 'interference_scale', 'interference']);
      return [
        { label: 'Mean LT', value: rtDisplay },
        { label: 'Att Acc', value: accAtt != null ? `${Math.round(accAtt * 100)}%` : `${Math.round(((total - errors) / total) * 100)}%` },
        { label: 'Fails', value: `${errors}` },
        { label: 'Incongruent RT', value: inRTAtt ? `${Math.round(inRTAtt)}ms` : '—' },
        { label: 'Interference', value: confRTAtt ? `${Number(confRTAtt).toFixed(1)}x` : '—' },
      ];
    case 'memory':
      const accMem = get(raw, ['accuracy', 'acc']);
      const hitsMem = get(raw, ['hits', 'correct_hits']);
      const faMem = get(raw, ['falsePositives', 'false_positives', 'fa']);
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Recall Acc', value: accMem != null ? `${Math.round(accMem * 100)}%` : '—' },
        { label: 'Hits', value: hitsMem != null ? `${hitsMem}` : `${total - errors}` },
        { label: 'FA/Errors', value: faMem != null ? `${faMem}` : `${errors}` },
        { label: 'N-Level', value: '2-Back' },
      ];
    case 'impulsivity':
      const commImp = get(raw, ['commissionErrors', 'commission_errors', 'failed_inhib']);
      const omImp = get(raw, ['omissionErrors', 'omission_errors', 'missed_go']);
      const nogoImp = get(raw, ['totalNoGo', 'total_no_go', 'no_go_count']);
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Failed Inhib', value: commImp != null ? `${commImp}` : `${errors}` },
        { label: 'Missed Go', value: omImp != null ? `${omImp}` : '—' },
        { label: 'Total Trials', value: `${total}` },
        { label: 'Control Rate', value: commImp != null && nogoImp ? `${Math.round((1 - commImp / nogoImp) * 100)}%` : '—' },
      ];
    case 'flexibility':
      const pesFlex = get(raw, ['perseverativeErrors', 'perseverative_errors', 'stickiness']);
      const shiftFlex = get(raw, ['ruleShifts', 'rule_shifts', 'shifts']);
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Stickiness', value: pesFlex != null ? `${pesFlex}` : `${errors}` },
        { label: 'Successes', value: `${total - errors}` },
        { label: 'Rule Shifts', value: shiftFlex != null ? `${shiftFlex}` : '—' },
      ];
    case 'risk_behavior':
      const pumpsBART = get(raw, ['avgPumps', 'avg_pumps', 'pumps']);
      const popBART = get(raw, ['poppedRatio', 'popped_ratio', 'burst_rate']);
      const scoreBART = get(raw, ['totalScore', 'total_score', 'score']);
      return [
        { label: 'Avg Pumps', value: pumpsBART != null ? Number(pumpsBART).toFixed(1) : '—' },
        { label: 'Burst Rate', value: popBART != null ? `${Math.round(popBART * 100)}%` : '—' },
        { label: 'Total Score', value: scoreBART != null ? `${scoreBART}pts` : '—' },
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