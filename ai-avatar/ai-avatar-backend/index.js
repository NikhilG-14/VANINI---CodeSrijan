import { exec } from 'child_process';
import cors from 'cors';
import dotenv from 'dotenv';
import voice from 'elevenlabs-node';
import express from 'express';
import { promises as fs } from 'fs';
import OpenAI from 'openai';
import { VertexAI } from '@google-cloud/vertexai';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '-',
});

const elevenLabsApiKey = process.env.ELEVEN_LABS_API_KEY;
const voiceID = 'cgSgspJ2msm6clMCkdW9';
// Path to Rhubarb Lip Sync binary (optional)
// If not set, lip sync will gracefully fall back to empty lipsync data
const rhubarbPath = process.env.RHUBARB_PATH || '';

const app = express();
app.use(express.json());
app.use(cors());
const port = 3001; // Changed from 3000 to avoid conflict with main frontend

app.get('/', (req, res) => {
  res.send('Haven AI Avatar Backend is running!');
});

app.get('/voices', async (req, res) => {
  res.send(await voice.getVoices(elevenLabsApiKey));
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
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  try {
    await execCommand(
      `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    );
    console.log(`Conversion done in ${new Date().getTime() - time}ms`);
    await execCommand(
      `"${rhubarbPath}" -f json -o audios/message_${message}.json audios/message_${message}.wav -r phonetic`
    );
    console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
  } catch (e) {
    console.warn(`Lip sync failed for message ${message}:`, e.message);
  }
};

const readJsonTranscript = async (file) => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    // Return empty lipsync if file doesn't exist (when Rhubarb is not configured)
    return { mouthCues: [] };
  }
};

const audioFileToBase64 = async (file) => {
  const data = await fs.readFile(file);
  return data.toString('base64');
};

app.post('/chat', async (req, res) => {
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
        },
        {
          text: "I missed you so much... Please don't go for so long!",
          audio: await audioFileToBase64('audios/intro_1.wav'),
          lipsync: await readJsonTranscript('audios/intro_1.json'),
          facialExpression: 'sad',
          animation: 'Crying',
        },
      ],
    });
    return;
  }
  if (!elevenLabsApiKey || openai.apiKey === '-') {
    res.send({
      messages: [
        {
          text: "Please my dear, don't forget to add your API keys!",
          audio: await audioFileToBase64('audios/api_0.wav'),
          lipsync: await readJsonTranscript('audios/api_0.json'),
          facialExpression: 'angry',
          animation: 'Angry',
        },
        {
          text: "You don't want to ruin Haven with a crazy ElevenLabs bill, right?",
          audio: await audioFileToBase64('audios/api_1.wav'),
          lipsync: await readJsonTranscript('audios/api_1.json'),
          facialExpression: 'smile',
          animation: 'Laughing',
        },
      ],
    });
    return;
  }

  const project = 'tantrotsav-410809';
  const location = 'us-central1';
  const textModel = 'gemini-1.5-flash';
  const vertexAI = new VertexAI({ project: project, location: location });

  const generativeModelPreview = vertexAI.preview.getGenerativeModel({
    model: textModel,
    systemInstruction: {
      'role': 'system',
      'parts': [
        {
          'text':
            'You are a virtual therapy bot designed to provide emotional support and advice to women. Your goal is to listen empathetically and offer thoughtful, comforting advice. Respond with a JSON array of messages (max 3). Each message should include the following properties:\n- text: The message you are sending to the user.\n- facialExpression: The emotional tone of your message (e.g., smile, sad, calm, concerned, supportive).\n- animation: The animation corresponding to the emotional tone (e.g., Talking_0, Talking_1, Talking_2, Idle, Supportive, Relaxed).',
        },
      ],
    },
  });
  const request = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage || 'Hello' }],
      },
    ],
  };

  const result = await generativeModelPreview.generateContent(request);
  console.log('Full response: ', JSON.stringify(result));

  const candidate = result?.response?.candidates?.[0];
  const parts = candidate?.content?.parts;

  if (!parts || !parts[0]?.text) {
    console.error('Expected content parts not found in the response.');
    res.status(500).send({ error: 'Unexpected response structure from Google Gemini API.' });
    return;
  }

  let messages;
  try {
    const jsonResponse = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJsonString = jsonResponse
      .replace(/^```json\s*\n/, '')
      .replace(/\n```$/, '');
    messages = JSON.parse(cleanJsonString);
    console.log('Parsed JSON response:', messages);
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    res.status(500).send({ error: 'Error parsing response from Google Gemini API.' });
    return;
  }

  if (messages.messages) {
    messages = messages.messages;
  }
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const fileName = `audios/message_${i}.mp3`;
    const textInput = message.text;
    await voice.textToSpeech(elevenLabsApiKey, voiceID, fileName, textInput);
    await lipSyncMessage(i);
    message.audio = await audioFileToBase64(fileName);
    message.lipsync = await readJsonTranscript(`audios/message_${i}.json`);
  }

  res.send({ messages });
});

app.listen(port, () => {
  console.log(`Haven AI Avatar Backend listening on port ${port}`);
});
