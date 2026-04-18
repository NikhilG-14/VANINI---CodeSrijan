import os
import requests
import google.generativeai as genai
import speech_recognition as sr
from dotenv import load_dotenv
from elevenlabs import play
from elevenlabs.client import ElevenLabs

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
USE_OLLAMA = os.getenv("USE_OLLAMA", "true").lower() == "true"

class colors:
    PURPLE = "\033[95m"
    CYAN = "\033[96m"
    DARKCYAN = "\033[36m"
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"

class AI_Assistant:
    def __init__(self):
        self.elevenlabs_api_key = os.getenv("NEXT_PUBLIC_ELEVEN_LABS_API_KEY", "")
        self.full_transcript = []

    def start_transcription(self):
        self.recognizer = sr.Recognizer()

    def speech_to_text(self):
        with sr.Microphone() as source:
            print(colors.PURPLE + colors.BOLD + "\n User: " + colors.END)
            audio = self.recognizer.listen(source)

        try:
            text = self.recognizer.recognize_google(audio)
            print(f"{text}")
            self.generate_ai_response(text)
        except sr.UnknownValueError:
            print("Speech Recognition could not understand audio")
        except sr.RequestError as e:
            print(f"Could not request results from Speech Recognition service; {e}")

    def call_ollama(self, text):
        try:
            url = f"{OLLAMA_URL}/api/generate"
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": f"You are an empathetic virtual therapist. Respond to the user's message: {text}",
                "stream": False
            }
            response = requests.post(url, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json().get("response")
        except Exception as e:
            print(f"Ollama error: {e}")
        return None

    def generate_ai_response(self, text):
        self.full_transcript.append({"role": "user", "content": text})
        
        ai_response_text = None
        
        if USE_OLLAMA:
            ai_response_text = self.call_ollama(text)
            
        if not ai_response_text:
            try:
                genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(f"You are an empathetic virtual therapist. User says: {text}")
                ai_response_text = response.text
            except Exception as e:
                ai_response_text = "I am sorry, I am having trouble connecting to my brain right now."

        print(colors.GREEN + "\nAI Receptionist: " + colors.END)
        print(ai_response_text)
        self.generate_audio(ai_response_text)

    def generate_audio(self, text):
        self.full_transcript.append({"role": "assistant", "content": text})
        if not self.elevenlabs_api_key:
            print("ElevenLabs API Key missing. Skipping audio generation.")
            return

        try:
            client = ElevenLabs(api_key=self.elevenlabs_api_key)
            audio = client.generate(
                text=text, voice="Brian", model="eleven_multilingual_v2"
            )
            play(audio)
        except Exception as e:
            print(f"Audio generation failed: {e}")

if __name__ == "__main__":
    print("\n\n\n")
    greeting = "Hey there! How are you feeling today?"
    print(colors.GREEN + "\nAI Receptionist: " + colors.END)
    print(greeting)
    ai_assistant = AI_Assistant()
    ai_assistant.generate_audio(greeting)
    ai_assistant.start_transcription()

    while True:
        ai_assistant.speech_to_text()
