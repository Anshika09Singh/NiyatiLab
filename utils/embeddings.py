"""
FAISS-based vector similarity search for job matching.
"""
import os
import json
import numpy as np
import sys

# Add parent dir so we can import config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

FAISS_AVAILABLE = False
SENTENCE_TRANSFORMERS_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    pass

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    pass


_model = None
_index = None
_job_metadata = []


def _get_model():
    global _model
    if _model is None and SENTENCE_TRANSFORMERS_AVAILABLE:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed_text(text: str) -> np.ndarray:
    """Embed text into a float32 vector."""
    model = _get_model()
    if model is None:
        # Return zero vector as fallback
        return np.zeros(384, dtype=np.float32)
    vec = model.encode([text], convert_to_numpy=True, normalize_embeddings=True)
    return vec[0].astype(np.float32)


def load_or_build_index(jd_dir: str):
    """Load FAISS index from disk or build from JD JSON files."""
    global _index, _job_metadata

    index_path = os.path.join(jd_dir, "..", "faiss_index", "jobs.index")
    meta_path = os.path.join(jd_dir, "..", "faiss_index", "jobs_meta.json")

    if os.path.exists(index_path) and os.path.exists(meta_path):
        if FAISS_AVAILABLE:
            _index = faiss.read_index(index_path)
        with open(meta_path, "r") as f:
            _job_metadata = json.load(f)
        return

    # Build from scratch
    _job_metadata = []
    vectors = []

    for fname in os.listdir(jd_dir):
        if fname.endswith(".json"):
            with open(os.path.join(jd_dir, fname)) as f:
                jobs = json.load(f)
                if isinstance(jobs, list):
                    for job in jobs:
                        text = f"{job.get('title','')} {job.get('description','')} {' '.join(job.get('skills',[]))}"
                        vec = embed_text(text)
                        vectors.append(vec)
                        _job_metadata.append(job)

    if vectors and FAISS_AVAILABLE:
        dim = vectors[0].shape[0]
        _index = faiss.IndexFlatIP(dim)
        _index.add(np.stack(vectors))
        os.makedirs(os.path.dirname(index_path), exist_ok=True)
        faiss.write_index(_index, index_path)
        with open(meta_path, "w") as f:
            json.dump(_job_metadata, f)


def search_jobs(query_text: str, top_k: int = 5) -> list:
    """Find top-k jobs most similar to the query text."""
    if _index is None or not FAISS_AVAILABLE:
        return _job_metadata[:top_k] if _job_metadata else []

    query_vec = embed_text(query_text).reshape(1, -1)
    scores, indices = _index.search(query_vec, top_k)
    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < len(_job_metadata):
            job = dict(_job_metadata[idx])
            job["similarity_score"] = round(float(score) * 100, 1)
            results.append(job)
    return results


def compute_similarity(text_a: str, text_b: str) -> float:
    """Cosine similarity (0–1) between two texts."""
    vec_a = embed_text(text_a)
    vec_b = embed_text(text_b)
    # Already L2-normalized, so dot product = cosine similarity
    return float(np.dot(vec_a, vec_b))
