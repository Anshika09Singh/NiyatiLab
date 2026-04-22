"""
AI Career Intelligence System — Flask Application Entry Point
Serves both the backend API and the frontend in one command:
    python app.py          (from project root or backend/)
"""
import os
import sys

# ── Resolve paths ──────────────────────────────────────────────────────────────
BACKEND_DIR  = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

# Ensure project root is on path for clean imports
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, BACKEND_DIR)

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config

# Import route blueprints
from api.resume_routes import resume_bp
from api.interview_routes import interview_bp
from api.roadmap_routes import roadmap_bp
from api.jobs_routes import jobs_bp


def create_app() -> Flask:
    Config.ensure_dirs()

    # Serve frontend static files directly from Flask
    app = Flask(
        __name__,
        static_folder=FRONTEND_DIR,
        static_url_path=""          # serve at root so /css, /js etc. work
    )
    app.config.from_object(Config)
    app.config["UPLOAD_FOLDER"] = Config.UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH

    # Enable CORS for API routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Register API blueprints ────────────────────────────────────────────────
    app.register_blueprint(resume_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(roadmap_bp)
    app.register_blueprint(jobs_bp)

    # ── Frontend routes ────────────────────────────────────────────────────────
    @app.route("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.route("/<path:filename>")
    def frontend_files(filename):
        """Serve any frontend file (html pages, css, js, images …)."""
        # Don't intercept API calls
        if filename.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        filepath = os.path.join(FRONTEND_DIR, filename)
        if os.path.isfile(filepath):
            return send_from_directory(FRONTEND_DIR, filename)
        # Fallback to index.html for SPA-style navigation
        return send_from_directory(FRONTEND_DIR, "index.html")

    # ── Health check ──────────────────────────────────────────────────────────
    @app.route("/health")
    def health():
        return jsonify({
            "status": "running",
            "version": "1.0.0",
            "system": "AI Career Intelligence System",
            "frontend": os.path.exists(FRONTEND_DIR)
        })

    # ── Error handlers ────────────────────────────────────────────────────────
    @app.errorhandler(413)
    def too_large(e):
        return jsonify({"error": "File too large. Maximum 16MB allowed."}), 413

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    return app


if __name__ == "__main__":
    # Auto-load .env from backend/ dir so API keys are available
    env_file = os.path.join(BACKEND_DIR, ".env")
    if os.path.exists(env_file):
        try:
            from dotenv import load_dotenv
            load_dotenv(env_file)
        except ImportError:
            pass  # python-dotenv not installed; env vars must be set manually

    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print(f"\n{'='*55}")
    print(f"  [*] AI Career Intelligence System")
    print(f"{'='*55}")
    print(f"  [WEB] App (frontend):  http://localhost:{port}")
    print(f"  [API] API backend:    http://localhost:{port}/api")
    print(f"  [OK]  Health check:   http://localhost:{port}/health")
    print(f"  [LLM] Primary:        {Config.GROQ_MODEL}")
    print(f"  [LLM] Fallback:       {Config.GROQ_FALLBACK_MODEL}")
    print(f"{'='*55}\n")
    app.run(host="0.0.0.0", port=port, debug=True)
