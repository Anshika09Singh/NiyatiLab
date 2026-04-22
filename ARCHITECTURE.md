# 🧠 AI Career Intelligence System — Architecture Blueprint

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                       │
│  HTML + Tailwind CSS + Vanilla JS + Chart.js + face-api.js      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Resume       │ │ Interview    │ │ Career       │            │
│  │ Analyzer     │ │ Simulator    │ │ Roadmap      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└───────────────────────┬─────────────────────────────────────────┘
                        │ REST API (JSON / Multipart)
┌───────────────────────▼─────────────────────────────────────────┐
│                    BACKEND (Flask + Python)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ /resume  │ │/interview│ │ /roadmap │ │ /jobs    │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└───────────────────────┬─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                      AI / ML Pipeline                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Gemini API      │  │ FAISS Embeddings│  │ Whisper STT     │ │
│  │ (LLM Core)      │  │ (Job Matching)  │  │ (Voice Input)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
ai-career-intelligence/
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js, resume.js, interview.js, roadmap.js, jobs.js
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   └── api/
│       ├── resume_routes.py
│       ├── interview_routes.py
│       ├── roadmap_routes.py
│       └── jobs_routes.py
├── ai_models/
│   ├── resume_analyzer.py
│   ├── career_predictor.py
│   ├── skill_gap_analyzer.py
│   ├── interview_coach.py
│   ├── speech_processor.py
│   └── job_matcher.py
├── utils/
│   ├── pdf_parser.py
│   ├── embeddings.py
│   └── gemini_client.py
└── data/
    ├── job_descriptions/
    └── faiss_index/
```
