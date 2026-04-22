"""Resume API routes."""
import os
import sys
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from utils.pdf_parser import extract_text_from_file, clean_text
from ai_models.resume_analyzer import analyze_resume, compute_quick_ats_score
from ai_models.career_predictor import predict_career_paths

resume_bp = Blueprint("resume", __name__, url_prefix="/api/resume")

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@resume_bp.route("/analyze", methods=["POST"])
def analyze():
    """
    POST /api/resume/analyze
    Form fields: file (PDF/DOCX), job_description (optional text)
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    job_description = request.form.get("job_description", "")

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF and DOCX files are supported"}), 400

    from flask import current_app
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "/tmp")
    os.makedirs(upload_folder, exist_ok=True)

    filename = secure_filename(file.filename)
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    try:
        raw_text = extract_text_from_file(filepath)
        cleaned = clean_text(raw_text)

        if len(cleaned) < 50:
            return jsonify({"error": "Could not extract readable text from the file"}), 422

        analysis = analyze_resume(cleaned, job_description)
        analysis["raw_text_preview"] = cleaned[:500]
        analysis["file_name"] = filename
        analysis["word_count"] = len(cleaned.split())

        return jsonify({"success": True, "data": analysis})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@resume_bp.route("/ats-score", methods=["POST"])
def ats_score():
    """
    POST /api/resume/ats-score
    JSON body: { "resume_text": "...", "job_description": "..." }
    """
    body = request.get_json(force=True)
    resume_text = body.get("resume_text", "")
    job_description = body.get("job_description", "")

    if not resume_text or not job_description:
        return jsonify({"error": "Both resume_text and job_description are required"}), 400

    result = compute_quick_ats_score(resume_text, job_description)
    return jsonify({"success": True, "data": result})


@resume_bp.route("/predict-career", methods=["POST"])
def predict_career():
    """
    POST /api/resume/predict-career
    JSON body: { "resume_analysis": {...}, "target_role": "..." }
    """
    body = request.get_json(force=True)
    resume_analysis = body.get("resume_analysis", {})
    target_role = body.get("target_role", "")

    if not resume_analysis:
        return jsonify({"error": "resume_analysis object is required"}), 400

    result = predict_career_paths(resume_analysis, target_role)
    return jsonify({"success": True, "data": result})
