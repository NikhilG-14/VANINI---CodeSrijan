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
    // ─────────────────────────────────────────────────────────────────────────
    // STROOP → Selective Attention
    // Score based on: accuracy, and cost of interference (incongruent slowdown).
    // High score = high accuracy + low congruent/incongruent gap.
    // ─────────────────────────────────────────────────────────────────────────
    if (r.cognitive === 'attention') {
      const acc = (r.rawData?.accuracy as number) ?? 0;
      const conRT  = (r.rawData?.congruentRT as number) ?? 500;
      const inconRT = (r.rawData?.incongruentRT as number) ?? 500;

      // Stroop interference = how much slower they were on incongruent trials
      // Normalized: 0ms diff = no penalty, 500ms diff = max ~33 pt penalty
      const interferencePenalty = conRT > 0
        ? clamp(((inconRT - conRT) / conRT) * 50, 0, 40)
        : 0;

      // Reaction time score: reward fast responders (sub-600ms is excellent)
      const allRTs = r.reactionTimeMs ?? [];
      const meanRT = avg(allRTs);
      const speedBonus = meanRT > 0 ? clamp(10 - (meanRT / 100), 0, 10) : 0;

      s.attention = clamp((acc * 90) - interferencePenalty + speedBonus);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // N-BACK → Working Memory
    // Score based on: hit rate (correctly identifying matches) vs false alarm rate.
    // d-prime-inspired: penalize heavily for false alarms.
    // ─────────────────────────────────────────────────────────────────────────
    if (r.cognitive === 'memory') {
      const accuracy  = (r.rawData?.accuracy as number) ?? 0;
      const falsePos  = (r.rawData?.falsePositives as number) ?? 0;
      const hits      = (r.rawData?.hits as number) ?? 0;
      const totalTrials = r.totalActions || 1;

      // False alarm rate (penalizes guessing)
      const faRate = falsePos / Math.max(totalTrials, 1);

      // Working memory score: accuracy is primary, false alarms are penalty
      const baseScore = accuracy * 100;
      const faPenalty = faRate * 60; // 60% false alarm rate = -36 pts

      s.memory = clamp(baseScore - faPenalty);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GO/NO-GO → Impulsivity (Inhibitory Control)
    // Score = commission error rate. HIGH score = HIGH impulsivity (bad control).
    // Commission errors = pressing when you shouldn't (failed inhibition).
    // ─────────────────────────────────────────────────────────────────────────
    if (r.cognitive === 'impulsivity') {
      const commErrors = (r.rawData?.commissionErrors as number) ?? r.errorCount ?? 0;
      const totalNoGo  = (r.rawData?.totalNoGo as number) ?? Math.floor((r.totalActions || 1) * 0.3);

      // Impulsivity score = % of No-Go stimuli that triggered a response
      const impRate = totalNoGo > 0 ? (commErrors / totalNoGo) : 0;
      s.impulsivity = clamp(impRate * 100);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WCST → Cognitive Flexibility
    // Score based on: perseverative errors and total trials completed.
    // HIGH flexibility = low perseveration + many trials completed.
    // ─────────────────────────────────────────────────────────────────────────
    if (r.cognitive === 'flexibility') {
      const pes   = (r.rawData?.perseverativeErrors as number) ?? r.errorCount ?? 0;
      const total = r.totalActions || 1;

      // Perseverative error rate: 1 PE per 3 trials is significant
      const peRate = pes / total;
      // Activity credit: more trials = more data = better measurement
      const activityBonus = clamp(total * 0.5, 0, 20); // up to +20 for being active
      s.flexibility = clamp(100 - (peRate * 200) + activityBonus);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BART → Risk Behavior
    // Score = how aggressively the user pumped relative to safe threshold.
    // HIGH score = high risk-seeking. Moderate (30-60) is optimal.
    // ─────────────────────────────────────────────────────────────────────────
    if (r.cognitive === 'risk_behavior') {
      const avgPumps   = (r.rawData?.avgPumps as number) ?? 0;
      const poppedRatio = (r.rawData?.poppedRatio as number) ?? 0;

      // Risk score: avg pumps as fraction of a risky threshold (~18 pumps)
      const pumpScore    = clamp((avgPumps / 18) * 100);
      // Popped ratio penalty/bonus: high popping means overconfidence
      const popAdjust    = (poppedRatio - 0.3) * 40; // neutral at 30% pop rate

      s.risk_behavior = clamp(pumpScore + popAdjust);
    }
  }

  // ─── Return actual computed values, NOT masked defaults ───────────────────
  // Only use defaults for domains that had NO game played at all.
  return {
    attention:    s.attention    ?? 50,
    memory:       s.memory       ?? 50,
    impulsivity:  s.impulsivity  ?? 20,
    flexibility:  s.flexibility  ?? 50,
    risk_behavior: s.risk_behavior ?? 30,
  };
}

const META: Record<CognitiveKey, { label: string; color: string; emoji: string }> = {
  attention:      { label: 'Selective Attention', color: '#3b82f6', emoji: '🎯' },
  memory:         { label: 'Working Memory',      color: '#8b5cf6', emoji: '🧠' },
  impulsivity:    { label: 'Impulsivity Index',   color: '#ef4444', emoji: '⚡' },
  flexibility:    { label: 'Cognitive Flex',      color: '#10b981', emoji: '🧩' },
  risk_behavior:  { label: 'Risk Propensity',     color: '#f59e0b', emoji: '🎈' },
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
    high:     { insight: 'Excellent selective attention. You maintained focus through heavy interference with minimal reaction time cost on incongruent trials.', suggestion: 'Your focused state is an asset — use deep work blocks of 90+ minutes to harness it.' },
    moderate: { insight: 'Moderate susceptibility to cognitive interference. You slowed down on color-word conflicts but recovered well.', suggestion: 'Practice the "name the color, ignore the word" drill daily — it trains top-down inhibitory control.' },
    low:      { insight: 'High interference detected. The incongruent Stroop trials caused notable accuracy drops and reaction delays, indicating automatic reading processes are dominating.', suggestion: 'Reduce information overload in your workspace. Single-tasking and eliminating visual noise are key first steps.' },
  },
  memory: {
    high:     { insight: 'Strong working memory performance. You correctly identified matches 2-back while rejecting false matches with low error rate.', suggestion: 'Push further with 3-back tasks. Your capacity supports multi-layer problem solving.' },
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
    const { label, color, emoji } = META[cognitive];
    const { insight, suggestion } = INSIGHTS[cognitive][lv];
    return { cognitive, score, label, color, emoji, insight, suggestion };
  });
}

