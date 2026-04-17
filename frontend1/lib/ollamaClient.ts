import type { CognitiveScores, CognitiveInsight } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

const OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_BASE ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama3.2';

function buildSystemPrompt(
  scores: CognitiveScores,
  insights: CognitiveInsight[],
  history?: { recent_sessions: any[], recent_chat: any[] }
): string {
  const summaryLines = insights.map(i =>
    `- ${i.label} (${i.emoji}): score ${i.score}/100 — ${i.insight}`
  ).join('\n');

  let historyContext = '';
  if (history) {
    if (history.recent_sessions?.length > 0) {
      historyContext += '\nPAST SESSION TRENDS:\n' + history.recent_sessions.map((s, idx) => {
        const scores = Object.entries(s.scores).map(([k, v]) => `${k}: ${v}%`).join(', ');
        const skips = s.quits?.length > 0 ? ` (User skipped: ${s.quits.join(', ')})` : '';
        return `- Session ${idx + 1}: ${scores}${skips}`;
      }).join('\n');
    }
    if (history.recent_chat?.length > 0) {
      historyContext += '\nPAST CONVERSATION GLIMPSES:\n' + history.recent_chat.map(c =>
        `- ${c.role.toUpperCase()}: ${c.content}`
      ).join('\n');
    }
  }

  return `You are VANI, a highly sophisticated AI behavioral analyst and empathetic companion.
You have just observed a user complete a complex cognitive assessment spanning multiple domains.

YOUR OBJECTIVE:
Synthesize a deep psychological profile based on the metrics below. 
Do not just list the numbers. Explain *why* these numbers matter for their daily life.
If they showed high impulsivity, explain the trade-off with speed. If they had focus drops, offer gentle validation.

BEHAVIORAL DOSSIER (Current Session):
${insights.map(i => `- ${i.label}: ${i.score}% (${i.insight})`).join('\n')}

COGNITIVE RAW DATA:
${Object.entries(scores).map(([k,v]) => `- ${k.toUpperCase()}: ${v}`).join('\n')}

${historyContext}

RESPONSE STYLE:
- Tone: Empathetic, analytical yet warm, professional "Therapy Assistant".
- Format: 2-3 detailed paragraphs.
- Address the user as "you". 
- Start with a "Neural Summary" that captures their cognitive state.

Wait for the data to be fully processed, then provide your synthesis.`;
}

type OllamaRequest = {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;
};

export async function generateAvatarResponse(
  userMessage: string,
  scores: CognitiveScores,
  insights: CognitiveInsight[],
  history?: { recent_sessions: any[], recent_chat: any[] },
  onToken?: (chunk: string) => void
): Promise<string> {
  const body: OllamaRequest = {
    model: OLLAMA_MODEL,
    prompt: userMessage,
    system: buildSystemPrompt(scores, insights, history),
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
            } catch (e) {
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

export async function getUserDossier(userId: string) {
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

export async function saveGameSession(userId: string, results: any[], scores: any) {
  try {
    const res = await fetch(`${API_BASE}/save-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, results, scores })
    });
    return res.ok;
  } catch (err) {
    console.warn('[VANI] Failed to save session:', err);
    return false;
  }
}
