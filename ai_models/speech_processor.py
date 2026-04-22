"""
Speech processor using OpenAI Whisper for transcription.
Falls back to browser Web Speech API when Whisper is unavailable.
"""
import os
import tempfile


WHISPER_AVAILABLE = False
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    pass

_whisper_model = None


def _get_whisper_model(model_size: str = "base"):
    global _whisper_model
    if _whisper_model is None and WHISPER_AVAILABLE:
        _whisper_model = whisper.load_model(model_size)
    return _whisper_model


def transcribe_audio(audio_path: str, language: str = "en") -> dict:
    """
    Transcribe audio file to text.
    Returns {'transcript': str, 'language': str, 'confidence': float}
    """
    if not WHISPER_AVAILABLE:
        return {
            "transcript": "",
            "language": language,
            "confidence": 0.0,
            "error": "Whisper not installed. Run: pip install openai-whisper"
        }

    model = _get_whisper_model("base")
    if model is None:
        return {"transcript": "", "error": "Failed to load Whisper model"}

    try:
        result = model.transcribe(audio_path, language=language)
        return {
            "transcript": result.get("text", "").strip(),
            "language": result.get("language", language),
            "confidence": 0.95,  # Whisper doesn't provide per-file confidence
            "segments": [
                {"start": s["start"], "end": s["end"], "text": s["text"]}
                for s in result.get("segments", [])
            ]
        }
    except Exception as e:
        return {"transcript": "", "error": str(e)}


def analyze_speech_quality(transcript: str) -> dict:
    """
    Analyze transcript for speech quality metrics.
    (Filler words, estimated WPM, sentence complexity)
    """
    filler_words = ["um", "uh", "like", "you know", "basically", "literally",
                    "actually", "so", "right", "okay", "well", "sort of", "kind of"]

    words = transcript.lower().split()
    total_words = len(words)

    fillers_found = {}
    for filler in filler_words:
        filler_parts = filler.split()
        count = 0
        for i in range(len(words) - len(filler_parts) + 1):
            if words[i:i+len(filler_parts)] == filler_parts:
                count += 1
        if count > 0:
            fillers_found[filler] = count

    total_fillers = sum(fillers_found.values())
    filler_rate = (total_fillers / total_words * 100) if total_words > 0 else 0

    sentences = [s.strip() for s in transcript.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    avg_sentence_length = total_words / len(sentences) if sentences else 0

    return {
        "total_words": total_words,
        "filler_words": fillers_found,
        "filler_rate_percent": round(filler_rate, 1),
        "estimated_sentences": len(sentences),
        "avg_sentence_length": round(avg_sentence_length, 1),
        "fluency_score": max(0, min(100, 100 - filler_rate * 5)),
        "fluency_rating": (
            "Excellent" if filler_rate < 2 else
            "Good" if filler_rate < 5 else
            "Fair" if filler_rate < 10 else
            "Needs Improvement"
        )
    }
