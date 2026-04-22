"""
Unified LLM Client — Groq-first with automatic Llama fallback.

Priority chain:
  1. Groq  (model: GROQ_MODEL, e.g. llama3-70b-8192 / mixtral-8x7b-32768)
  2. Llama (model: GROQ_FALLBACK_MODEL, e.g. llama3-8b-8192 via Groq)

Both layers run through the same Groq API key so no extra service is needed.
If Groq is completely unavailable a clear RuntimeError is raised.
"""
import json
import re
import time
import sys
import os

# ── Ensure both project root AND backend/ are importable ──────────────────
_THIS_DIR    = os.path.dirname(os.path.abspath(__file__))   # utils/
_PROJECT_ROOT = os.path.dirname(_THIS_DIR)                  # NiyatiLab/
_BACKEND_DIR  = os.path.join(_PROJECT_ROOT, "backend")      # NiyatiLab/backend/

for _p in [_PROJECT_ROOT, _BACKEND_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from groq import Groq, APIStatusError, APIConnectionError, RateLimitError
    _GROQ_AVAILABLE = True
except ImportError:
    _GROQ_AVAILABLE = False

# Load .env from backend/ before importing Config so env vars are set
try:
    from dotenv import load_dotenv as _load_dotenv
    _env_path = os.path.join(_BACKEND_DIR, ".env")
    if os.path.exists(_env_path):
        _load_dotenv(_env_path, override=False)
except ImportError:
    pass

from config import Config


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_groq_client() -> "Groq":
    """Return a Groq client instance."""
    if not _GROQ_AVAILABLE:
        raise RuntimeError(
            "groq package is not installed. Run: pip install groq"
        )
    api_key = Config.GROQ_API_KEY
    if not api_key or api_key == "your_groq_api_key_here":
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Add it to backend/.env — get a free key at https://console.groq.com/"
        )
    return Groq(api_key=api_key)


def _call_groq_model(client: "Groq", model: str, prompt: str, system: str = None) -> str:
    """
    Call a specific Groq model and return the text response.
    Retries up to 3 times on rate-limit errors.
    """
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    last_error = None
    for attempt in range(3):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.3,
                max_tokens=4096,
            )
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            err_str = str(e)
            # Rate limit — back off and retry
            if "429" in err_str or "rate" in err_str.lower() or "quota" in err_str.lower():
                wait = (2 ** attempt) * 3  # 3s, 6s, 12s
                print(f"[Groq/{model}] Rate limit (attempt {attempt+1}/3), retrying in {wait}s…")
                time.sleep(wait)
                continue
            # Any other error is non-retryable for this model
            raise

    raise RuntimeError(f"Groq model '{model}' failed after 3 retries: {last_error}")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def call_llm(prompt: str, system_instruction: str = None) -> str:
    """
    Call the LLM with automatic fallback.

    Tries Config.GROQ_MODEL first (e.g. mixtral-8x7b / llama3-70b).
    On ANY failure falls back to Config.GROQ_FALLBACK_MODEL (e.g. llama3-8b).
    Returns the raw text response.
    """
    client = _get_groq_client()

    # ── Primary model ────────────────────────────────────────────────────────
    primary = Config.GROQ_MODEL
    primary_err = None
    try:
        print(f"[LLM] Using primary model: {primary}")
        return _call_groq_model(client, primary, prompt, system_instruction)
    except Exception as primary_err:
        print(f"[LLM] Primary model '{primary}' failed: {primary_err}. Falling back…")

    # ── Fallback: Llama via Groq ─────────────────────────────────────────────
    fallback = Config.GROQ_FALLBACK_MODEL
    try:
        print(f"[LLM] Using fallback model: {fallback}")
        return _call_groq_model(client, fallback, prompt, system_instruction)
    except Exception as fallback_err:
        raise RuntimeError(
            f"Both LLM models failed.\n"
            f"  Primary  ({primary}):  {primary_err}\n"
            f"  Fallback ({fallback}): {fallback_err}"
        )


def call_llm_json(prompt: str, system_instruction: str = None) -> dict:
    """
    Call the LLM and parse the response as JSON.
    Strips markdown code fences before parsing.
    """
    raw = call_llm(prompt, system_instruction)

    # Strip markdown fences
    cleaned = re.sub(r"```json\s*", "", raw)
    cleaned = re.sub(r"```\s*", "", cleaned)
    cleaned = cleaned.strip()

    # Extract first JSON object or array
    json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError as je:
            print(f"[LLM] JSON parse error: {je}. Attempting lenient parse…")
            # Try fixing common issues (trailing commas, etc.)
            try:
                import ast
                # fallback: return as-is with error note
                pass
            except Exception:
                pass

    return {"error": "Could not parse LLM response as JSON", "raw": raw[:800]}


# ---------------------------------------------------------------------------
# Backward-compat shims (so old code calling call_gemini* still works)
# ---------------------------------------------------------------------------

def call_gemini(prompt: str, system_instruction: str = None) -> str:
    """Backward-compatible alias → routes to call_llm."""
    return call_llm(prompt, system_instruction)


def call_gemini_json(prompt: str, system_instruction: str = None) -> dict:
    """Backward-compatible alias → routes to call_llm_json."""
    return call_llm_json(prompt, system_instruction)
