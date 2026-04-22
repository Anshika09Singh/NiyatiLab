"""
Job Matcher AI System.
Uses embeddings + Gemini to match resumes against job pool,
rank suitability, and explain fit/gap.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.gemini_client import call_gemini_json
from utils.embeddings import compute_similarity


JOB_MATCH_EXPLANATION_PROMPT = """
You are a senior talent acquisition specialist.

CANDIDATE PROFILE:
Skills: {skills}
Experience: {experience} years as {seniority}
Education: {education}

JOB DESCRIPTION:
Title: {job_title}
Company: {company}
Description: {job_description}
Required Skills: {required_skills}
Embedding Similarity Score: {similarity}%

Provide a detailed job match analysis.

Return JSON:
{{
  "match_percentage": 0-100,
  "verdict": "Excellent Match / Good Match / Partial Match / Poor Match",
  "why_suitable": ["Key reason 1", "Key reason 2"],
  "why_challenging": ["Gap 1", "Gap 2"],
  "missing_mandatory_skills": ["skill1", "skill2"],
  "transferable_skills": ["skill that transfers"],
  "application_advice": "Specific advice for applying to this role",
  "cover_letter_hooks": ["Strong angle 1", "Strong angle 2"],
  "interview_preparation": ["Top 3 topics to prepare for this specific job"]
}}
"""


def match_jobs(resume_analysis: dict, jobs: list) -> list:
    """
    Match resume against a list of job dicts and return ranked results.
    
    Each job dict should have: title, company, description, skills (list)
    """
    skills = (
        resume_analysis.get("extracted_skills", {}).get("technical", []) +
        resume_analysis.get("extracted_skills", {}).get("tools", [])
    )
    exp = resume_analysis.get("experience_analysis", {})
    edu = resume_analysis.get("education", {})
    edu_str = ", ".join([
        f"{d.get('degree','')} {d.get('field','')}"
        for d in edu.get("degrees", [])
    ])

    candidate_text = " ".join(skills) + " " + edu_str

    results = []
    for job in jobs:
        job_text = f"{job.get('title','')} {job.get('description','')} {' '.join(job.get('skills',[]))}"
        sim_score = compute_similarity(candidate_text, job_text)

        prompt = JOB_MATCH_EXPLANATION_PROMPT.format(
            skills=", ".join(skills[:20]),
            experience=exp.get("years_of_experience", 0),
            seniority=exp.get("seniority_level", "Unknown"),
            education=edu_str,
            job_title=job.get("title", ""),
            company=job.get("company", ""),
            job_description=job.get("description", "")[:800],
            required_skills=", ".join(job.get("skills", [])),
            similarity=round(sim_score * 100, 1)
        )

        match_data = call_gemini_json(prompt)
        match_data["job_info"] = job
        match_data["embedding_similarity"] = round(sim_score * 100, 1)
        results.append(match_data)

    # Sort by match_percentage descending
    results.sort(key=lambda x: x.get("match_percentage", 0), reverse=True)
    return results
