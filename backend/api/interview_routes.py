"""Interview simulation API routes."""
import os
import sys
import tempfile
from flask import Blueprint, request, jsonify

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from ai_models.interview_coach import (
    generate_interview_questions,
    evaluate_answer,
    generate_failure_analysis
)
from ai_models.speech_processor import transcribe_audio, analyze_speech_quality

interview_bp = Blueprint("interview", __name__, url_prefix="/api/interview")


@interview_bp.route("/questions", methods=["POST"])
def get_questions():
    """
    POST /api/interview/questions
    JSON: { "role": "...", "skills": [...], "level": "...", "interview_type": "..." }
    """
    body = request.get_json(force=True)
    role = body.get("role", "Software Engineer")
    skills = body.get("skills", [])
    level = body.get("level", "Mid")
    interview_type = body.get("interview_type", "Mixed (Technical + Behavioral)")

    result = generate_interview_questions(role, skills, level, interview_type)
    return jsonify({"success": True, "data": result})


@interview_bp.route("/analyze-answer", methods=["POST"])
def analyze_answer():
    """
    POST /api/interview/analyze-answer
    Multipart: audio file OR JSON with transcript
    Form fields: question, expected_themes (JSON array), transcript (optional)
    """
    # Handle JSON body
    if request.is_json:
        body = request.get_json(force=True)
        question = body.get("question", "")
        transcript = body.get("transcript", "")
        expected_themes = body.get("expected_themes", [])
    else:
        question = request.form.get("question", "")
        expected_themes_raw = request.form.get("expected_themes", "[]")
        import json
        try:
            expected_themes = json.loads(expected_themes_raw)
        except Exception:
            expected_themes = []
        transcript = request.form.get("transcript", "")

    # If audio file provided, transcribe it
    speech_metrics = None
    if "audio" in request.files and not transcript:
        audio_file = request.files["audio"]
        suffix = os.path.splitext(audio_file.filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        transcription = transcribe_audio(tmp_path)
        os.unlink(tmp_path)
        transcript = transcription.get("transcript", "")
        speech_metrics = analyze_speech_quality(transcript)

    if not transcript:
        return jsonify({"error": "No transcript or audio provided"}), 400

    if not speech_metrics:
        speech_metrics = analyze_speech_quality(transcript)

    evaluation = evaluate_answer(question, transcript, expected_themes)
    evaluation["speech_metrics"] = speech_metrics
    evaluation["transcript"] = transcript

    return jsonify({"success": True, "data": evaluation})


@interview_bp.route("/session-feedback", methods=["POST"])
def session_feedback():
    """
    POST /api/interview/session-feedback
    JSON: { "role": "...", "qa_pairs": [{question, answer, evaluation}, ...] }
    """
    body = request.get_json(force=True)
    role = body.get("role", "Software Engineer")
    qa_pairs = body.get("qa_pairs", [])

    if not qa_pairs:
        return jsonify({"error": "qa_pairs is required"}), 400

    result = generate_failure_analysis(role, qa_pairs)
    return jsonify({"success": True, "data": result})
