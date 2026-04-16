import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userInput } = await req.json();

    // Call local Ollama model to generate content based on user input
    // Assuming a common powerful model like llama3 or mistral is installed.
    // If a different model is preferred, the user can change "llama3" to their installed model.
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3', // Adjust this if a different model is used
        prompt: `You are an expert Indian Law assistant. Provide accurate, clear, and helpful answers to the following user query: ${userInput}`,
        stream: false,
      }),
    });

    if (!response.ok) {
       console.error("Local Ollama response not ok", response.status);
       throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Return the response from Ollama AI as JSON
    return NextResponse.json({ reply: result.response });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'There was an issue processing your request to the local model. Please ensure Ollama is running and the model is installed.' },
      { status: 500 }
    );
  }
}

