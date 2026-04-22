"""
Skill Gap Analyzer & Dynamic Roadmap Generator.
Identifies exact skill gaps for a target role and generates
week-by-week learning roadmaps with curated resources.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.gemini_client import call_gemini_json


SKILL_GAP_PROMPT = """
You are a technical career coach and curriculum designer.

USER'S CURRENT SKILLS:
{current_skills}

TARGET ROLE: {target_role}
TARGET COMPANY TYPE: {company_type}
AVAILABLE TIME: {hours_per_week} hours/week

Perform a comprehensive skill gap analysis and generate a personalized roadmap.

Return JSON:
{{
  "target_role": "{target_role}",
  "readiness_score": 0-100,
  "skill_gaps": [
    {{
      "skill": "skill name",
      "importance": "Critical/High/Medium/Low",
      "current_level": "None/Beginner/Intermediate",
      "required_level": "Intermediate/Advanced/Expert",
      "estimated_weeks_to_learn": 0
    }}
  ],
  "roadmap": {{
    "total_weeks": 0,
    "phases": [
      {{
        "phase": 1,
        "title": "Phase title",
        "duration_weeks": 0,
        "focus_areas": ["skill1", "skill2"],
        "weekly_plan": [
          {{
            "week": 1,
            "goal": "What to achieve this week",
            "topics": ["topic1", "topic2"],
            "daily_tasks": [
              {{"day": 1, "task": "specific daily task", "time_hours": 2}}
            ],
            "resources": [
              {{
                "type": "Course/Book/Video/Project/Practice",
                "title": "Resource title",
                "platform": "Coursera/YouTube/LeetCode/etc",
                "url_hint": "search term or partial URL",
                "free": true
              }}
            ],
            "project": {{
              "name": "Mini project name",
              "description": "What to build",
              "skills_practiced": ["skill1"]
            }},
            "milestone": "What success looks like",
            "practice_questions": ["Question 1", "Question 2"]
          }}
        ]
      }}
    ]
  }},
  "quick_wins": ["3-5 things user can do in the next 48 hours"],
  "portfolio_recommendations": [
    {{
      "project_name": "Project",
      "description": "What to build",
      "impact": "Why this impresses hiring managers",
      "technologies": ["tech1", "tech2"],
      "estimated_hours": 0
    }}
  ],
  "interview_prep_focus": ["Top 5 topics to prepare for interviews for this role"]
}}
"""


def analyze_skill_gap(
    current_skills: list,
    target_role: str,
    company_type: str = "FAANG/Top Tech",
    hours_per_week: int = 15,
    resume_analysis: dict = None
) -> dict:
    """Generate comprehensive skill gap analysis and roadmap."""

    # Merge skills from resume analysis if provided
    if resume_analysis:
        tech = resume_analysis.get("extracted_skills", {}).get("technical", [])
        tools = resume_analysis.get("extracted_skills", {}).get("tools", [])
        skills_combined = list(set(current_skills + tech + tools))
    else:
        skills_combined = current_skills

    prompt = SKILL_GAP_PROMPT.format(
        current_skills=", ".join(skills_combined[:30]),
        target_role=target_role,
        company_type=company_type,
        hours_per_week=hours_per_week
    )

    return call_gemini_json(prompt)
