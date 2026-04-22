"""
AI Interview Coach.
Generates interview questions, evaluates answers, detects communication
patterns, and produces comprehensive session reports.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from utils.gemini_client import call_gemini_json, call_gemini


QUESTION_GENERATION_PROMPT = """
You are a senior interviewer at a top tech company.

ROLE: {role}
CANDIDATE SKILLS: {skills}
EXPERIENCE LEVEL: {level}
INTERVIEW TYPE: {interview_type}

Generate 5 high-quality interview questions tailored to this candidate.

Return JSON:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text",
      "type": "Behavioral/Technical/System Design/Situational",
      "difficulty": "Easy/Medium/Hard",
      "expected_answer_themes": ["key theme 1", "key theme 2"],
      "follow_up": "Follow-up question if needed",
      "evaluation_criteria": ["What to look for in a great answer"]
    }}
  ],
  "interview_focus": "What this interview session is designed to assess"
}}
"""

ANSWER_EVALUATION_PROMPT = """
You are a world-class interview evaluator and communication coach.

QUESTION ASKED: {question}
CANDIDATE'S ANSWER (transcript): {answer}
EXPECTED THEMES: {expected_themes}

Evaluate this answer comprehensively.

Return JSON:
{{
  "content_score": 0-100,
  "communication_score": 0-100,
  "confidence_score": 0-100,
  "structure_score": 0-100,
  "overall_score": 0-100,
  "verdict": "Excellent / Good / Needs Improvement / Poor",
  
  "content_feedback": {{
    "strengths": ["what was good content-wise"],
    "gaps": ["what was missing"],
    "technical_accuracy": "Accurate/Partially Accurate/Inaccurate/N/A"
  }},
  
  "communication_feedback": {{
    "fluency": "Excellent/Good/Fair/Poor",
    "clarity": "Excellent/Good/Fair/Poor", 
    "filler_words_detected": ["um", "like", etc],
    "pacing": "Too Fast / Good / Too Slow",
    "suggestions": ["specific communication improvements"]
  }},
  
  "star_method_analysis": {{
    "situation": "Present/Absent/Partial",
    "task": "Present/Absent/Partial",
    "action": "Present/Absent/Partial",
    "result": "Present/Absent/Partial",
    "coaching_tip": "How to restructure using STAR"
  }},
  
  "ideal_answer_outline": ["Key point 1", "Key point 2", "Key point 3"],
  "improvement_actions": ["Actionable step 1", "Actionable step 2"]
}}
"""

FAILURE_ANALYSIS_PROMPT = """
You are a candid career coach reviewing a complete interview session.

ROLE: {role}
SESSION SCORES:
{scores_summary}

QUESTIONS AND ANSWERS:
{qa_summary}

Provide a brutally honest failure analysis and improvement plan.

Return JSON:
{{
  "overall_session_score": 0-100,
  "hire_recommendation": "Strong Hire / Hire / No Hire / Strong No Hire",
  
  "rejection_reasons": [
    {{
      "category": "Technical Gap / Communication Gap / Confidence Issue / Lack of Examples / Structural Issues",
      "description": "Specific reason",
      "severity": "Critical / High / Medium / Low"
    }}
  ],
  
  "score_breakdown": {{
    "technical_knowledge": 0-100,
    "problem_solving": 0-100,
    "communication": 0-100,
    "confidence": 0-100,
    "structure": 0-100
  }},
  
  "top_3_improvements": [
    {{"priority": 1, "area": "", "action": "", "timeline": ""}}
  ],
  
  "encouragement": "Genuine positive reinforcement",
  "next_steps": ["Concrete next steps to improve before next interview"]
}}
"""


def generate_interview_questions(
    role: str,
    skills: list,
    level: str = "Mid",
    interview_type: str = "Mixed (Technical + Behavioral)"
) -> dict:
    """Generate tailored interview questions."""
    prompt = QUESTION_GENERATION_PROMPT.format(
        role=role,
        skills=", ".join(skills[:15]),
        level=level,
        interview_type=interview_type
    )
    return call_gemini_json(prompt)


def evaluate_answer(question: str, answer_transcript: str, expected_themes: list = None) -> dict:
    """Evaluate a single interview answer."""
    prompt = ANSWER_EVALUATION_PROMPT.format(
        question=question,
        answer=answer_transcript[:2000],
        expected_themes=", ".join(expected_themes or ["general competency"])
    )
    return call_gemini_json(prompt)


def generate_failure_analysis(role: str, qa_pairs: list) -> dict:
    """Generate comprehensive failure analysis for a full interview session."""
    scores_summary = []
    qa_summary = []

    for i, qa in enumerate(qa_pairs):
        eval_data = qa.get("evaluation", {})
        scores_summary.append(
            f"Q{i+1}: Overall {eval_data.get('overall_score', 'N/A')}/100, "
            f"Content {eval_data.get('content_score', 'N/A')}/100, "
            f"Communication {eval_data.get('communication_score', 'N/A')}/100"
        )
        qa_summary.append(
            f"Q{i+1}: {qa.get('question', '')[:100]}\n"
            f"A{i+1}: {qa.get('answer', '')[:200]}"
        )

    prompt = FAILURE_ANALYSIS_PROMPT.format(
        role=role,
        scores_summary="\n".join(scores_summary),
        qa_summary="\n\n".join(qa_summary)
    )
    return call_gemini_json(prompt)
