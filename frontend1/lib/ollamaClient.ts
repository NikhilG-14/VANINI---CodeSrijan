import type { EmotionScores, EmotionInsight } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

const OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_BASE ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama3.2';

function buildSystemPrompt(
  scores: EmotionScores, 
  insights: EmotionInsight[],
  history?: { recent_sessions: any[], recent_chat: any[] }
): string {
  const summaryLines = insights.map(i =>
    `- ${i.label} (${i.emoji}): score ${i.score}/100 — ${i.insight}`
  ).join('\n');

  let historyContext = '';
  if (history) {
    if (history.recent_sessions?.length > 0) {
      historyContext += '\nPAST SESSION TRENDS:\n' + history.recent_sessions.map((s, idx) => {
        const scores = Object.entries(s.scores).map(([k,v]) => `${k}: ${v}%`).join(', ');
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

  return `You are VANI, a warm, empathetic AI mental wellness companion.
You have just observed a user complete a 5-game behavioral assessment.

BEHAVIORAL SUMMARY (Current Session):
${summaryLines}
${historyContext}

YOUR ROLE:
- Speak warmly, conversationally, and without clinical jargon
- NEVER diagnose or label the user with a condition
- NEVER say "you have anxiety" or "you are depressed"
- DO reflect on patterns you noticed ("I noticed...", "It seemed like...")
- Offer one gentle, actionable suggestion
- Keep your response to 3–4 sentences
- End with a question to invite further conversation

You are a supportive companion, not a therapist.`;
}

type OllamaRequest = {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;
};

export async function generateAvatarResponse(
  userMessage: string,
  scores: EmotionScores,
  insights: EmotionInsight[],
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
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

    if (onToken && res.body) {
      // Streaming mode
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.response) {
              onToken(obj.response);
              full += obj.response;
            }
          } catch {}
        }
      }
      return full;
    } else {
      // Non-streaming
      const data = await res.json();
      return data.response ?? '';
    }
  } catch (err) {
    console.warn('[VANI] Ollama unavailable, using local fallback:', err);
    return null as unknown as string; // caller will handle null with fallback
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
