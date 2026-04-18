import type { CognitiveScores, CognitiveInsight, GameResult } from './types';
import { useUserStore } from '@/store/userStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export type SessionHistoryEntry = {
  scores?: CognitiveScores;
  results?: GameResult[];
};

type ChatHistoryEntry = {
  role: 'user' | 'assistant';
  content: string;
};

export type UserDossier = {
  current_session: SessionHistoryEntry | null;
  previous_sessions: SessionHistoryEntry[];
  aggregated_behavior: Record<string, unknown>;
  recent_chat: ChatHistoryEntry[];
};

export type SessionReport = {
  current_analysis: Record<string, unknown>;
  previous_analysis: Record<string, unknown>;
  delta: Record<string, number>;
  ai_summary: string;
};

export type SessionHistoryResponse = {
  user_id: string;
  count: number;
  sessions: SessionHistoryEntry[];
};

/**
 * Helper to call the centralized AI backend proxy (Gemini/Ollama).
 * This keeps the API keys on the server and ensures connectivity via port 8000.
 */
async function callAIProxy(prompt: string, system: string, onToken?: (chunk: string) => void): Promise<string> {
  const url = `${API_BASE}/ai/generate`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system }),
      // Long timeout for AI generation (Render might be slow)
      signal: AbortSignal.timeout(45000) 
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`AI Proxy Error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    const result = data.response || "";
    
    // Simulate streaming for UI consistency if onToken is provided, 
    // although the proxy currently returns a full string.
    if (onToken && result) {
      onToken(result);
    }
    
    return result;
  } catch (err) {
    console.error('[VANI] AI Proxy failure:', err);
    throw err;
  }
}

function buildSystemPrompt(
  scores: CognitiveScores,
  insights: CognitiveInsight[],
  history?: UserDossier
): string {
  let historyContext = '';
  if (history) {
    if (history.previous_sessions?.length > 0) {
      historyContext += '\nPAST SESSION TRENDS:\n' + history.previous_sessions.map((s, idx) => {
        const scoreSummary = Object.entries((s.scores ?? {})).map(([k, v]) => `${k}: ${v}%`).join(', ');
        return `- Session ${idx + 1}: ${scoreSummary}`;
      }).join('\n');
    }
  }

  return `You are VANI, a highly sophisticated AI behavioral analyst for a Mental Health Monitoring and Support System.
You have just observed a user complete a complex cognitive assessment spanning multiple domains.

YOUR OBJECTIVE:
Provide a deep psychological profile correlating their telemetry data to real-world markers for stress, anxiety, or depression.

CRITICAL FORMATTING RULES:
1. You MUST generate EXACTLY 8 crisp, powerful bullet points. Not 7, not 9. Exactly 8.
2. Use the format: "- [Domain Focus] Observation: Clinical significance."
3. Do NOT include markdown bolding formatting (**) except for the initial word.
4. Keep each point under 20 words if possible.

BEHAVIORAL DOSSIER (Current Session):
${insights.map(i => `- ${i.label}: ${i.score}% (${i.insight})`).join('\n')}

COGNITIVE RAW DATA:
${Object.entries(scores).map(([k, v]) => `- ${k.toUpperCase()}: ${v}`).join('\n')}
${historyContext}

Analyze the data now and output exactly 8 bulleted points analyzing the potential causes and connections to stress, anxiety, or mental fatigue based on their performance.`;
}

export async function syncMasterMemoir(
  userId: string,
  currentSummary: string,
  scores: CognitiveScores
): Promise<string> {
  try {
    // 1. Fetch current memoir
    const memoirUrl = `${API_BASE}/user/memoir/${encodeURIComponent(userId)}`;
    const mRes = await fetch(memoirUrl);
    const memoirData = await mRes.json();
    const oldMemoir = memoirData?.master_summary || "";

    // 2. Synthesize new consolidated narrative
    const mergePrompt = `You are VANI, a cognitive biographer. 
Incorporate the followsing NEW session findings into the user's EXISTING cognitive memoir.
OLD MEMOIR: "${oldMemoir}"
NEW FINDINGS: "${currentSummary}"
SCORES: ${JSON.stringify(scores)}

Objective: Create a single, cohesive, evolving narrative of their cognitive journey. 
Keep it empathetic and professional. Max 150 words. Use bullet points for key milestones.
Output ONLY the new consolidated narrative.`;

    const updatedMemoir = await callAIProxy(
      mergePrompt, 
      "You are VANI, a master of longitudinal cognitive storytelling."
    );

    if (updatedMemoir) {
      // 3. Save back to DB
      await fetch(`${API_BASE}/user/memoir/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, master_summary: updatedMemoir })
      });
      return updatedMemoir;
    }
    return oldMemoir || currentSummary;
  } catch (err) {
    console.warn('[VANI] Failed to sync master memoir:', err);
    return currentSummary;
  }
}

export async function generateAvatarResponse(
  userMessage: string,
  scores: CognitiveScores,
  insights: CognitiveInsight[],
  history?: UserDossier,
  onToken?: (chunk: string) => void
): Promise<string> {
  const vimid = useUserStore.getState().vimid;
  let masterMemoir = "";
  if (vimid) {
    try {
      const mRes = await fetch(`${API_BASE}/user/memoir/${encodeURIComponent(vimid)}`);
      const mData = await mRes.json();
      masterMemoir = mData?.master_summary || "";
    } catch { }
  }

  const system = buildSystemPrompt(scores, insights, history) + `\n\nLONG-TERM MEMOIR CONTEXT:\n${masterMemoir}`;
  
  try {
    return await callAIProxy(userMessage, system, onToken);
  } catch (err) {
    console.warn('[VANI] AI generator unavailable:', err);
    return "";
  }
}

