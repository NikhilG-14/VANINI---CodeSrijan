import { Request, Response } from 'express';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const AVATAR_MODEL = process.env.AVATAR_MODEL || 'llama3';

export const chatWithAvatar = async (req: Request, res: Response) => {
    try {
        const { userId, userMessage } = req.body;

        // In a real system, you would fetch these from the DB
        // const emotionScores = await prisma.userEmotions.findUnique({ where: { id: userId }});
        const emotionScores = { anxiety: 40, fatigue: 20, overthinking: 15 };

        const systemPrompt = `
System Context:
You are Vanini, a warm, supportive behavioral AI avatar in a virtual city.
You must NEVER act as a doctor or give clinical diagnoses.
Your goal is to gently guide the user toward mindfulness.

The user's current estimated behavioral thresholds (0-100 scale):
- Anxiety: ${emotionScores.anxiety}
- Fatigue: ${emotionScores.fatigue}
- Overthinking: ${emotionScores.overthinking}

Acknowledge their state implicitly without quoting numbers. Be very brief (2-3 sentences max).
`;

        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: AVATAR_MODEL,
                prompt: `User says: "${userMessage}"`,
                system: systemPrompt,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama responded with ${response.status}`);
        }

        const data = await response.json();
        
        res.status(200).json({
            status: 'success',
            reply: data.response
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Avatar is currently unavailable.' });
    }
};
