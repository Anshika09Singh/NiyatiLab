"""Job matching API routes."""
import os
import sys
import json
from flask import Blueprint, request, jsonify

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from ai_models.job_matcher import match_jobs
from config import Config

jobs_bp = Blueprint("jobs", __name__, url_prefix="/api/jobs")


def _load_sample_jobs():
    """Load jobs from the data directory."""
    jobs = []
    jd_dir = Config.JD_DATA_DIR
    if not os.path.exists(jd_dir):
        return _get_hardcoded_jobs()

    for fname in os.listdir(jd_dir):
        if fname.endswith(".json"):
            with open(os.path.join(jd_dir, fname)) as f:
                data = json.load(f)
                if isinstance(data, list):
                    jobs.extend(data)
                elif isinstance(data, dict):
                    jobs.append(data)

    return jobs if jobs else _get_hardcoded_jobs()


def _get_hardcoded_jobs():
    """Fallback sample jobs for demo purposes."""
    return [
        {
            "id": "j001", "title": "Senior Data Scientist", "company": "TechCorp AI",
            "location": "Remote", "salary": "$130k - $180k",
            "description": "Lead ML model development, work with large datasets using Python, PyTorch, and cloud platforms.",
            "skills": ["Python", "Machine Learning", "PyTorch", "SQL", "Statistics", "MLOps"],
            "experience_required": "4+ years"
        },
        {
            "id": "j002", "title": "Full Stack Engineer", "company": "StartupXYZ",
            "location": "New York, NY", "salary": "$110k - $150k",
            "description": "Build scalable web applications using React, Node.js, and AWS infrastructure.",
            "skills": ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL", "Docker"],
            "experience_required": "3+ years"
        },
        {
            "id": "j003", "title": "DevOps Engineer", "company": "CloudBase Inc",
            "location": "Austin, TX", "salary": "$120k - $160k",
            "description": "Design and maintain CI/CD pipelines, Kubernetes clusters, and cloud infrastructure.",
            "skills": ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD", "Python", "Linux"],
            "experience_required": "3+ years"
        },
        {
            "id": "j004", "title": "Product Manager", "company": "ProductCo",
            "location": "San Francisco, CA", "salary": "$125k - $170k",
            "description": "Drive product strategy, work with engineering and design teams to ship features.",
            "skills": ["Product Strategy", "Agile", "Data Analysis", "User Research", "Roadmapping"],
            "experience_required": "4+ years"
        },
        {
            "id": "j005", "title": "Machine Learning Engineer", "company": "AI Labs",
            "location": "Remote", "salary": "$140k - $190k",
            "description": "Build and deploy production ML systems at scale using modern MLOps practices.",
            "skills": ["Python", "TensorFlow", "PyTorch", "MLOps", "Kubernetes", "Feature Engineering"],
            "experience_required": "3+ years"
        },
        {
            "id": "j006", "title": "Backend Engineer (Go/Python)", "company": "FinTech Pro",
            "location": "Chicago, IL", "salary": "$115k - $155k",
            "description": "Build high-performance APIs and microservices for financial applications.",
            "skills": ["Go", "Python", "Microservices", "PostgreSQL", "Redis", "gRPC"],
            "experience_required": "3+ years"
        }
    ]


@jobs_bp.route("/list", methods=["GET"])
def list_jobs():
    """GET /api/jobs/list — return all available jobs."""
    jobs = _get_hardcoded_jobs()
    return jsonify({"success": True, "data": jobs, "count": len(jobs)})


@jobs_bp.route("/match", methods=["POST"])
def match():
    """
    POST /api/jobs/match
    JSON: { "resume_analysis": {...}, "custom_jobs": [...] (optional) }
    """
    body = request.get_json(force=True)
    resume_analysis = body.get("resume_analysis", {})
    custom_jobs = body.get("custom_jobs", None)

    if not resume_analysis:
        return jsonify({"error": "resume_analysis is required"}), 400

    jobs = custom_jobs if custom_jobs else _get_hardcoded_jobs()
    results = match_jobs(resume_analysis, jobs)
    return jsonify({"success": True, "data": results, "count": len(results)})
