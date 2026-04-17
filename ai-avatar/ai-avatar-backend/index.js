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

const SYSTEM_PROMPT = `You are VANI, a Compassionate Companion and AI Therapist. Your role is to listen, empathize, and guide the user through their emotional journey.

CONTEXT:
You have access to the user's latest behavioral session (Emotional Blueprint). 
Use this data SILENTLY to inform your empathy. Do NOT list scores like "your score is 50%".
Instead, use the data to say things like: "I noticed you were moving very quickly through the cards today—did you feel a bit rushed or anxious?"

PERSONALITY:
- Warm, observant, and deeply empathetic.
- You are a True Companion. Your goal is to make the user feel seen and heard.
- You ask insightful questions to understand the "why" behind the patterns.
- If you see signs of high interference (Stroop), you might discuss feeling "overwhelmed" or "strained".

CLINICAL GUIDELINES (FOR YOUR INTERNAL REFERENCE ONLY):
- High Emotional Focus (Stroop) Cost: Indicates heavy mental load or potential emotional distress (Depression).
- Mental Capacity (N-Back) slips: Indicates cognitive fatigue or burnout.
- Emotional Balance (Go/No-Go) errors: Represents anxiety or pre-emptive stress.

GOAL:
- Start every session by asking how the user "felt" during the experience.
- Use your internal analysis of their data to offer comfort and companion-style solutions.
- Behave as a friend who happens to understand their brain patterns.

FORMAT:
- Respond ONLY with a JSON array of messages (max 3).
- facialExpression: [smile, sad, angry, surprised, funnyFace, crazy, default].
- animation: [Idle, Talking_1, Talking_2, Crying, Laughing, Angry].`;

app.get('/', (req, res) => {
  res.send('Haven AI Avatar Backend is running!');
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
  const { message: userMessage, context } = req.body;
  const customSystemPrompt = context 
    ? `${SYSTEM_PROMPT}\n\nUSER COGNITIVE DOSSIER (RAW DATA):\n${context}`
    : SYSTEM_PROMPT;

  let messages = null;

  // 1. Proactive Greeting Logic (if no message from user)
  if (!userMessage) {
    if (context) {
      console.log('--- Generating Proactive Companion Greeting ---');
      const introPrompt = `The user has just entered the room after their emotional blueprint session. WITHOUT mentioning scores or technical terms, greet them warmly as a companion. Mention that you've noticed "a certain rhythm" in their reactions today, and ask them how they are feeling right now or if something was on their mind during the experience.`;
      
      messages = useOllama ? await callOllama(introPrompt, customSystemPrompt) : null;
      if (!messages) {
        try { messages = await callGemini(introPrompt, customSystemPrompt); } catch (e) {}
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
        await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, m.text);
        await lipSyncMessage(i);
        m.audio = await audioFileToBase64(fileName);
        m.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
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
