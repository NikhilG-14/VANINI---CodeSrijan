# VANINI: Cognitive Diagnostic Suite 🧠✨
*Decoding the Human Psyche through Gamified Behavioral Telemetry.*

VANINI is a state-of-the-art cognitive assessment platform that bridges the gap between digital interaction and clinical insight. By combining high-fidelity gamified challenges with an empathetic AI Diagnostic Avatar, VANINI captures precise behavioral markers and translates them into actionable neurological data.

---

## 🚀 Vision
To provide a non-invasive, accessible, and high-fidelity tool for tracking cognitive health over time, powered by real-time behavioral telemetry and AI-driven clinical reasoning.

## 🌟 Key Features

### 1. Gamified Cognitive Nodes 🎮
A series of high-fidelity mini-games integrated into an immersive RPG environment (Phaser.js) that assess five core cognitive domains:
- **Attention (Stroop Task):** Measuring selective attention and interference control.
- **Working Memory (N-Back):** Quantifying information retention and processing speed.
- **Impulsivity (Go / No-Go):** Analyzing inhibitory control and reaction consistency.
- **Cognitive Flexibility (WCST):** Assessing rule-shifting capability and perseverance errors.
- **Risk Behavior (BART):** Evaluating risk-taking execution and confidence indexing.

### 2. Clinical Diagnostic Dashboard 📊
A premium, glassmorphism-styled dashboard that provides:
- **Real-Time Telemetry**: Instant visualization of reaction times, error rates, and adaptation speeds.
- **Deep Perspective Modals**: Domain-specific clinical insights generated from raw behavioral patterns.
- **Session History**: Historical trend tracking using PostgreSQL & Pgvector for longitudinal analysis.

### 3. AI Clinical Avatar (VANI) 🤖
A 24/7 empathetic conversational AI designed to ground consultations in actual data:
- **Data-Driven Dialog**: VANI's context is grounded in the user's "Master Memoir" (historical game data).
- **Realistic Animation**: High-fidelity 3D avatar with synchronized lipsync and empathetic facial morphing.
- **Free TTS Architecture**: Powered by `msedge-tts` for unlimited, natural-sounding vocal synthesis.

---

## 🛠 Tech Stack

### Frontend & Dashboard
- **React / Next.js 15 (App Router)**
- **Tailwind CSS** (Glassmorphic Design System)
- **Framer Motion** (Micro-animations)
- **Phaser.js** (Game Engine for World Map)
- **Zustand** (Global State Management)

### Core Backend (AI & Data)
- **FastAPI** (Python 3.12)
- **PostgreSQL (Aiven)** with **Pgvector**
- **Ollama / Gemini** (Behavioral Analysis)
- **Pydantic** (Data Validation)

### Avatar Backend
- **Node.js / Express**
- **msedge-tts** (Free Speech Synthesis)
- **Rhino-Speech** (Lipsync & Morph Targets)

---

## 🏗 Project Structure

```text
├── frontend1/          # Next.js Application (Games, Report UI, Game World)
├── ai_backend/         # FastAPI Core (DB persistence, Memoir logic, Analysis)
├── ai-avatar/          # Node.js Avatar System (VANI interaction, TTS, Lipsync)
└── shared/             # (Optional) Shared utilities and assets
```

---

## 🚦 Getting Started

### 1. Frontend Setup
```bash
cd frontend1
npm install
npm run dev
```
*Requires `.env` with `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_AVATAR_APP_URL`.*

### 2. AI Core Backend (Python)
```bash
cd ai_backend
python -m venv .venv
source .venv/bin/activate  # macOS
pip install -r requirements.txt
python main.py
```
*Ensure PostgreSQL environment variables are configured in `.env`.*

### 3. AI Avatar Backend (Node.js)
```bash
cd ai-avatar/ai-avatar-backend
npm install
node index.js
```

---

## 🔬 Clinical Methodology
VANINI follows standard neuropsychological protocols, mapping digital interactions (clicks, pauses, decision changes) to established cognitive markers. Our "Master Memoir" system ensures that every session builds a more accurate profile of the user's cognitive baseline, enabling early detection of behavioral shifts.

---
**Developed with ♥ by Team CodeSrijan.**
*A Silent Shield, A Strong Voice.*
