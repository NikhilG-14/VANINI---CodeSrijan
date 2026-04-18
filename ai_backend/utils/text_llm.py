import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv
try:
    from groq import Groq
except ModuleNotFoundError:
    Groq = None

from ai_backend.prompts import (INSPIRATION_POEM_PROMPT,
                             USER_POST_TEXT_DECOMPOSITION_PROMPT,
                             USER_POST_TEXT_EXPANSION_PROMPT)

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
USE_OLLAMA = os.getenv("USE_OLLAMA", "true").lower() == "true"

def call_ollama(prompt, system_prompt=None):
    """Helper to call local Ollama instance."""
    try:
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False
        }
        if system_prompt:
            payload["system"] = system_prompt
            
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code == 200:
            return response.json().get("response")
    except Exception as e:
        print(f"Ollama call failed: {e}")
    return None

async def expand_user_text_using_gemini(user_input):
    """Expand text using Gemini (Cloud Fallback)."""
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{USER_POST_TEXT_EXPANSION_PROMPT}. The data is {user_input}"
        )
        return response.text
    except Exception as e:
        print(f"Gemini expansion failed: {e}")
        return "Error expanding text with Gemini."

async def expand_user_text_using_gemma(user_input):
    """Expand text using Groq/Gemma (Cloud Fallback)."""
    if Groq is None:
        return "Groq dependency is not installed."
    try:
        client = Groq(api_key=os.getenv("GROQ_API_TOKEN"))
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": f"{USER_POST_TEXT_EXPANSION_PROMPT}. The data is {user_input}",
                }
            ],
            model="gemma2-9b-it",
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Groq/Gemma expansion failed: {e}")
        return "Error expanding text with Groq."

async def expand_user_text_with_priority(user_input):
    """Try Ollama first, then fallback to cloud models."""
    if USE_OLLAMA:
        result = call_ollama(f"{USER_POST_TEXT_EXPANSION_PROMPT}. The data is {user_input}")
        if result:
            return result
            
    # Fallback to Gemini if Ollama is unavailable
    return await expand_user_text_using_gemini(user_input)

def decompose_user_text(user_input):
    """Decompose text using Ollama with Gemini fallback."""
    if USE_OLLAMA:
        result = call_ollama(f"{USER_POST_TEXT_DECOMPOSITION_PROMPT}. The data is {user_input}")
        if result:
            return result

    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{USER_POST_TEXT_DECOMPOSITION_PROMPT}. The data is {user_input}"
        )
        return response.text
    except Exception as e:
        print(f"Gemini decomposition failed: {e}")
        return "Error decomposing text."

def create_poem(user_input):
    """Create poem using Ollama with Gemini fallback."""
    if USE_OLLAMA:
        result = call_ollama(f"{INSPIRATION_POEM_PROMPT}. The data is {user_input}")
        if result:
            return result

    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash-8b")
        response = model.generate_content(
            f"{INSPIRATION_POEM_PROMPT}. The data is {user_input}"
        )
        return response.text
    except Exception as e:
        print(f"Gemini poem generation failed: {e}")
        return "Error generating poem."

async def generate_ai_response(prompt: str, system_prompt: str = None):
    """Unified AI response generator (Ollama or Gemini)."""
    if USE_OLLAMA:
        result = call_ollama(prompt, system_prompt)
        if result:
            return result
            
    # Fallback to Gemini
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Combine system prompt if provided
        full_prompt = f"System: {system_prompt}\n\nUser: {prompt}" if system_prompt else prompt
        response = await model.generate_content_async(full_prompt)
        return response.text
    except Exception as e:
        print(f"Gemini generation error: {e}")
        return None

def text_to_image(user_input):
    """Placeholder for image generation logic."""
    pass