export async function generateGameDiagnostic(
  insight: CognitiveInsight,
  metrics: any,
  onToken?: (chunk: string) => void
): Promise<string> {
  const diagnosticPrompt = `Analyze the cognitive domain: ${insight.label}.
Telemetry: ${JSON.stringify(metrics)}

FORMATTING RULES (STRICT):
1. Output ONLY 5 bullet points. No introductory text, no "Lead Neuroscientist" talk, no "Diagnostic Output:" header.
2. Use this Markdown format: "- **STATEMENT X**: [The Observation] _[The Reasoning]_"
3. Use bold (**text**) for the statement header and italics (_text_) for the reasoning.
4. Professional clinical tone. Max 25 words per point.

Diagnostic Statements:`;

  try {
    return await callAIProxy(
      diagnosticPrompt, 
      "You are a clinical diagnostic engine providing bulleted neuro-behavioral insights.",
      onToken
    );
  } catch (err) {
    console.warn('[VANI] Diagnostic fetch failed:', err);
    return "";
  }
}

export async function checkAIHealth(): Promise<boolean> {
  try {
    // We check the backend's status rather than Ollama's direct status
    const res = await fetch(`${API_BASE}/find-match?info=healthcheck`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getUserDossier(userId: string): Promise<UserDossier | null> {
  try {
    const res = await fetch(`${API_BASE}/user/dossier/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[VANI] Failed to fetch user dossier:', err);
    return null;
  }
}

export async function saveChatMessage(userId: string, role: 'user' | 'assistant', content: string) {
  try {
    const res = await fetch(`${API_BASE}/chat/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role, content })
    });
    return res.ok;
  } catch (err) {
    console.warn('[VANI] Failed to save chat message:', err);
    return false;
  }
}

export async function saveGameSession(
  userId: string,
  results: GameResult[],
  scores: CognitiveScores,
  startedAt?: number
) {
  try {
    const scorePairs = Object.entries(scores).sort(([a], [b]) => a.localeCompare(b));
    const scoreFingerprint = scorePairs.map(([k, v]) => `${k}:${Math.round(v)}`).join('|');
    const sessionSignature = `${userId}|${startedAt ?? 'na'}|${results.length}|${scoreFingerprint}`;
    if (typeof window !== 'undefined') {
      const key = 'vani_last_saved_session_signature';
      const lastSignature = window.localStorage.getItem(key);
      if (lastSignature === sessionSignature) {
        return true;
      }
      window.localStorage.setItem(key, sessionSignature);
    }

    const sessionStart = new Date(
      typeof startedAt === 'number'
        ? startedAt
        : Date.now()
    ).toISOString();
    const sessionEnd = new Date().toISOString();
    const actions = results.map((r) => ({
      game_id: r.gameId,
      total_actions: r.totalActions,
      error_count: r.errorCount,
      reaction_time_ms: r.reactionTimeMs,
      raw_data: r.rawData ?? {},
    }));
    const behavioralSignals = {
      quit_early_games: results.filter((r) => r.quitEarly).map((r) => r.gameId),
      average_reaction_time_ms: (() => {
        const all = results.flatMap((r) => r.reactionTimeMs ?? []);
        if (!all.length) return null;
        return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
      })(),
    };
    const finalOutcome = {
      completed_games: results.length,
      score_state: scores,
      status: 'completed',
    };

    const payload = {
      user_id: userId,
      game_type: 'mind_journey',
      session_start: sessionStart,
      session_end: sessionEnd,
      actions,
      behavioral_signals: behavioralSignals,
      final_outcome: finalOutcome,
      results,
      scores,
    };

    const res = await fetch(`${API_BASE}/session/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.warn('[VANI] Failed to save session:', err);
    return false;
  }
}

export async function getSessionHistory(userId: string): Promise<SessionHistoryResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/session/history?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[VANI] Failed to load session history:', err);
    return null;
  }
}

export async function getSessionReport(userId: string): Promise<SessionReport | null> {
  try {
    const res = await fetch(`${API_BASE}/session/report?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    const report: SessionReport = await res.json();

    // If we have a delta comparison (meaning we have previous sessions), generate an AI summary
    if (report.delta && Object.keys(report.delta).length > 0) {
      try {
        const aiPrompt = `You are VANI, an expert behavioral analyst. 
Analyze the following change in the user's cognitive performance metrics between their previous sessions and current session.
Provide a single, very concise, highly empathetic paragraph summarizing their progression or regression.
Do not use lists. Speak directly to the user as "you". Keep it under 50 words.

METRIC DELTAS (Positive is improvement, Negative is decline):
${JSON.stringify(report.delta, null, 2)}`;

        const updatedSummary = await callAIProxy(
          aiPrompt, 
          "You are VANI, a concise, supportive AI behavioral analyst."
        );
        
        if (updatedSummary) {
          report.ai_summary = updatedSummary;
        }
      } catch (ollamaErr) {
        console.warn('[VANI] Failed to dynamically generate AI summary, using fallback:', ollamaErr);
      }
    }

    return report;
  } catch (err) {
    console.warn('[VANI] Failed to load session report:', err);
    return null;
  }
}

export async function getCognitiveReports(userId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/session/reports/${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[VANI] Failed to load formal cognitive reports:', err);
    return [];
  }
}
