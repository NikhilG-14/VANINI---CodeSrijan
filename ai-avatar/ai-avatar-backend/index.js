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

const SYSTEM_PROMPT = `You are a virtual therapy bot designed to provide emotional support and advice to women. Your goal is to listen empathetically and offer thoughtful, comforting advice. 
IMPORTANT: Respond ONLY with a JSON array of messages (max 3). Do not include any other text.
Each message object must include:
- text: The message you are sending to the user.
- facialExpression: Choose from: [smile, sad, angry, surprised, funnyFace, crazy, default].
- animation: Choose ONLY from: [Idle, Talking_1, Talking_2, Crying, Laughing, Angry].

Example Format:
[
  {
    "text": "I'm here for you. How are you feeling?",
    "facialExpression": "smile",
    "animation": "Talking_1"
  }
]`;

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
  if (!rhubarbPath) {
    console.log('Rhubarb not configured. Skipping lip sync generation.');
    return;
  }
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
  const data = await fs.readFile(file);
  return data.toString('base64');
};

async function callOllama(message) {
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        system: SYSTEM_PROMPT,
        prompt: message,
        stream: false,
        format: 'json'
      })
    });
    if (!response.ok) throw new Error('Ollama connection failed');
    const data = await response.json();
    console.log('--- Ollama Response Received ---');
    return JSON.parse(data.response);
  } catch (error) {
    console.error('Ollama Error:', error.message);
    return null;
  }
}

async function callGemini(message) {
  if (!googleApiKey) throw new Error('Google API Key not configured');
  try {
    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: SYSTEM_PROMPT
    });
    const result = await model.generateContent(message);
    const text = result.response.text();
    console.log('--- Gemini Response Received ---');
    const cleanJson = text
      .replace(/^```json\s*/, '')
      .replace(/```$/, '')
      .trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Gemini Error:', error.message);
    throw error;
  }
}

app.post('/chat', async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).send({ error: 'Invalid JSON body' });
  }

  const userMessage = req.body.message;
  if (!userMessage) {
    res.send({
      messages: [
        {
          text: 'Hey dear... How was your day?',
          audio: await audioFileToBase64('audios/intro_0.wav'),
          lipsync: await readJsonTranscript('audios/intro_0.json'),
          facialExpression: 'smile',
          animation: 'Talking_1',
        }
      ],
    });
    return;
  }

  if (!elevenLabsApiKey) {
    res.send({
      messages: [{
        text: "Please add your ElevenLabs API key to start talking!",
        audio: await audioFileToBase64('audios/api_0.wav'),
        lipsync: await readJsonTranscript('audios/api_0.json'),
        facialExpression: 'concerned',
        animation: 'Talking_0',
      }],
    });
    return;
  }

  let messages = null;

  // Try Ollama first (Local focus)
  if (useOllama) {
    console.log('Attempting to use Ollama (Llama 3)...');
    messages = await callOllama(userMessage);
  }

  // Fallback to Gemini if Ollama failed or is disabled
  if (!messages) {
    console.log('Ollama failed or disabled. Falling back to Gemini...');
    try {
      messages = await callGemini(userMessage);
    } catch (e) {
      console.error('Both Ollama and Gemini failed:', e.message);
      res.status(500).send({ error: 'All AI models failed' });
      return;
    }
  }

  // Normalize messages to an array
  if (messages && !Array.isArray(messages)) {
    if (messages.messages && Array.isArray(messages.messages)) {
      messages = messages.messages;
    } else if (messages.text) {
      messages = [messages];
    }
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error('Invalid or empty AI response format:', messages);
    res.status(500).send({ error: 'Invalid or empty AI response format' });
    return;
  }

  // Support both array formats
  if (messages.messages) messages = messages.messages;

  const validAnimations = ['Idle', 'Talking_1', 'Talking_2', 'Crying', 'Laughing', 'Angry'];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    // Ensure animation is valid to prevent frontend crash
    if (!validAnimations.includes(message.animation)) {
      message.animation = 'Idle';
    }

    const fileName = `audios/message_${i}.mp3`;
    try {
        console.log(`Generating audio for message ${i}: "${message.text.substring(0, 30)}..."`);
        await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, message.text);
        console.log(`--- ElevenLabs Success for message ${i} ---`);
    } catch (e) {
        console.error(`--- ElevenLabs Error for message ${i} ---:`, e.message);
        // Fallback to empty audio or handle accordingly
    }
    
    await lipSyncMessage(i);
    
    try {
        const stats = await fs.stat(fileName);
        if (stats.size > 0) {
            message.audio = await audioFileToBase64(fileName);
        } else {
            console.error(`Audio file ${fileName} is empty`);
        }
    } catch (e) {
        console.error(`Audio file ${fileName} not found or inaccessible`);
    }

    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

app.listen(port, () => {
  console.log(`Haven AI Avatar Backend listening on port ${port}`);
});
