import urllib.request
import json

def generate_questions(prompt, model="llama3.2:latest"):
    url = "http://localhost:11434/api/generate"
    data = json.dumps({
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as f:
        response = f.read().decode('utf-8')
        return json.loads(json.loads(response)['response'])

# Prompts for each game
prompts = {
    "risk_choice": """Generate 30 psychological 'risk vs safety' scenarios for a game. 
    Format exactly: {"scenarios": [{"q": "Question", "safe": "Safe option text", "risk": "Risky option text"}]}""",
    
    "loop_decision": """Generate 30 reflective life questions for an 'overthinking' game. 
    Format exactly: {"questions": [{"q": "Profound question", "opts": ["Option A", "Option B", "Option C", "Option D"]}]}""",
    
    "timed_decisions": """Generate 30 quick binary decision pairs for a speed-based game. 
    Format exactly: {"decisions": [{"q": "Quick scenario", "opts": ["Option 1", "Option 2"]}]}""",
    
    "perfect_choice": """Generate 30 sets of near-identical options for a decision paralysis game. Each set should have 4 options that are subtly different.
    Format exactly: {"rounds": [{"q": "Question/Scenario", "opts": ["Option 1", "Option 2", "Option 3", "Option 4"]}]}"""
}

grand_data = {}

for key, prompt in prompts.items():
    print(f"Generating {key}...")
    try:
        grand_data[key] = generate_questions(prompt)
    except Exception as e:
        print(f"Error generating {key}: {e}")

with open("grand_dataset.json", "w") as f:
    json.dump(grand_data, f, indent=2)

print("Done! Saved to grand_dataset.json")
