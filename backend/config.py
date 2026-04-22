import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # ── API Keys ────────────────────────────────────────────────────────────
    GROQ_API_KEY    = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")  # kept for future use

    # ── Groq / Llama model settings ────────────────────────────────────────
    # Primary model: high-capability Llama 3.3 70B (current active Groq model)
    GROQ_MODEL          = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    # Fallback model: lighter Llama 3.1 8B — used if primary model is unavailable
    GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "llama-3.1-8b-instant")

    # ── Flask settings ──────────────────────────────────────────────────────
    SECRET_KEY          = os.getenv("SECRET_KEY", "ai-career-intel-secret-2024")
    MAX_CONTENT_LENGTH  = 16 * 1024 * 1024  # 16 MB max upload

    # ── Paths ───────────────────────────────────────────────────────────────
    BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
    UPLOAD_FOLDER   = os.path.join(BASE_DIR, "uploads")
    FAISS_INDEX_DIR = os.path.join(BASE_DIR, "..", "data", "faiss_index")
    JD_DATA_DIR     = os.path.join(BASE_DIR, "..", "data", "job_descriptions")

    # ── Other model settings ────────────────────────────────────────────────
    EMBEDDING_MODEL = "all-MiniLM-L6-v2"

    # ── CORS ────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:5500", "*"]

    @staticmethod
    def ensure_dirs():
        for d in [Config.UPLOAD_FOLDER, Config.FAISS_INDEX_DIR, Config.JD_DATA_DIR]:
            os.makedirs(d, exist_ok=True)
