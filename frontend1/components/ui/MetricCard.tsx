'use client';

import { motion } from 'framer-motion';
import type { GameResult, CognitiveInsight } from '@/lib/types';

interface Props {
  insight: CognitiveInsight;
  result?: GameResult;
  index: number;
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
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Overall Acc', value: raw.accuracy != null ? `${Math.round((raw.accuracy as number) * 100)}%` : `${Math.round(((total - errors) / total) * 100)}%` },
        { label: 'Hits', value: `${total - errors}` },
        { label: 'Fails', value: `${errors}` },
        { label: 'Incongruent RT', value: raw.incongruentRT ? `${Math.round(raw.incongruentRT as number)}ms` : '—' },
        { label: 'Total Trials', value: `${total}` },
      ];
    case 'memory':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Recall Acc', value: raw.accuracy != null ? `${Math.round((raw.accuracy as number) * 100)}%` : '—' },
        { label: 'Hits', value: raw.hits != null ? `${raw.hits}` : `${total - errors}` },
        { label: 'Fails/FA', value: raw.falsePositives != null ? `${raw.falsePositives}` : `${errors}` },
        { label: 'Sequences', value: `${total}` },
        { label: 'N Level', value: '2-Back' },
      ];
    case 'impulsivity':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Failed Inhib', value: raw.commissionErrors != null ? `${raw.commissionErrors}` : `${errors}` },
        { label: 'Missed Go', value: raw.omissionErrors != null ? `${raw.omissionErrors}` : '—' },
        { label: 'Hits/Correct', value: `${total - errors}` },
        { label: 'No-Go Count', value: raw.totalNoGo != null ? `${raw.totalNoGo}` : '—' },
        { label: 'Control Rate', value: raw.commissionErrors != null && raw.totalNoGo ? `${Math.round((1 - (raw.commissionErrors as number) / (raw.totalNoGo as number)) * 100)}%` : '—' },
      ];
    case 'flexibility':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Stickiness', value: raw.perseverativeErrors != null ? `${raw.perseverativeErrors}` : `${errors}` },
        { label: 'Success', value: `${total - errors}` },
        { label: 'Shift Rate', value: total > 0 ? `${Math.round(((total - errors) / total) * 100)}%` : '—' },
        { label: 'Rule Shifts', value: raw.ruleShifts != null ? `${raw.ruleShifts}` : '—' },
        { label: 'Fails', value: `${errors}` },
      ];
    case 'risk_behavior':
      return [
        { label: 'Avg Pumps', value: raw.avgPumps != null ? (raw.avgPumps as number).toFixed(1) : '—' },
        { label: 'Burst Rate', value: raw.poppedRatio != null ? `${Math.round((raw.poppedRatio as number) * 100)}%` : '—' },
        { label: 'Successes', value: `${total - errors}` },
        { label: 'Risk Score', value: raw.totalScore != null ? `${raw.totalScore}pts` : '—' },
        { label: 'Fails/Bursts', value: `${errors}` },
        { label: 'Total Trials', value: `${total}` },
      ];
    default:
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Errors', value: `${errors}` },
      ];
  }
}

export function MetricCard({ insight, result, index }: Props) {
  const getStatus = (s: number) => {
    if (s >= 75) return { label: 'STRONG', color: '#34d399' };
    if (s >= 40) return { label: 'OPTIMAL', color: '#9333ea' };
    return { label: 'CONTROLLED', color: '#f59e0b' };
  };

  const status = getStatus(insight.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-[2rem] p-8 flex items-center justify-between gap-8 h-[200px] relative group border-white/5 active:scale-95 transition-transform"
    >
      <div className="flex flex-col">
        <div className="text-7xl font-black tracking-tighter text-white" style={{ textShadow: `0 0 40px ${insight.color}33` }}>
          {insight.score}
        </div>
        <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-2">{insight.label}</h4>
      </div>

      <div className="flex-1 flex flex-col items-end text-right h-full justify-between py-2">
        <div
          className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-[0.2em]"
          style={{ color: status.color, borderColor: `${status.color}33` }}
        >
          {status.label}
        </div>

        <p className="text-[11px] text-white/60 leading-relaxed font-medium max-w-[200px]">
          {insight.insight.length > 100 ? insight.insight.substring(0, 100) + '...' : insight.insight}
        </p>

        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full" style={{ width: `${insight.score}%`, backgroundColor: insight.color }} />
        </div>
      </div>
    </motion.div>
  );
}