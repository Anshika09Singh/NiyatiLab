"""Roadmap generation API routes."""
import os
import sys
from flask import Blueprint, request, jsonify

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from ai_models.skill_gap_analyzer import analyze_skill_gap

roadmap_bp = Blueprint("roadmap", __name__, url_prefix="/api/roadmap")


@roadmap_bp.route("/generate", methods=["POST"])
def generate_roadmap():
    """
    POST /api/roadmap/generate
    JSON: {
      "current_skills": [...],
      "target_role": "...",
      "company_type": "...",
      "hours_per_week": 15,
      "resume_analysis": {...}  (optional)
    }
    """
    body = request.get_json(force=True)
    current_skills = body.get("current_skills", [])
    target_role = body.get("target_role", "")
    company_type = body.get("company_type", "Top Tech Company")
    hours_per_week = body.get("hours_per_week", 15)
    resume_analysis = body.get("resume_analysis", None)

    if not target_role:
        return jsonify({"error": "target_role is required"}), 400

    result = analyze_skill_gap(
        current_skills=current_skills,
        target_role=target_role,
        company_type=company_type,
        hours_per_week=hours_per_week,
        resume_analysis=resume_analysis
    )
    return jsonify({"success": True, "data": result})
