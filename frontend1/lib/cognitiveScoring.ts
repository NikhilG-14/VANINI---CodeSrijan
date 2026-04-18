import type { GameResult, CognitiveKey, CognitiveScores, CognitiveInsight } from './types';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * calculateScores — derives a 0-100 score for each cognitive domain from raw game telemetry.
 * Each game contributes exactly one domain score based on its specific clinical metrics.
 */
export function calculateScores(results: GameResult[]): CognitiveScores {
  const s: Partial<CognitiveScores> = {};

  for (const r of results) {
    const total = r.totalActions || 1;
    const errors = r.errorCount || 0;
    const fallbackAcc = clamp((total - errors) / total, 0, 1);

    // ─────────────────────────────────────────────────────────────────────────
    // STROOP → Selective Attention
    if (r.cognitive === 'attention') {
      const acc = (r.rawData?.accuracy as number) ?? fallbackAcc;
      const conRT  = (r.rawData?.congruentRT as number) ?? 500;
      const inconRT = (r.rawData?.incongruentRT as number) ?? 500;

      const interferencePenalty = conRT > 0
        ? clamp(((inconRT - conRT) / conRT) * 50, 0, 40)
        : 0;

      const allRTs = r.reactionTimeMs ?? [];
      const meanRT = avg(allRTs);
      const speedBonus = meanRT > 0 ? clamp(10 - (meanRT / 100), 0, 10) : 0;
      let score = (acc * 90) - interferencePenalty + speedBonus;
      if (r.quitEarly) score *= 0.6; // 40% penalty for incomplete mission
      s.attention = clamp(score);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // N-BACK → Working Memory
    if (r.cognitive === 'memory') {
      const accuracy  = (r.rawData?.accuracy as number) ?? fallbackAcc;
      const falsePos  = (r.rawData?.falsePositives as number) ?? 0;
      const faRate = falsePos / Math.max(total, 1);

      const baseScore = accuracy * 100;
      const faPenalty = faRate * 60;
      let score = baseScore - faPenalty;
      if (r.quitEarly) score *= 0.5; // Memory requires full sequence comparison
      s.memory = clamp(score);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GO/NO-GO → Impulsivity
    if (r.cognitive === 'impulsivity') {
      const commErrors = (r.rawData?.commissionErrors as number) ?? errors;
      const totalNoGo  = (r.rawData?.totalNoGo as number) ?? Math.floor(total * 0.3);

      const impRate = totalNoGo > 0 ? (commErrors / totalNoGo) : (errors / total);
      let score = 100 - (impRate * 100);
      if (r.quitEarly) score *= 0.6;
      s.impulsivity = clamp(score);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WCST → Cognitive Flexibility
    if (r.cognitive === 'flexibility') {
      const pes   = (r.rawData?.perseverativeErrors as number) ?? errors;
      const peRate = pes / total;
      const activityBonus = clamp(total * 0.5, 0, 20);
      let score = 100 - (peRate * 200) + activityBonus;
      if (r.quitEarly) score *= 0.4;
      s.flexibility = clamp(score);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BART → Risk Behavior
    if (r.cognitive === 'risk_behavior') {
      const avgPumps   = (r.rawData?.avgPumps as number) ?? 5; // mid-range fallback
      const poppedRatio = (r.rawData?.poppedRatio as number) ?? (errors / total);

      const pumpScore    = clamp((avgPumps / 18) * 100);
      const popAdjust    = (poppedRatio - 0.3) * 40;
      let score = pumpScore + popAdjust;
      if (r.quitEarly) score *= 0.6;
      s.risk_behavior = clamp(score);
    }
  }

  return {
    attention:    s.attention    ?? 50,
    memory:       s.memory       ?? 50,
    impulsivity:  s.impulsivity  ?? 20,
    flexibility:  s.flexibility  ?? 50,
    risk_behavior: s.risk_behavior ?? 30,
  };
}

const META: Record<CognitiveKey, { label: string; domainTitle: string; definition: string; color: string; emoji: string; gameName: string; gameId: string }> = {
  attention: { 
    label: 'Emotional Focus',   
    domainTitle: 'Sustained Vigilant Control',
    definition: 'Selection of relevant stimuli while suppressing irrelevant emotional noise.',
    color: '#3b82f6', emoji: '🎯', gameName: 'Stroop Lab', gameId: 'stroop'
  },
  memory: { 
    label: 'Mental Capacity',    
    domainTitle: 'Iterative Working Memory',
    definition: 'Hold and manipulate complex information strings over a temporal sequence.',
    color: '#8b5cf6', emoji: '🧠', gameName: 'Nexus Memory', gameId: 'n-back'
  },
  impulsivity: { 
    label: 'Emotional Balance', 
    domainTitle: 'Inhibitory Motor Regulation',
    definition: 'Capacity to withhold automatic physiological responses to non-target stressors.',
    color: '#ef4444', emoji: '⚡', gameName: 'Glimpse Control', gameId: 'go-no-go'
  },
  flexibility: { 
    label: 'Adaptability',      
    domainTitle: 'Cognitive Set Shifting',
    definition: 'Speed of behavioral adaptation when environmental "rules" or goals change.',
    color: '#10b981', emoji: '🧩', gameName: 'Pattern Shift', gameId: 'wcst'
  },
  risk_behavior: { 
    label: 'Confidence Index',  
    domainTitle: 'Threshold Decision Calibration',
    definition: 'Risk assessment accuracy based on cumulative reward/burst probability.',
    color: '#f59e0b', emoji: '🎈', gameName: 'Aggression Flow', gameId: 'bart'
  },
};

type Level = 'high' | 'moderate' | 'low';
function level(s: number): Level {
  if (s >= 70) return 'high';
  if (s >= 35) return 'moderate';
  return 'low';
}

// ── Extended, session-specific insight text ───────────────────────────────────
const INSIGHTS: Record<CognitiveKey, Record<Level, { insight: string; suggestion: string }>> = {
  attention: {
    high:     { insight: 'You showed remarkable emotional focus today. Even under pressure, you stayed centered and reacted with clarity.', suggestion: 'Your ability to stay focused is a gift. Perhaps take a moment to appreciate this quiet strength today?' },
    moderate: { insight: 'Moderate susceptibility to cognitive interference. You slowed down on color-word conflicts but recovered well.', suggestion: 'Practice the "name the color, ignore the word" drill daily — it trains top-down inhibitory control.' },
    low:      { insight: 'High interference detected. The incongruent Stroop trials caused notable accuracy drops and reaction delays, indicating automatic reading processes are dominating.', suggestion: 'Reduce information overload in your workspace. Single-tasking and eliminating visual noise are key first steps.' },
  },
  memory: {
    high:     { insight: 'Your mental capacity is vibrant and strong. You handled multiple streams of information with ease.', suggestion: 'You have a great ability to hold things together. Don\'t forget to give your mind a little space too.' },
    moderate: { insight: 'Solid working memory with some false alarm responses — a classic trade-off when speed is prioritized over accuracy.', suggestion: 'Use chunking strategies (grouping information into 3-4 item clusters) to reduce working memory load in daily tasks.' },
    low:      { insight: 'Working memory was strained — difficulty holding the N-back window led to misses and false alarms. This often correlates with high cognitive fatigue.', suggestion: 'Take recovery breaks every 25 minutes. Sleep is the single biggest working memory restorer.' },
  },
  impulsivity: {
    high:     { insight: 'High impulsivity detected. You frequently responded to No-Go (red) stimuli, indicating difficulty suppressing automatic motor responses under time pressure.', suggestion: 'Practice "STOP" self-cuing before acting in real-life situations. Even a 200ms mental pause significantly reduces impulsive choices.' },
    moderate: { insight: 'Some impulsive responses, particularly during fast-paced sequences. This is a common trade-off between speed and caution.', suggestion: 'Introduce a brief mindfulness moment before decisions that feel automatic. The goal is to create space between stimulus and response.' },
    low:      { insight: 'Excellent inhibitory control. You successfully withheld responses to No-Go stimuli with high accuracy — a strong indicator of prefrontal regulatory capacity.', suggestion: 'Your measured approach is valuable. Ensure it does not tip into over-caution in high-stakes, time-sensitive moments.' },
  },
  flexibility: {
    high:     { insight: 'Highly flexible cognition. You rapidly detected rule shifts and updated your strategy with very few perseverative errors.', suggestion: 'You thrive in dynamic environments. Seek out roles or projects that require adaptive thinking and constant rule recalibration.' },
    moderate: { insight: 'Moderate set-shifting ability. You adapted to rule changes, but perseverative errors showed some stickiness to previous strategies.', suggestion: 'When facing change, explicitly articulate "the old rule is X, the new rule is Y" to yourself. Naming the shift accelerates adaptation.' },
    low:      { insight: 'Significant perseveration detected. You continued applying an outdated rule even after receiving negative feedback — a pattern linked to habitual thinking under pressure.', suggestion: 'Challenge a daily routine deliberately. Change your commute route, your lunch order, or your morning schedule to train cognitive flexibility.' },
  },
  risk_behavior: {
    high:     { insight: 'High risk-seeking profile. You consistently pumped balloons past safe thresholds, absorbing significant losses for potential gain.', suggestion: 'Examine if this pattern mirrors real-life decision-making. Expected value thinking (probability × outcome) can help calibrate risk assessment.' },
    moderate: { insight: 'Balanced risk profile. You found a reasonable equilibrium between pumping for reward and collecting before burst — a sign of healthy cost-benefit processing.', suggestion: 'Your calibrated risk-taking is a strength. Use it intentionally when evaluating career and financial decisions.' },
    low:      { insight: 'Risk-averse profile. You collected early and often, prioritizing security over potential gain. While safe, the total score left significant points on the table.', suggestion: 'Calculated risk tolerance is a learnable skill. Practice "deliberate exposure" — commit to one low-stakes uncertain outcome per week.' },
  },
};

export function getCognitiveInsights(scores: CognitiveScores): CognitiveInsight[] {
  return (Object.keys(scores) as CognitiveKey[]).map(cognitive => {
    const score = Math.round(scores[cognitive]);
    const lv = level(score);
    const { label, domainTitle, definition, color, emoji, gameName, gameId } = META[cognitive];
    const { insight, suggestion } = INSIGHTS[cognitive][lv];
    return { cognitive, score, label, domainTitle, definition, gameName, gameId, color, emoji, insight, suggestion };
  });
}

export function getAvatarMessage(scores: CognitiveScores): string {
  // Pick the single most notable finding
  if (scores.attention < 35)
    return "I noticed the conflict tasks were quite taxing for you today. It felt like your mind was working double-time just to stay on track. How has your stress been lately?";
  if (scores.memory < 35)
    return "You seemed a bit overwhelmed by the memory sequence. It's perfectly okay—sometimes our minds just need a rest. Did you sleep well last night?";
  if (scores.impulsivity > 70)
    return "I saw you reacting very quickly, almost before your mind could choose. Are you feeling a bit anxious or rushed today?";

  const dominant = (Object.keys(scores) as CognitiveKey[])
    .reduce((a, b) => scores[a] > scores[b] ? a : b);
  const dominantScore = Math.round(scores[dominant]);

  return `Your cognitive profile shows a clear strength in ${META[dominant].label} (${dominantScore}/100) — the highest signal in your session today. Your profile looks generally balanced, with no critical stress indicators. We can explore what drives this pattern if you'd like, or focus on areas you want to strengthen.`;
}

// ── Scientific Data Extraction ────────────────────────────────────────────────

export interface SessionParameter {
  label: string;
  value: string;
  unit: string;
  isHigh: boolean;
  desc?: string;
}

export function getScientificMetrics(cognitive: string, result?: GameResult | any): SessionParameter[] {
  if (!result) return [];
  
  // Robust RT calculation
  const rtArray = result.reactionTimeMs ?? result.reaction_time_ms ?? [];
  const rt = rtArray.length ? rtArray.reduce((a: number, b: number) => a + b, 0) / rtArray.length : 0;
  const rtDisplay = rt > 0 ? rt.toFixed(0) : '—';
  
  const total = result.totalActions || result.total_actions || 1;
  const errors = result.errorCount ?? result.error_count ?? 0;
  const raw = result.rawData || result.raw_data || {};

  // Utility to check multiple keys case-insensitively
  const get = (obj: any, keys: string[]) => {
    for (const key of keys) {
      if (obj[key] != null) return obj[key];
      // Check snake_case variant
      const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (obj[snake] != null) return obj[snake];
    }
    return null;
  };

  switch (cognitive) {
    case 'attention': {
      const conRT = get(raw, ['congruentRT']) ?? 0;
      const inconRT = get(raw, ['incongruentRT']) ?? 0;
      const interference = conRT > 0 && inconRT > 0 ? (inconRT - conRT).toFixed(0) : '—';
      const accVal = get(raw, ['accuracy']);
      const acc = accVal != null ? (accVal * 100).toFixed(1) : (((total - errors) / total) * 100).toFixed(1);
      return [
        { label: 'Reaction Time', value: rtDisplay, unit: 'ms', isHigh: false },
        { label: 'Accuracy', value: acc, unit: '%', isHigh: true },
        { label: 'Error Rate (Incongruent)', value: String(errors), unit: 'trials', isHigh: false },
        { label: 'Interference Score', value: String(interference), unit: 'ms', isHigh: typeof interference === 'number' && Number(interference) > 100, desc: 'RT(incongruent) − RT(congruent)' },
      ];
    }
    case 'memory': {
      const accVal = get(raw, ['accuracy']);
      const acc = accVal != null ? (accVal * 100).toFixed(1) : (((total - errors) / total) * 100).toFixed(1);
      const hits = get(raw, ['hits']) ?? (total - errors);
      const falsePos = get(raw, ['falsePositives', 'fa']) ?? errors;
      const faRate = ((falsePos / total) * 100).toFixed(1);
      return [
        { label: 'Hit Rate', value: acc, unit: '%', isHigh: true, desc: 'Correct matches' },
        { label: 'False Alarm Rate', value: faRate, unit: '%', isHigh: false },
        { label: 'Miss Rate', value: (((expMatch() - hits) / total) * 100).toFixed(1), unit: '%', isHigh: false },
        { label: 'Reaction Time', value: rtDisplay, unit: 'ms', isHigh: false },
      ];

      function expMatch() { return get(raw, ['expectedMatches']) ?? total; }
    }
    case 'impulsivity': {
      const commErrors = get(raw, ['commissionErrors']) ?? errors;
      const omErrors = get(raw, ['omissionErrors']) ?? 0;
      const errRate = ((errors / total) * 100).toFixed(1);
      return [
        { label: 'Commission Errors', value: String(commErrors), unit: 'trials', isHigh: false, desc: 'Wrong taps on No-Go' },
        { label: 'Omission Errors', value: String(omErrors), unit: 'trials', isHigh: false, desc: 'Missed Go stimuli' },
        { label: 'Reaction Time', value: rtDisplay, unit: 'ms', isHigh: false },
        { label: 'Error Rate', value: errRate, unit: '%', isHigh: false },
      ];
    }
    case 'flexibility': {
      const perErrors = get(raw, ['perseverativeErrors']) ?? errors;
      const shifts = get(raw, ['ruleShifts']) ?? 0;
      const shiftRate = ((shifts / (total || 1)) * 100).toFixed(1);
      return [
        { label: 'Perseverative Errors', value: String(perErrors), unit: 'trials', isHigh: false, desc: 'Applying outdated rules' },
        { label: 'Rule Shifts Completed', value: String(shifts), unit: 'shifts', isHigh: true },
        { label: 'Shift Success Rate', value: shiftRate, unit: '%', isHigh: true },
        { label: 'Reaction Time', value: rtDisplay, unit: 'ms', isHigh: false },
      ];
    }
    case 'risk_behavior': {
      const avgPumpsVal = get(raw, ['avgPumps', 'pumps']);
      const avgPumps = avgPumpsVal != null ? Number(avgPumpsVal).toFixed(1) : '—';
      const popRatioVal = get(raw, ['poppedRatio', 'burst_rate']);
      const popRatio = popRatioVal != null ? (popRatioVal * 100).toFixed(1) : (((errors) / total) * 100).toFixed(1);
      const score = get(raw, ['totalScore', 'score']) ?? '—';
      return [
        { label: 'Average Pumps', value: String(avgPumps), unit: 'pumps/trial', isHigh: true },
        { label: 'Burst Rate', value: popRatio, unit: '%', isHigh: false, desc: 'Risk execution failure' },
        { label: 'Risk Score', value: String(score), unit: 'pts', isHigh: true },
        { label: 'Total Trials', value: String(total), unit: '', isHigh: true },
      ];
    }
    default:
      return [];
  }
}

