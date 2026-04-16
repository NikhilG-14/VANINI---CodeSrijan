import type { GameResult, CognitiveKey, CognitiveScores, CognitiveInsight } from './types';

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

// Ensure game score is a standard 0-100 format
export function calculateScores(results: GameResult[]): CognitiveScores {
  const s: CognitiveScores = { attention: 0, memory: 0, impulsivity: 0, flexibility: 0, risk_behavior: 0 };

  for (const r of results) {
    if (r.cognitive === 'attention') {
      // Stroop logic: rawData = { congruentRT: ms, incongruentRT: ms, accuracy: 0-1 }
      const acc = (r.rawData?.accuracy as number) || 0;
      const interference = ((r.rawData?.incongruentRT as number || 1000) - (r.rawData?.congruentRT as number || 500)) / 1000;
      const penalty = clamp(interference * 20, 0, 40);
      s.attention = clamp((acc * 100) - penalty);
    }
    
    if (r.cognitive === 'memory') {
      // N-Back logic: rawData = { accuracy: 0-1, falsePositives: num }
      const acc = (r.rawData?.accuracy as number) || 0;
      const fp = (r.rawData?.falsePositives as number) || 0;
      s.memory = clamp((acc * 100) - (fp * 5));
    }

    if (r.cognitive === 'impulsivity') {
      // Go/No-Go logic: rawData = { commissionErrors: num, omissionErrors: num }
      const commErr = (r.rawData?.commissionErrors as number) || 0;
      const total = r.totalActions || 1;
      const impulsivityScore = (commErr / total) * 100;
      s.impulsivity = clamp(impulsivityScore * 2); // Amplify to give visible radar spike
    }

    if (r.cognitive === 'flexibility') {
      // WCST logic: rawData = { perseverativeErrors: num, adaptationTime: num }
      const pes = (r.rawData?.perseverativeErrors as number) || 0;
      // If PES is low, flexibility is HIGH
      s.flexibility = clamp(100 - (pes * 15));
    }

    if (r.cognitive === 'risk_behavior') {
      // BART logic: rawData = { avgPumps: num, burstRate: 0-1 }
      const avgPumps = (r.rawData?.avgPumps as number) || 0;
      // Assume max safe pumps per balloon is ~15
      const riskScore = (avgPumps / 15) * 100;
      s.risk_behavior = clamp(riskScore);
    }
  }
  
  // Provide meaningful default values for radar visualization if games haven't been played
  return {
    attention: s.attention || 50,
    memory: s.memory || 50,
    impulsivity: s.impulsivity || 20,
    flexibility: s.flexibility || 50,
    risk_behavior: s.risk_behavior || 30
  };
}

const META: Record<CognitiveKey, { label: string; color: string; emoji: string }> = {
  attention:      { label: 'Selective Attention', color: '#3b82f6', emoji: '🎯' }, // Blue
  memory:         { label: 'Working Memory',      color: '#8b5cf6', emoji: '🧠' }, // Violet
  impulsivity:    { label: 'Impulsivity',         color: '#ef4444', emoji: '⚡' }, // Red
  flexibility:    { label: 'Cognitive Flex',      color: '#10b981', emoji: '🧩' }, // Green
  risk_behavior:  { label: 'Risk Behavior',       color: '#f59e0b', emoji: '🎈' }, // Amber
};

type Level = 'high' | 'moderate' | 'low';
const level = (s: number, key: CognitiveKey): Level => {
  // Impulsivity and Risk Behavior mapping: High numbers mean HIGH expression of trait
  if (s >= 70) return 'high';
  if (s >= 40) return 'moderate';
  return 'low';
};

