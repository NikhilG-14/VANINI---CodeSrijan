import type { EmotionScores, EmotionInsight } from './types';

const OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_BASE ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.NEXT_PUBLIC_OLLAMA_MODEL ?? 'llama3.2';

function buildSystemPrompt(scores: EmotionScores, insights: EmotionInsight[]): string {
  const summaryLines = insights.map(i =>
    `- ${i.label} (${i.emoji}): score ${i.score}/100 — ${i.insight}`
  ).join('\n');

  return `You are VANI, a warm, empathetic AI mental wellness companion.
You have just observed a user complete a 5-game behavioral assessment.

BEHAVIORAL SUMMARY:
${summaryLines}

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
  onToken?: (chunk: string) => void
): Promise<string> {
  const body: OllamaRequest = {
    model: OLLAMA_MODEL,
    prompt: userMessage,
    system: buildSystemPrompt(scores, insights),
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
