"""
PDF and DOCX text extraction utilities.
"""
import os
import re


def extract_text_from_file(filepath: str) -> str:
    """Detect file type and delegate to the correct parser."""
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        return extract_from_pdf(filepath)
    elif ext in (".docx", ".doc"):
        return extract_from_docx(filepath)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def extract_from_pdf(filepath: str) -> str:
    """Extract text from PDF — tries PyMuPDF, pdfplumber, then PyPDF2."""
    # Try PyMuPDF (best quality)
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(filepath)
        text_parts = [page.get_text("text") for page in doc]
        doc.close()
        result = "\n".join(text_parts)
        if result.strip():
            return result
    except ImportError:
        pass

    # Try pdfplumber
    try:
        import pdfplumber
        with pdfplumber.open(filepath) as pdf:
            result = "\n".join(page.extract_text() or "" for page in pdf.pages)
        if result.strip():
            return result
    except ImportError:
        pass

    # Fallback: PyPDF2 (always available)
    try:
        import PyPDF2
        text_parts = []
        with open(filepath, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
        return "\n".join(text_parts)
    except Exception as e:
        raise RuntimeError(f"PDF text extraction failed: {e}")


def extract_from_docx(filepath: str) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        from docx import Document
        doc = Document(filepath)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except ImportError:
        return "[DOCX parser not available — install python-docx]"


def clean_text(text: str) -> str:
    """Remove excessive whitespace and non-printable characters."""
    # Collapse all whitespace to single spaces / newlines
    text = re.sub(r'[ \t]+', ' ', text)          # horizontal whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)       # excessive blank lines
    # Strip truly non-printable control chars (keep Unicode letters/symbols)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text.strip()


def split_into_sections(text: str) -> dict:
    """
    Heuristically split resume text into common sections.
    Returns a dict with keys like 'experience', 'education', 'skills', etc.
    """
    section_keywords = {
        "summary": ["summary", "objective", "profile", "about"],
        "experience": ["experience", "work history", "employment", "professional experience"],
        "education": ["education", "academic", "qualification", "degree"],
        "skills": ["skills", "technical skills", "competencies", "technologies"],
        "projects": ["projects", "personal projects", "key projects"],
        "certifications": ["certifications", "certificates", "courses", "training"],
        "achievements": ["achievements", "awards", "honors", "accomplishments"],
    }

    lines = text.split('\n')
    sections = {}
    current_section = "header"
    buffer = []

    for line in lines:
        line_lower = line.strip().lower()
        matched_section = None
        for section_name, keywords in section_keywords.items():
            if any(kw in line_lower for kw in keywords) and len(line.strip()) < 60:
                matched_section = section_name
                break

        if matched_section:
            if buffer:
                sections[current_section] = "\n".join(buffer).strip()
            current_section = matched_section
            buffer = []
        else:
            buffer.append(line)

    if buffer:
        sections[current_section] = "\n".join(buffer).strip()

    return sections