export function getAvatarMessage(scores: CognitiveScores): string {
  // Pick the single most notable finding
  if (scores.impulsivity > 70)
    return "Your inhibitory control data is striking — you responded to No-Go stimuli significantly more than expected. This pattern often means your brain is optimizing for speed over caution, which can be an asset but also a liability under pressure. Let's talk about this.";
  if (scores.risk_behavior > 75)
    return "You pushed the balloon far past the expected burst point — repeatedly. This risk-seeking signature in a controlled environment is worth exploring. Are you chasing rewards in areas of your life that may not justify the cost?";
  if (scores.attention < 35)
    return "The Stroop interference hit you harder than average — your reaction times on conflicting trials were substantially slower than on congruent ones. That gap is a window into how much mental bandwidth is being consumed right now.";
  if (scores.flexibility < 35)
    return "The rule-shift task showed you continuing to apply old strategies even after the feedback turned negative — a classic perseveration marker. This isn't a flaw; it's a signal that your system is running on ingrained patterns. Let's explore why.";
  if (scores.memory < 35)
    return "Your 2-back performance tells me your working memory buffer is under load. The sequence errors and false alarms suggest you're tracking well but slipping under sustained demand — a very common profile for cognitive overload.";

  const dominant = (Object.keys(scores) as CognitiveKey[])
    .reduce((a, b) => scores[a] > scores[b] ? a : b);
  const dominantScore = Math.round(scores[dominant]);

  return `Your cognitive profile shows a clear strength in ${META[dominant].label} (${dominantScore}/100) — the highest signal in your session today. Your profile looks generally balanced, with no critical stress indicators. We can explore what drives this pattern if you'd like, or focus on areas you want to strengthen.`;
}
