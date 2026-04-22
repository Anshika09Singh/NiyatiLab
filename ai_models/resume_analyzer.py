"""
Resume Intelligence Engine.
Parses resume text, extracts structured data, computes ATS score, 
and generates deep feedback using Gemini.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.gemini_client import call_gemini_json
from utils.pdf_parser import split_into_sections


RESUME_ANALYSIS_PROMPT = """
You are an elite career consultant and ATS expert. Analyze this resume thoroughly.

RESUME TEXT:
{resume_text}

TARGET JOB DESCRIPTION (if provided):
{job_description}

Return a detailed JSON with EXACTLY this structure:
{{
  "candidate_name": "string",
  "contact_info": {{"email": "", "phone": "", "linkedin": "", "github": ""}},
  "summary_assessment": "2-3 sentence overall assessment",
  "extracted_skills": {{
    "technical": ["list of technical skills"],
    "soft": ["list of soft skills"],
    "tools": ["list of tools/platforms"]
  }},
  "experience_analysis": {{
    "years_of_experience": 0,
    "roles": [
      {{"title": "", "company": "", "duration": "", "impact_score": 0-10, "highlights": []}}
    ],
    "seniority_level": "Entry/Mid/Senior/Lead"
  }},
  "education": {{
    "degrees": [{{"degree": "", "field": "", "institution": "", "year": ""}}],
    "certifications": []
  }},
  "projects": [
    {{"name": "", "technologies": [], "impact": "", "github": ""}}
  ],
  "ats_analysis": {{
    "overall_score": 0-100,
    "keyword_match_score": 0-100,
    "formatting_score": 0-100,
    "readability_score": 0-100,
    "quantification_score": 0-100,
    "critical_issues": ["list of critical ATS problems"],
    "improvements": ["list of specific improvements"],
    "keyword_gaps": ["missing important keywords"]
  }},
  "strengths": ["top 3-5 resume strengths"],
  "weaknesses": ["top 3-5 resume weaknesses"],
  "industry_fit": ["best matching industries"],
  "job_match_score": 0-100
}}
"""


def analyze_resume(resume_text: str, job_description: str = "") -> dict:
    """Full resume analysis via Gemini."""
    prompt = RESUME_ANALYSIS_PROMPT.format(
        resume_text=resume_text[:4000],  # Truncate for token limits
        job_description=job_description[:2000] if job_description else "Not provided"
    )
    result = call_gemini_json(prompt)
    # Inject sections detected locally
    result["sections_detected"] = list(split_into_sections(resume_text).keys())
    return result


def compute_quick_ats_score(resume_text: str, job_description: str) -> dict:
    """Lightweight ATS match for rapid scoring."""
    prompt = f"""
You are an ATS system. Score this resume against the job description.

RESUME (first 2000 chars):
{resume_text[:2000]}

JOB DESCRIPTION:
{job_description[:1500]}

Return JSON:
{{
  "ats_score": 0-100,
  "matched_keywords": ["list"],
  "missing_keywords": ["list"],
  "verdict": "Strong Match / Moderate Match / Weak Match",
  "one_line_feedback": "string"
}}
"""
    return call_gemini_json(prompt)
