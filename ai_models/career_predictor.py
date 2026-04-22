"""
Career Prediction Engine.
Predicts career paths, success probabilities, and realistic timelines
based on the user's current skill and experience profile.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.gemini_client import call_gemini_json


CAREER_PREDICTION_PROMPT = """
You are a world-class career advisor with deep knowledge of industry hiring trends.

USER PROFILE:
{profile}

Predict the user's career trajectory and success probabilities.

Return JSON:
{{
  "current_level": "Entry/Mid/Senior/Lead/Principal",
  "predicted_paths": [
    {{
      "role": "Job Title",
      "domain": "e.g. Data Science / Backend Engineering",
      "success_probability": 0-100,
      "avg_salary_usd": 0,
      "demand_trend": "Growing / Stable / Declining",
      "time_to_ready": {{
        "optimistic": "X months",
        "realistic": "Y months",
        "conservative": "Z months"
      }},
      "key_requirements_missing": ["skill1", "skill2"],
      "why_good_fit": "explanation",
      "why_challenging": "explanation"
    }}
  ],
  "top_recommendation": "Role name with reasoning",
  "market_insights": {{
    "hottest_skills_2024": ["list"],
    "undervalued_skills_user_has": ["list"],
    "salary_range_current_level": {{"min": 0, "max": 0, "currency": "USD"}}
  }},
  "failure_risk_factors": ["list of things that could hold user back"],
  "success_accelerators": ["list of actions to accelerate career growth"]
}}
"""


def predict_career_paths(resume_analysis: dict, target_role: str = "") -> dict:
    """
    Takes the structured resume analysis and returns career predictions.
    """
    # Build a concise profile string from resume analysis
    skills_tech = resume_analysis.get("extracted_skills", {}).get("technical", [])
    skills_soft = resume_analysis.get("extracted_skills", {}).get("soft", [])
    tools = resume_analysis.get("extracted_skills", {}).get("tools", [])
    exp = resume_analysis.get("experience_analysis", {})
    edu = resume_analysis.get("education", {})

    profile_str = f"""
Name: {resume_analysis.get('candidate_name', 'Unknown')}
Technical Skills: {', '.join(skills_tech[:20])}
Soft Skills: {', '.join(skills_soft[:10])}
Tools: {', '.join(tools[:15])}
Years of Experience: {exp.get('years_of_experience', 0)}
Seniority Level: {exp.get('seniority_level', 'Unknown')}
Education: {', '.join([f"{d.get('degree','')} in {d.get('field','')}" for d in edu.get('degrees', [])])}
Target Role (if stated): {target_role or 'Not specified'}
Industry Fit: {', '.join(resume_analysis.get('industry_fit', []))}
ATS Score: {resume_analysis.get('ats_analysis', {}).get('overall_score', 'N/A')}
"""

    prompt = CAREER_PREDICTION_PROMPT.format(profile=profile_str)
    return call_gemini_json(prompt)
