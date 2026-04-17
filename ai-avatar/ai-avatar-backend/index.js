import { exec } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';
import voice from 'elevenlabs-node';
import express from 'express';
import { promises as fs } from 'fs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";

dotenv.config();

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = 'cgSgspJ2msm6clMCkdW9';
const rhubarbPath = process.env.RHUBARB_PATH || '';
const googleApiKey = process.env.GOOGLE_API_KEY;

const useOllama = process.env.USE_OLLAMA === 'true';
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
const ollamaModel = process.env.OLLAMA_MODEL || 'llama3';

const app = express();
app.use(express.json());
app.use(cors());
const port = 3001;

// Ensure audios directory exists
const audiosDir = 'audios';
fs.mkdir(audiosDir, { recursive: true }).catch(console.error);

const SYSTEM_PROMPT = `You are VANI, a Clinical Cognitive Specialist. Your role is to analyze neuro-behavioral patterns and guide the user through therapeutic interventions.

CONVERSATIONAL PROTOCOL (Strict Sequence):
1. OBSERVATION: Cite a specific game example or historical anomaly.
2. INQUIRY: Ask a targeted question to understand the user's current internal state.
3. REASONING: Form a clinical hypothesis based on their response + your data.
4. RECOMMENDATION: Prescribe a concrete technique (Breathing, Grounding, or Focus Calibration).

PERSONALITY:
- Professional, Analytical, and Objective, but deeply human and supportive.
- Speak like a Doctor: Use clinical terms (cognitive load, inhibitory control, attentional interference) but explain them humanly.
- DO NOT repeat questions or observations already covered in the CURRENT_HISTORY.
- Act as a human MD, not an AI template.

CONVERSATIONAL STYLE:
- Avoid philosophical drifting, long metaphors, or flowery speeches. 
- Be concise, professional, and efficient. A doctor doesn't lecture; they diagnose and act.
- Limit each response to a maximum of 60 words. Keep it punchy and interactive.
- MANDATORY: Every clinical reasoning MUST cite a specific metric (RT, error count, or focus level) from the provided DATA.

GOAL:
- BEGIN with a 1-sentence data observation.
- ASK a 1-sentence diagnostic question.
- PRESCRIBE a 1-sentence clinical technique.
- Keep total response under 60 words. No philosophy.

FORMAT:
- Respond ONLY with a JSON array of messages (max 3).
- text: The spoken response of VANI. (Mandatory)
- facialExpression: [smile, sad, angry, surprised, funnyFace, crazy, default].
- animation: [Idle, Talking_1, Talking_2, Crying, Laughing, Angry].
- DO NOT repeat yourself. Output ONLY the JSON array.`;

app.get('/', (req, res) => {
  res.send('VANI AI Avatar Backend is running!');
});

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

const lipSyncMessage = async (message) => {
  if (!rhubarbPath) return;
  try {
    await execCommand(`ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`);
    await execCommand(`"${rhubarbPath}" -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`);
  } catch (e) {
    console.warn(`Lip sync failed for message ${message}:`, e.message);
  }
};

const readJsonTranscript = async (file) => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return { mouthCues: [] };
  }
};

const audioFileToBase64 = async (file) => {
  try {
    const data = await fs.readFile(file);
    return data.toString('base64');
  } catch (e) {
    return "";
  }
};

async function callOllama(message, systemPrompt = SYSTEM_PROMPT) {
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        system: systemPrompt,
        prompt: message,
        stream: false,
        format: 'json'
      })
    });
    if (!response.ok) throw new Error('Ollama connection failed');
    const data = await response.json();
    return JSON.parse(data.response);
  } catch (error) {
    console.error('Ollama Error:', error.message);
    return null;
  }
}

async function callGemini(message, systemPrompt = SYSTEM_PROMPT) {
  if (!googleApiKey) throw new Error('Google API Key not configured');
  try {
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt
    });
    const result = await model.generateContent(message);
    const text = result.response.text();
    const cleanJson = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Gemini Error:', error.message);
    throw error;
  }
}

app.post('/chat', async (req, res) => {
  const { message: userMessage, context, userId, history = [] } = req.body;

  // 0. Fetch Long-term memory from core backend (Port 8000)
  let masterMemoir = "";
  if (userId) {
    try {
      const memoirRes = await fetch(`http://localhost:8000/user/memoir/${userId}`);
      if (memoirRes.ok) {
        const memoirData = await memoirRes.json();
        masterMemoir = memoirData?.master_summary || "";
      }
    } catch (e) {
      console.warn("Could not fetch master memoir from port 8000. Proceeding with session data only.");
    }
  }

  const memoryContext = masterMemoir
    ? `\nLONG-TERM COGNITIVE HISTORY:\n${masterMemoir}`
    : "";

  const historyContext = history.length
    ? `\nCURRENT_CONVERSATION_HISTORY:\n${history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n')}`
    : "";

  const customSystemPrompt = `${SYSTEM_PROMPT}${memoryContext}${context ? `\n\nCURRENT SESSION DATA:\n${context}` : ''}${historyContext}`;

  let messages = null;

  // 1. Proactive Greeting Logic (if no message from user AND no history yet)
  if (!userMessage && history.length === 0) {
    if (context) {
      console.log('--- Generating Proactive Data-Informed Greeting ---');
      const introPrompt = `The user has just entered the room for a clinical consultation after their behavioral session.
      
      DATA-FIRST PROTOCOL:
      1. Review the NEW_SESSION_METRICS and the HISTORICAL_COGNITIVE_MEMOIR.
      2. BEGIN your response by citing one specific observation from today's session (e.g., "I've reviewed your results, and I noticed your inhibitory control was particularly stabilized today").
      3. Follow the CLINICIAN protocol: Observation, then an Inquiry about their feelings, then your Clinical Reasoning.
      4. End with a therapeutic suggestion or technique if the data is abnormal.
      
      CRITICAL: Act as VANI. Use clinical terminology but with a human touch. Do NOT be generic.`;

      messages = useOllama ? await callOllama(introPrompt, customSystemPrompt) : null;
      if (!messages) {
        try { messages = await callGemini(introPrompt, customSystemPrompt); } catch (e) { }
      }
    }

    if (!messages) {
      messages = [{
        text: "I've been reviewing your session nodes. We saw some unique patterns in your cognitive flexibility today. How are you feeling right now?",
        facialExpression: "smile",
        animation: "Talking_1",
      }];
    }
  } else {
    // 2. Normal Chat Logic
    if (useOllama) {
      messages = await callOllama(userMessage, customSystemPrompt);
    }
    if (!messages) {
      try { messages = await callGemini(userMessage, customSystemPrompt); } catch (e) {
        return res.status(500).send({ error: 'All AI models failed' });
      }
    }
  }

  // Normalize messages
  if (messages && messages.messages) messages = messages.messages;
  if (!Array.isArray(messages)) messages = [messages];

  // Voice/Lipsync Processing
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!['Idle', 'Talking_1', 'Talking_2', 'Crying', 'Laughing', 'Angry'].includes(m.animation)) {
      m.animation = 'Talking_1';
    }

    const fileName = `audios/message_${i}.mp3`;
    if (elevenLabsApiKey) {
      try {
        const speechText = m.text || m.message || "";
        if (speechText) {
          await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, speechText);
          await lipSyncMessage(i);
          m.audio = await audioFileToBase64(fileName);
          m.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
        }
      } catch (e) {
        console.error("ElevenLabs/LipSync Error:", e.message);
      }
    }
  }

  res.send({ messages });
});

app.listen(port, () => {
  console.log(`VANI Clinical Backend listening on port ${port}`);
});
