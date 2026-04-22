"""
gemini_client.py — Legacy shim.

All AI calls now go through utils/llm_client.py (Groq + Llama fallback).
This file re-exports the public surface so that existing imports like
    from utils.gemini_client import call_gemini_json
continue to work without changing any ai_models/*.py files.
"""
import sys
import os

# Ensure paths are set before importing llm_client
_THIS_DIR     = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_THIS_DIR)
_BACKEND_DIR  = os.path.join(_PROJECT_ROOT, "backend")

for _p in [_PROJECT_ROOT, _BACKEND_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from utils.llm_client import call_llm, call_llm_json, call_gemini, call_gemini_json  # noqa: F401

__all__ = ["call_llm", "call_llm_json", "call_gemini", "call_gemini_json"]
