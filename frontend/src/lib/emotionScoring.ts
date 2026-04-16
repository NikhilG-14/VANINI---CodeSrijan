import type { GameResult, EmotionKey } from './gameSession';

export interface EmotionScores {
  anxiety: number;
  depression: number;
  overthinking: number;
  paralysis: number;
  fatigue: number;
}

export interface EmotionInsight {
  emotion: EmotionKey;
  score: number;
  label: string;
  color: string;
  emoji: string;
  insight: string;
  suggestion: string;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function norm(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function calculateScores(results: GameResult[]): EmotionScores {
  const scores: EmotionScores = { anxiety: 0, depression: 0, overthinking: 0, paralysis: 0, fatigue: 0 };

  for (const r of results) {
    const avgRT = avg(r.reactionTimeMs);
    const errorRate = r.totalActions > 0 ? r.errorCount / r.totalActions : 0;
    const panicNorm = norm(r.panicClickCount, 0, 20);
    const hesNorm = norm(r.hesitationMs, 0, 5000);

    if (r.emotion === 'anxiety') {
      const rtNorm = norm(avgRT, 200, 2500);
      scores.anxiety = clamp(
        (errorRate * 0.35 + rtNorm * 0.25 + panicNorm * 0.25 + hesNorm * 0.15) * 100
      );
    }

    if (r.emotion === 'depression') {
      const engNorm = 1 - norm(r.engagementScore, 0, 100);
      const slowNorm = norm(avgRT, 500, 3500);
      const quitScore = r.quitEarly ? 1 : 0;
      scores.depression = clamp(
        (engNorm * 0.40 + quitScore * 0.35 + slowNorm * 0.25) * 100
      );
    }

    if (r.emotion === 'overthinking') {
      const changesNorm = norm(r.decisionChanges, 0, 15);
      scores.overthinking = clamp(
        (hesNorm * 0.50 + changesNorm * 0.50) * 100
      );
    }

    if (r.emotion === 'paralysis') {
      const skipRate = r.totalActions > 0 ? r.errorCount / r.totalActions : 0; // misused errorCount as skips
      const delayNorm = norm(avgRT, 1000, 6000);
      scores.paralysis = clamp(
        (skipRate * 0.50 + delayNorm * 0.50) * 100
      );
    }

    if (r.emotion === 'fatigue') {
      const dropNorm = norm(r.performanceDrop, 0, 1);
      const errNorm = norm(r.errorCount, 0, 30);
      scores.fatigue = clamp(
        (dropNorm * 0.60 + errNorm * 0.40) * 100
      );
    }
  }

  return scores;
}

const EMOTION_META: Record<EmotionKey, { label: string; color: string; emoji: string }> = {
  anxiety:     { label: 'Anxiety & Stress',    color: '#60a5fa', emoji: '⚡' },
  depression:  { label: 'Depression & Sadness', color: '#818cf8', emoji: '🌫️' },
  overthinking:{ label: 'Overthinking',          color: '#a855f7', emoji: '🌀' },
  paralysis:   { label: 'Decision Paralysis',    color: '#fb923c', emoji: '⚖️' },
  fatigue:     { label: 'Mental Fatigue',        color: '#06b6d4', emoji: '🔋' },
};

type Level = 'high' | 'moderate' | 'low';

const INSIGHTS: Record<EmotionKey, Record<Level, { insight: string; suggestion: string }>> = {
  anxiety: {
    high:     { insight: 'You showed rapid responses with high error frequency under pressure — a strong signal of active anxiety.', suggestion: 'Try box breathing: inhale 4s → hold 4s → exhale 4s. Repeat 4 times.' },
    moderate: { insight: 'Some tension appeared during time-pressured tasks.', suggestion: 'A short walk or progressive muscle relaxation can help reset.' },
    low:      { insight: 'You handled pressure calmly and efficiently.', suggestion: 'Keep nourishing these healthy stress-response habits!' },
  },
  depression: {
    high:     { insight: 'Very low engagement and early disengagement patterns were detected across tasks.', suggestion: 'Try reconnecting with one small activity you used to enjoy today.' },
    moderate: { insight: 'Your energy and interest levels seemed somewhat reduced.', suggestion: 'Set one tiny achievable goal for today — momentum builds.' },
    low:      { insight: 'You showed healthy engagement and motivation throughout.', suggestion: 'Great energy — keep nurturing those positive habits.' },
  },
  overthinking: {
    high:     { insight: 'You frequently revisited and changed your answers — your mind was working very hard.', suggestion: 'Journaling for 5 minutes can help untangle looping thoughts.' },
    moderate: { insight: 'Some rumination patterns appeared in your decision-making.', suggestion: 'Try the "5-4-3-2-1" grounding technique to stay present.' },
    low:      { insight: 'Your thinking was fluid, decisive, and clear.', suggestion: 'Practice mindfulness daily to maintain this mental clarity.' },
  },
  paralysis: {
    high:     { insight: 'Making decisions was difficult, especially under time pressure or with many options.', suggestion: 'Practice the "2-minute rule": if it takes < 2 minutes to decide, choose now.' },
    moderate: { insight: 'Some hesitation during choices was noticed.', suggestion: 'Try listing pros/cons quickly — 30 seconds per option max.' },
    low:      { insight: 'You made decisions with confidence and speed.', suggestion: 'Great decisiveness — a valuable cognitive strength to keep.' },
  },
  fatigue: {
    high:     { insight: 'Your performance declined noticeably over time — a strong indicator of mental exhaustion.', suggestion: 'Take a proper break — 20 minutes rest can restore up to 40% of cognitive performance.' },
    moderate: { insight: 'Some cognitive load buildup appeared toward the end.', suggestion: 'Try the Pomodoro technique: 25 min focus, 5 min break.' },
    low:      { insight: 'Your mental stamina was consistent throughout the entire session.', suggestion: 'Excellent focus endurance — well done!' },
  },
};

export function getEmotionInsights(scores: EmotionScores): EmotionInsight[] {
  return (Object.keys(scores) as EmotionKey[]).map((emotion) => {
    const score = Math.round(scores[emotion]);
    const level: Level = score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low';
    const { label, color, emoji } = EMOTION_META[emotion];
    const { insight, suggestion } = INSIGHTS[emotion][level];
    return { emotion, score, label, color, emoji, insight, suggestion };
  });
}

export function getDominantEmotion(scores: EmotionScores): EmotionKey {
  return (Object.keys(scores) as EmotionKey[]).reduce((a, b) =>
    scores[a as EmotionKey] >= scores[b as EmotionKey] ? a : b
  ) as EmotionKey;
}

export function getAvatarMessage(scores: EmotionScores): string {
  const dominant = getDominantEmotion(scores);
  const score = scores[dominant];
  const level: Level = score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low';

  const messages: Record<EmotionKey, Record<Level, string>> = {
    anxiety: {
      high:     "I noticed the fast-paced tasks felt quite overwhelming — that's completely okay. Many of us experience this. Want to try a calming exercise together?",
      moderate: "You handled pressure reasonably well, though some tension built up. It might be worth checking in with your stress levels today.",
      low:      "You navigated every pressure point beautifully! Your calm under stress is a real strength worth celebrating.",
    },
    depression: {
      high:     "I noticed your energy seemed quite low, and some activities didn't spark much interest. Please know — you're not alone in this. I'm here if you want to talk.",
      moderate: "Your engagement had some dips. Sometimes we just need a little spark. What's one thing that usually brings you joy?",
      low:      "Your enthusiasm and energy were wonderful to see! Keep channeling that positive momentum.",
    },
    overthinking: {
      high:     "You spent a lot of time reconsidering your choices — your mind was working incredibly hard. That's exhausting. Let's slow things down a little.",
      moderate: "I noticed some hesitation in your decisions. It's completely okay not to have all the answers right away.",
      low:      "Clear, confident thinking from start to finish. Your mind was sharp and decisive — excellent.",
    },
    paralysis: {
      high:     "Making choices felt really difficult today, especially with lots of options or time pressure. That's a sign your mind might be overwhelmed. Let's work on simplifying.",
      moderate: "Some decisions took a bit longer than usual. That's okay — thoughtful is better than rushed.",
      low:      "Your decision-making was quick and confident throughout. That's a great cognitive strength!",
    },
    fatigue: {
      high:     "By the end of the session, I could see your focus starting to drop. Your brain might be telling you it needs a real rest. Please listen to it.",
      moderate: "Some mental tiredness showed up toward the end. A short break might be exactly what you need right now.",
      low:      "Impressive mental stamina! You stayed consistent and focused from start to finish.",
    },
  };

  return messages[dominant][level];
}
