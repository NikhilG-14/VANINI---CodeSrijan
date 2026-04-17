import type { CognitiveScores, CognitiveInsight } from './types';
import { useUserStore } from '@/store/userStore';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

const OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_BASE ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama3.2';

type SessionResultLite = {
  gameId?: string;
  quitEarly?: boolean;
  reactionTimeMs?: number[];
  totalActions?: number;
  errorCount?: number;
  rawData?: Record<string, unknown>;
};

type SessionHistoryEntry = {
  scores?: Record<string, number>;
  results?: SessionResultLite[];
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
  sessions: Record<string, unknown>[];
};

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
${Object.entries(scores).map(([k,v]) => `- ${k.toUpperCase()}: ${v}`).join('\n')}
${historyContext}

Analyze the data now and output exactly 8 bulleted points analyzing the potential causes and connections to stress, anxiety, or mental fatigue based on their performance.`;
}


type OllamaRequest = {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;
};

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

    const body: OllamaRequest = {
      model: OLLAMA_MODEL,
      prompt: mergePrompt,
      system: "You are VANI, a master of longitudinal cognitive storytelling.",
      stream: false,
    };

    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });

    if (ollamaRes.ok) {
      const data = await ollamaRes.json();
      const updatedMemoir = data.response;
      
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
  // Fetch master memoir to provide context for the response
  const vimid = useUserStore.getState().vimid;
  let masterMemoir = "";
  if (vimid) {
    try {
      const mRes = await fetch(`${API_BASE}/user/memoir/${encodeURIComponent(vimid)}`);
      const mData = await mRes.json();
      masterMemoir = mData?.master_summary || "";
    } catch {}
  }

  const body: OllamaRequest = {
    model: OLLAMA_MODEL,
    prompt: userMessage,
    system: buildSystemPrompt(scores, insights, history) + `\n\nLONG-TERM MEMOIR CONTEXT:\n${masterMemoir}`,
    stream: !!onToken,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for AI response start

    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

    if (onToken && res.body) {
      // Streaming mode
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Split by newline and handle multiple JSON objects in one chunk
          const lines = chunk.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const obj = JSON.parse(line);
              if (obj.response) {
                onToken(obj.response);
                full += obj.response;
              }
              if (obj.done) break;
            } catch {
              // Silently ignore partial JSON segments within the stream
              continue;
            }
          }
        }
      } catch (streamErr) {
        console.error('[VANI] Stream read error:', streamErr);
      } finally {
        reader.releaseLock();
      }
      return full || (null as unknown as string);
    } else {
      // Non-streaming
      const data = await res.json();
      return data.response ?? '';
    }
  } catch (err) {
    console.warn('[VANI] Ollama network failure or unavailable:', err);
    return null as unknown as string;
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
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
  results: SessionResultLite[],
  scores: Record<string, number>,
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
        
        const body: OllamaRequest = {
          model: OLLAMA_MODEL,
          prompt: aiPrompt,
          system: "You are VANI, a concise, supportive AI behavioral analyst.",
          stream: false,
        };

        const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000)
        });

        if (ollamaRes.ok) {
          const ollamaData = await ollamaRes.json();
          if (ollamaData.response) {
            report.ai_summary = ollamaData.response;
          }
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