const INSIGHTS: Record<CognitiveKey, Record<Level, { insight: string; suggestion: string }>> = {
  attention: {
    high:     { insight: 'Excellent selective attention. You efficiently ignored irrelevant interference.', suggestion: 'Keep your focus sharp with meditation.' },
    moderate: { insight: 'Average susceptibility to cognitive interference.', suggestion: 'Try to minimize environmental distractions during deep work.' },
    low:      { insight: 'High interference detected. Irrelevant information caused significant reaction delays.', suggestion: 'Practice single-tasking and remove visual clutter.' },
  },
  memory: {
    high:     { insight: 'Strong working memory capacity. You maintained and updated information flawlessly.', suggestion: 'Challenge yourself with complex, multi-step problem solving.' },
    moderate: { insight: 'Standard working memory load tolerance.', suggestion: 'Use external tools (notes, lists) to offload working memory.' },
    low:      { insight: 'Working memory was overloaded, leading to sequence drops.', suggestion: 'Break complex tasks down into smaller, bite-sized steps.' },
  },
  impulsivity: {
    high:     { insight: 'High rate of commission errors. You struggled to inhibit automated responses.', suggestion: 'Practice the "stop and think" pause threshold before acting.' },
    moderate: { insight: 'Some impulsive responses during rapid stimuli.', suggestion: 'Incorporate mindfulness to increase the gap between stimulus and response.' },
    low:      { insight: 'Excellent inhibitory control. You successfully withheld actions when required.', suggestion: 'Your calculated nature is a powerful asset.' },
  },
  flexibility: {
    high:     { insight: 'Highly adaptable. You deduced new rules quickly with minimal perseverative errors.', suggestion: 'Lean into dynamic environments where conditions change rapidly.' },
    moderate: { insight: 'Standard cognitive set-shifting ability.', suggestion: 'Expose yourself to novel situations to practice mental adaptability.' },
    low:      { insight: 'Strong perseveration detected. You struggled to abandon outdated rules.', suggestion: 'When stuck on a problem, force yourself to write down one entirely opposite solution.' },
  },
  risk_behavior: {
    high:     { insight: 'High risk-taking profile. You consistently pushed limits past safe thresholds.', suggestion: 'Evaluate whether the potential reward truly outweighs the worst-case penalty in real life.' },
    moderate: { insight: 'Calculated risk-taking behavior with some loss sensitivity.', suggestion: 'You strike a healthy balance between safety and exploration.' },
    low:      { insight: 'Highly risk-averse. You maximized safety but left significant rewards on the table.', suggestion: 'Consider if playing too safely is preventing potential growth.' },
  },
};

export function getCognitiveInsights(scores: CognitiveScores): CognitiveInsight[] {
  return (Object.keys(scores) as CognitiveKey[]).map(cognitive => {
    const score = Math.round(scores[cognitive]);
    const lv = level(score, cognitive);
    const { label, color, emoji } = META[cognitive];
    const { insight, suggestion } = INSIGHTS[cognitive][lv];
    return { cognitive, score, label, color, emoji, insight, suggestion };
  });
}

export function getAvatarMessage(scores: CognitiveScores): string {
  // Determine if there are critical alerts (High Impulsivity/Risk or Low Attention/Memory/Flexibility)
  if (scores.impulsivity > 75) return "Your responses showed high impulsivity, reacting before fully processing the stimulus. Let's work on creating a pause between thought and action.";
  if (scores.risk_behavior > 75) return "You consistently took significant risks in the balloon challenge. Are you finding yourself taking high-stakes gambles in your daily life as well?";
  if (scores.attention < 30) return "You faced a lot of interference in the attention tasks today. It’s completely normal to struggle with focus when you're overwhelmed or fatigued.";
  if (scores.flexibility < 30) return "You got stuck on the previous rules even after the game logic changed. Do you feel like you're caught in a rigid loop or routine right now?";
  if (scores.memory < 30) return "Your working memory had a few drops. This is a classic sign of cognitive overload. Be gentle with yourself today and write down important tasks.";
  
  return "Your cognitive profile looks well-balanced across the board today! Your inhibitory control and working memory are functioning harmoniously.";
}
