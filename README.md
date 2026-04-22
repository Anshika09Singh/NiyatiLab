# AI Career Intelligence System

> **Next-Gen Resume + Interview Coach** — Powered by Groq LLM, FAISS, Flask & Vanilla JS

---

## 🚀 Quick Start

### 1. Get a FREE Groq API Key

👉 https://console.groq.com/keys

---

### 2. Setup & Run

```bash
# Windows
start.bat

# Manual setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Setup environment
copy .env.example .env
# Edit .env → add your key
```

```env
GROQ_API_KEY=your_groq_api_key_here
```

```bash
python app.py
```

---

### 3. Open Frontend

Open `frontend/index.html` in your browser
(Use Live Server for better experience)

---

## 🧠 Features

* Resume Analysis (ATS Score + Skill Extraction)
* Career Prediction with Success Probability
* Skill Gap Analyzer with Weekly Roadmap
* AI Interview Simulator (Voice + Feedback)
* Emotion Detection (face-api.js)
* Job Matching using Embeddings (FAISS)
* Post-Interview Failure Analysis

---

## 📁 Project Structure

```
ai-career-intelligence/
├── frontend/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── .env
│   └── api/
├── ai_models/
├── utils/
│   └── llm_client.py   # Groq API integration
└── data/
```

---

## 🔧 API Endpoints

* `/health` → Server status
* `/api/resume/analyze` → Resume analysis
* `/api/roadmap/generate` → Skill roadmap
* `/api/interview/analyze-answer` → Interview feedback
* `/api/jobs/match` → Job matching

---

## ⚙️ Environment Variables

```env
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_secret_key
```

---

## 📦 Tech Stack

* Frontend → HTML, CSS, JS
* Backend → Flask (Python)
* LLM → Groq (LLaMA 3)
* Embeddings → FAISS
* Emotion AI → face-api.js
* Speech → Whisper

---

## 🔮 Future Scope

* LinkedIn Integration
* Real-time Job Scraping
* Cover Letter Generator
* Video Interview Simulation
* Mobile App

---

## ⚠️ Important

* Do NOT upload `.env` to GitHub
* Keep API keys secure
* Use `.gitignore`

---

Built for **Hackathons 🚀 | Portfolio 💼 | Real-world AI Applications 🤖**
