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
  const rt = avg(result.reactionTimeMs ?? []);
  const rtDisplay = rt > 0 ? `${rt}ms` : '—';

  switch (insight.cognitive) {
    case 'attention':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Accuracy', value: result.rawData?.accuracy != null ? `${Math.round((result.rawData.accuracy as number) * 100)}%` : '—' },
        { label: 'Congruent RT', value: result.rawData?.congruentRT ? `${Math.round(result.rawData.congruentRT as number)}ms` : '—' },
        { label: 'Incongruent RT', value: result.rawData?.incongruentRT ? `${Math.round(result.rawData.incongruentRT as number)}ms` : '—' },
        { label: 'Errors', value: `${result.errorCount}` },
        { label: 'Trials', value: `${result.totalActions}` },
      ];
    case 'memory':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Accuracy', value: result.rawData?.accuracy != null ? `${Math.round((result.rawData.accuracy as number) * 100)}%` : '—' },
        { label: 'Hits', value: result.rawData?.hits != null ? `${result.rawData.hits}` : '—' },
        { label: 'False Alarms', value: result.rawData?.falsePositives != null ? `${result.rawData.falsePositives}` : '—' },
        { label: 'Sequences', value: `${result.totalActions}` },
        { label: 'N Level', value: '2-Back' },
      ];
    case 'impulsivity':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Commission Err', value: result.rawData?.commissionErrors != null ? `${result.rawData.commissionErrors}` : `${result.errorCount}` },
        { label: 'Omission Err', value: result.rawData?.omissionErrors != null ? `${result.rawData.omissionErrors}` : '—' },
        { label: 'Total Trials', value: `${result.totalActions}` },
        { label: 'No-Go Count', value: result.rawData?.totalNoGo != null ? `${result.rawData.totalNoGo}` : '—' },
        { label: 'Inhibition Rate', value: result.rawData?.commissionErrors != null && result.rawData?.totalNoGo ? `${Math.round((1 - (result.rawData.commissionErrors as number) / (result.rawData.totalNoGo as number)) * 100)}%` : '—' },
      ];
    case 'flexibility':
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Persev. Errors', value: result.rawData?.perseverativeErrors != null ? `${result.rawData.perseverativeErrors}` : `${result.errorCount}` },
        { label: 'Total Trials', value: `${result.totalActions}` },
        { label: 'Accuracy', value: result.totalActions > 0 ? `${Math.round(((result.totalActions - result.errorCount) / result.totalActions) * 100)}%` : '—' },
        { label: 'Rule Shifts', value: result.rawData?.ruleShifts != null ? `${result.rawData.ruleShifts}` : '—' },
        { label: 'Adapt. Speed', value: result.rawData?.adaptationTime ? `${result.rawData.adaptationTime}ms` : '—' },
      ];
    case 'risk_behavior':
      return [
        { label: 'Avg Pumps', value: result.rawData?.avgPumps != null ? (result.rawData.avgPumps as number).toFixed(1) : '—' },
        { label: 'Pop Rate', value: result.rawData?.poppedRatio != null ? `${Math.round((result.rawData.poppedRatio as number) * 100)}%` : '—' },
        { label: 'Total Balloons', value: `${result.totalActions}` },
        { label: 'Score', value: result.rawData?.totalScore != null ? `${result.rawData.totalScore}pts` : '—' },
        { label: 'Mean Gap RT', value: rtDisplay },
        { label: 'Popped', value: `${result.errorCount}` },
      ];
    default:
      return [
        { label: 'Mean RT', value: rtDisplay },
        { label: 'Errors', value: `${result.errorCount}` },
      ];
  }
}

export function MetricCard({ insight, result, index }: Props) {
  const metrics = getGameSpecificMetrics(insight, result);
  const hasData = result && (result.totalActions > 0 || result.errorCount > 0 || (result.reactionTimeMs ?? []).length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card rounded-2xl p-8 group relative overflow-hidden hover:bg-white/[0.07] hover:border-white/20 transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border-white/5"
    >
      {/* Background Glow */}
      <div
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: insight.color }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-2xl transition-transform group-hover:scale-110"
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
            <div
              className="text-3xl font-black"
              style={{ color: insight.color, textShadow: `0 0 20px ${insight.color}66` }}
            >
              {insight.score}%
            </div>
            {!hasData && (
              <div className="text-[9px] text-amber-500/70 font-black uppercase tracking-widest mt-1">No Data</div>
            )}
          </div>
        </div>

        {/* Score Bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-6">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: insight.color }}
            initial={{ width: 0 }}
            animate={{ width: `${insight.score}%` }}
            transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: 'easeOut' }}
          />
        </div>

        <p className="text-white/70 text-sm leading-relaxed mb-6 font-medium italic">
          &ldquo;{insight.insight}&rdquo;
        </p>

        {/* Raw Data Grid */}
        {hasData ? (
          <div className="bg-black/20 rounded-xl p-5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Raw Metrics</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-black text-emerald-400 uppercase border border-emerald-500/20">Verified</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {metrics.map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-white/30 text-[8px] font-black uppercase tracking-wider">{label}</p>
                  <p className="text-white font-black text-sm tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/5">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-wider mb-1.5">Calculation Logic</p>
              <p className="text-white/50 text-[10px] leading-relaxed">{getLogicText(insight.cognitive)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 text-center">
            <p className="text-amber-500/60 text-[11px] font-bold">Game not completed — score estimated from baseline.</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 flex items-start gap-3">
          <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-emerald-500/10 text-emerald-400 text-xs mt-0.5">⚡</div>
          <p className="text-white/70 text-xs font-bold leading-relaxed">{insight.suggestion}</p>
        </div>
      </div>
    </motion.div>
  );
}

function getLogicText(key: string) {
  switch (key) {
    case 'attention':    return 'Accuracy × 90 − Stroop interference penalty (incongruent/congruent RT ratio) + speed bonus for sub-600ms responses.';
    case 'memory':       return 'Hit rate accuracy × 100 − false alarm rate × 60. Rewards correct matches while heavily penalizing incorrect responses.';
    case 'impulsivity':  return 'Commission errors ÷ total No-Go stimuli × 100. Measures how often you responded when you should have withheld.';
    case 'flexibility':  return '100 − perseverative error rate × 200 + activity bonus. Perseverative errors = applying outdated rules after a shift.';
    case 'risk_behavior': return 'Avg pumps ÷ 18 (risk threshold) × 100, adjusted by pop ratio vs. 30% baseline. Higher = more risk-seeking.';
    default:             return 'Analyzed via standardized behavioral parameters.';
  }
}
