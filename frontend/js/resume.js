/**
 * resume.js — Resume upload, analysis, and results rendering
 * AI Career Intelligence System
 */

let resumeAnalysisData = null;

// ── Drag & Drop ──────────────────────────────────────────────────
const uploadZone = document.getElementById("uploadZone");
const resumeFileInput = document.getElementById("resumeFile");

if (uploadZone) {
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag-over");
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("drag-over");
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  if (resumeFileInput) {
    resumeFileInput.addEventListener("change", (e) => {
      if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });
  }
}

function handleFileSelect(file) {
  const allowed = ["pdf", "docx", "doc"];
  const ext = file.name.split(".").pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showToast("Only PDF and DOCX files are supported", "error");
    return;
  }
  uploadZone.classList.add("has-file");
  const fileInfo = document.getElementById("fileInfo");
  const fileName = document.getElementById("fileName");
  if (fileInfo && fileName) {
    fileInfo.classList.remove("hidden");
    fileName.textContent = `✅ ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  }
  showToast(`File selected: ${file.name}`, "success");
}

// ── Main analyze function ────────────────────────────────────────
async function analyzeResume() {
  const file = resumeFileInput?.files[0];
  if (!file) {
    showToast("Please upload a resume file first", "error");
    return;
  }

  const jobDescription = document.getElementById("jobDescription")?.value || "";
  const targetRole = document.getElementById("targetRole")?.value || "";

  // Show results section with loading state
  document.getElementById("resultsSection").classList.remove("hidden");
  document.getElementById("loadingState").classList.remove("hidden");
  document.getElementById("analysisResults").classList.add("hidden");

  // Scroll to results
  document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth" });

  const messages = [
    "Extracting text from your resume...",
    "Running ATS compatibility analysis...",
    "Identifying skills and experience...",
    "Generating career insights with AI...",
    "Building your personalized report..."
  ];
  let msgIdx = 0;
  const loadingMsg = document.getElementById("loadingMsg");
  const msgInterval = setInterval(() => {
    if (loadingMsg && msgIdx < messages.length) {
      loadingMsg.textContent = messages[msgIdx++];
    }
  }, 4000);

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDescription);
    formData.append("target_role", targetRole);

    const response = await apiPost("/api/resume/analyze", formData, true);

    clearInterval(msgInterval);

    if (!response.success) throw new Error(response.error || "Analysis failed");

    resumeAnalysisData = response.data;

    // Store for cross-page use
    CareerSession.set("resumeAnalysis", resumeAnalysisData);

    // Render results
    renderAnalysisResults(resumeAnalysisData);

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("analysisResults").classList.remove("hidden");
    showToast("Resume analysis complete!", "success");

  } catch (err) {
    clearInterval(msgInterval);
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("resultsSection").innerHTML = `
      <div class="alert alert-error">
        <span class="alert-icon">❌</span>
        <div>
          <strong>Analysis failed:</strong> ${err.message}
          <br/><small>Make sure the backend is running on port 5000 and your GEMINI_API_KEY is set.</small>
        </div>
      </div>`;
    showToast(`Error: ${err.message}`, "error");
  }
}

// ── Render full results ──────────────────────────────────────────
function renderAnalysisResults(data) {
  const ats = data.ats_analysis || {};
  const exp = data.experience_analysis || {};
  const edu = data.education || {};

  // ─── OVERVIEW TAB ───────────────────────────────────────────
  // ATS gauge
  const atsScore = ats.overall_score || 0;
  renderDonutChart("atsGauge", atsScore, atsScore >= 75 ? "#00e676" : atsScore >= 50 ? "#ffab40" : "#ff5370");

  const atsDisplay = document.getElementById("atsScoreDisplay");
  if (atsDisplay) animateCounter(atsDisplay, atsScore);

  const atsVerdict = document.getElementById("atsVerdict");
  if (atsVerdict) {
    const verdicts = { 75: "Strong ATS Match", 50: "Moderate Match", 0: "Needs Improvement" };
    const cls = atsScore >= 75 ? "badge-green" : atsScore >= 50 ? "badge-orange" : "badge-red";
    const label = atsScore >= 75 ? "Strong ATS Match" : atsScore >= 50 ? "Moderate Match" : "Needs Improvement";
    atsVerdict.textContent = label;
    atsVerdict.className = `badge ${cls}`;
  }

  // Candidate profile
  setText("candidateName", data.candidate_name || "—");
  setText("candidateExp", `${exp.years_of_experience || 0}+ years`);
  setText("candidateSeniority", exp.seniority_level || "—");
  setText("candidateIndustry", (data.industry_fit || []).slice(0, 2).join(", ") || "—");
  setText("candidateSummary", data.summary_assessment || "—");

  // Score breakdown
  const breakdownEl = document.getElementById("scoreBreakdown");
  if (breakdownEl) {
    breakdownEl.innerHTML = "";
    const scores = [
      ["ATS Overall", ats.overall_score || 0],
      ["Keyword Match", ats.keyword_match_score || 0],
      ["Formatting", ats.formatting_score || 0],
      ["Readability", ats.readability_score || 0],
      ["Quantification", ats.quantification_score || 0],
    ];
    scores.forEach(([label, val]) => renderProgressBar(label, val, breakdownEl));
  }

  // Quick stats
  const skills = data.extracted_skills || {};
  const allSkills = [...(skills.technical || []), ...(skills.soft || []), ...(skills.tools || [])];
  setText("statWords", data.word_count || "—");
  animateEl("statSkills", allSkills.length);
  animateEl("statSections", (data.sections_detected || []).length);
  animateEl("statProjects", (data.projects || []).length);

  // ─── ATS TAB ───────────────────────────────────────────────
  // Keyword matched
  const matchedEl = document.getElementById("keywordMatched");
  if (matchedEl) {
    const matched = ats.keyword_match_score >= 50
      ? (data.extracted_skills?.technical || []).slice(0, 10)
      : [];
    matchedEl.innerHTML = `<p class="text-sm font-bold text-success mb-2">✅ Matched Keywords</p>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${matched.map(k => `<span class="skill-tag">${k}</span>`).join("")}
      </div>`;
  }

  const missingEl = document.getElementById("keywordMissing");
  if (missingEl) {
    const missing = ats.keyword_gaps || [];
    missingEl.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px;">
      ${missing.map(k => `<span class="skill-tag missing">${k}</span>`).join("") || "<span class='text-muted text-sm'>No critical gaps detected</span>"}
    </div>`;
  }

  // Critical issues
  const issuesList = document.getElementById("criticalIssues");
  if (issuesList) {
    issuesList.innerHTML = (ats.critical_issues || [])
      .map(i => `<li style="margin-bottom:8px;color:var(--accent-danger);">${i}</li>`)
      .join("") || "<li class='text-muted'>No critical issues found</li>";
  }

  const improvementsList = document.getElementById("improvements");
  if (improvementsList) {
    improvementsList.innerHTML = (ats.improvements || [])
      .map(i => `<li style="margin-bottom:8px;">${i}</li>`)
      .join("") || "<li class='text-muted'>Resume looks good!</li>";
  }

  // ─── SKILLS TAB ───────────────────────────────────────────
  renderSkillTags("techSkills", skills.technical || []);
  renderSkillTags("softSkills", skills.soft || [], "badge-cyan");
  renderSkillTags("toolSkills", skills.tools || [], "badge-green");

  // Projects
  const projectsEl = document.getElementById("projects");
  if (projectsEl) {
    projectsEl.innerHTML = (data.projects || []).map(p => `
      <div class="glass-card" style="padding:1rem;">
        <h4 style="font-size:0.9rem;margin-bottom:4px;">${p.name || "Project"}</h4>
        <p class="text-secondary text-sm">${p.impact || ""}</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">
          ${(p.technologies || []).map(t => `<span class="skill-tag">${t}</span>`).join("")}
        </div>
      </div>
    `).join("") || "<p class='text-muted text-sm'>No projects detected</p>";
  }

  // Education
  const eduEl = document.getElementById("education");
  if (eduEl) {
    eduEl.innerHTML = (edu.degrees || []).map(d => `
      <div class="glass-card" style="padding:1rem;">
        <div class="badge badge-purple mb-1">${d.degree || ""}</div>
        <p style="font-size:0.9rem;margin-top:6px;">${d.field || ""}</p>
        <p class="text-secondary text-sm">${d.institution || ""} · ${d.year || ""}</p>
      </div>
    `).join("") || "<p class='text-muted text-sm'>No education detected</p>";
  }

  // ─── FEEDBACK TAB ─────────────────────────────────────────
  const strengthsEl = document.getElementById("strengthsList");
  if (strengthsEl) {
    strengthsEl.innerHTML = (data.strengths || [])
      .map(s => `<li style="margin-bottom:8px;color:var(--accent-success);">✓ ${s}</li>`)
      .join("") || "<li class='text-muted'>—</li>";
  }

  const weakEl = document.getElementById("weaknessesList");
  if (weakEl) {
    weakEl.innerHTML = (data.weaknesses || [])
      .map(w => `<li style="margin-bottom:8px;color:var(--accent-danger);">✕ ${w}</li>`)
      .join("") || "<li class='text-muted'>—</li>";
  }

  // Next actions from ATS improvements
  const nextEl = document.getElementById("nextActions");
  if (nextEl) {
    const actions = [...(ats.improvements || []), ...(ats.critical_issues || [])].slice(0, 5);
    nextEl.innerHTML = actions.map((a, i) => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:10px;">
        <span style="background:var(--gradient-primary);width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;flex-shrink:0;">${i + 1}</span>
        <span class="text-sm text-secondary">${a}</span>
      </div>`).join("");
  }
}

// ── Career predictions ───────────────────────────────────────────
async function loadCareerPredictions() {
  if (!resumeAnalysisData) {
    showToast("Please analyze your resume first", "warning");
    return;
  }

  document.getElementById("careerLoadingAlert").innerHTML = `
    <span class="alert-icon">⏳</span>
    <span>Predicting career paths... This may take 15 seconds.</span>
    <div class="ai-dots" style="margin-left:auto;"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;

  try {
    const targetRole = document.getElementById("targetRole")?.value || "";
    const res = await apiPost("/api/resume/predict-career", {
      resume_analysis: resumeAnalysisData,
      target_role: targetRole
    });

    if (!res.success) throw new Error(res.error);
    renderCareerPredictions(res.data);
    document.getElementById("careerLoadingAlert").classList.add("hidden");
    document.getElementById("careerPredictions").classList.remove("hidden");

  } catch (err) {
    document.getElementById("careerLoadingAlert").innerHTML = `
      <span class="alert-icon">❌</span>
      <span>Failed to load predictions: ${err.message}. <button class="btn btn-sm btn-ghost" onclick="loadCareerPredictions()">Retry</button></span>`;
  }
}

function renderCareerPredictions(data) {
  const grid = document.getElementById("careerPathsGrid");
  if (!grid) return;

  grid.innerHTML = (data.predicted_paths || []).map(path => {
    const prob = path.success_probability || 0;
    const color = prob >= 70 ? "#00e676" : prob >= 50 ? "#ffab40" : "#ff5370";
    return `
      <div class="glass-card" style="border-top:2px solid ${color};">
        <div class="flex justify-between items-center mb-2">
          <h4 style="font-size:1rem;">${path.role}</h4>
          <span style="font-size:1.5rem;font-weight:900;color:${color};">${prob}%</span>
        </div>
        <div class="badge ${prob >= 70 ? "badge-green" : prob >= 50 ? "badge-orange" : "badge-red"} mb-2">${path.demand_trend || "Growing"}</div>
        <div class="progress-track mb-2">
          <div class="progress-fill" style="width:${prob}%;background:${color};transition:width 1.2s ease;"></div>
        </div>
        <p class="text-sm text-secondary mb-2">📅 Ready in: <strong>${path.time_to_ready?.realistic || "—"}</strong></p>
        <p class="text-sm text-secondary mb-2">💰 Avg Salary: <strong>${path.avg_salary_usd ? "$" + path.avg_salary_usd.toLocaleString() : "—"}</strong></p>
        ${(path.key_requirements_missing || []).length > 0 ? `
          <div class="divider"></div>
          <p class="text-xs text-muted mb-1">Missing skills:</p>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${path.key_requirements_missing.slice(0, 4).map(s => `<span class="skill-tag missing">${s}</span>`).join("")}
          </div>` : ""}
      </div>`;
  }).join("");

  // Market insights
  const mktEl = document.getElementById("marketInsights");
  const mktContent = document.getElementById("marketInsightsContent");
  if (mktEl && mktContent && data.market_insights) {
    mktEl.style.display = "block";
    const mi = data.market_insights;
    mktContent.innerHTML = `
      <div class="grid-2">
        <div>
          <p class="text-sm font-bold text-cyan mb-2">🔥 Hottest Skills 2024</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${(mi.hottest_skills_2024 || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
          </div>
        </div>
        <div>
          <p class="text-sm font-bold text-success mb-2">💎 Your Undervalued Skills</p>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${(mi.undervalued_skills_user_has || []).map(s => `<span class="skill-tag" style="border-color:var(--accent-success);color:var(--accent-success);">${s}</span>`).join("")}
          </div>
        </div>
      </div>`;
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function animateEl(id, target) {
  const el = document.getElementById(id);
  if (el) animateCounter(el, target);
}

function renderSkillTags(containerId, skills, className = "") {
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = skills.map(s => `<span class="skill-tag ${className}">${s}</span>`).join("")
      || "<span class='text-muted text-sm'>None detected</span>";
  }
}
