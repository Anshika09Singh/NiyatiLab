/**
 * roadmap.js — Skill gap analysis and roadmap rendering
 * AI Career Intelligence System
 */

let roadmapTabActive = "gaps";

function switchRoadmapTab(tab) {
  roadmapTabActive = tab;
  document.querySelectorAll("[id^='rm-tab-']").forEach(btn => {
    if (!btn.id.endsWith("-content")) btn.classList.remove("active");
  });
  document.querySelectorAll(".tab-content[id^='rm-tab-']").forEach(tc => tc.classList.remove("active"));

  const btnEl = document.getElementById(`rm-tab-${tab}`);
  const contentEl = document.getElementById(`rm-tab-${tab}-content`);
  if (btnEl) btnEl.classList.add("active");
  if (contentEl) contentEl.classList.add("active");
}

// ── Generate roadmap ─────────────────────────────────────────────
async function generateRoadmap() {
  const targetRole = document.getElementById("rmTargetRole")?.value?.trim();
  const skillsRaw = document.getElementById("rmCurrentSkills")?.value || "";
  const currentSkills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);
  const companyType = document.getElementById("rmCompanyType")?.value || "Mid-size Tech Company";
  const hours = parseInt(document.getElementById("rmHours")?.value || "15");

  if (!targetRole) {
    showToast("Please enter a target role", "error");
    return;
  }

  // Check for cached resume analysis
  const resumeAnalysis = CareerSession.get("resumeAnalysis");

  // Show loading
  document.getElementById("roadmapLoading").classList.remove("hidden");
  document.getElementById("roadmapResults").classList.add("hidden");
  document.getElementById("roadmapLoading").scrollIntoView({ behavior: "smooth" });

  const messages = [
    "Analyzing your skill gaps...",
    "Comparing with industry requirements...",
    "Building week-by-week plan...",
    "Selecting curated resources...",
    "Finalizing your personalized roadmap..."
  ];
  let msgIdx = 0;
  const loadingEl = document.getElementById("roadmapLoadingMsg");
  const msgInterval = setInterval(() => {
    if (loadingEl && msgIdx < messages.length) {
      loadingEl.textContent = messages[msgIdx++];
    }
  }, 6000);

  try {
    const res = await apiPost("/api/roadmap/generate", {
      current_skills: currentSkills,
      target_role: targetRole,
      company_type: companyType,
      hours_per_week: hours,
      resume_analysis: resumeAnalysis || null
    });

    clearInterval(msgInterval);
    if (!res.success) throw new Error(res.error);

    renderRoadmap(res.data);
    document.getElementById("roadmapLoading").classList.add("hidden");
    document.getElementById("roadmapResults").classList.remove("hidden");
    showToast("Roadmap generated!", "success");

  } catch (err) {
    clearInterval(msgInterval);
    document.getElementById("roadmapLoading").classList.add("hidden");
    showToast(`Error: ${err.message}`, "error");
    document.getElementById("roadmapLoading").innerHTML = `
      <div class="alert alert-error">
        <span class="alert-icon">❌</span>
        <div>Failed to generate roadmap: ${err.message}<br/>
        <small>Ensure backend is running and GEMINI_API_KEY is configured.</small></div>
      </div>`;
    document.getElementById("roadmapLoading").classList.remove("hidden");
  }
}

// ── Render roadmap ───────────────────────────────────────────────
function renderRoadmap(data) {
  // Stats
  animateEl("rmReadiness", data.readiness_score || 0, "%");
  animateEl("rmTotalWeeks", data.roadmap?.total_weeks || 0);
  animateEl("rmGapCount", (data.skill_gaps || []).length);
  animateEl("rmPhaseCount", (data.roadmap?.phases || []).length);

  // ─── SKILL GAPS TAB ─────────────────────────────────────────
  const gapsGrid = document.getElementById("skillGapsGrid");
  if (gapsGrid) {
    gapsGrid.innerHTML = (data.skill_gaps || []).map(gap => {
      const importanceColors = {
        "Critical": "var(--accent-danger)",
        "High": "var(--accent-warning)",
        "Medium": "var(--accent-secondary)",
        "Low": "var(--text-muted)"
      };
      const color = importanceColors[gap.importance] || "var(--text-secondary)";
      return `
        <div class="glass-card" style="border-left:3px solid ${color};padding:1rem;">
          <div class="flex justify-between items-center mb-1">
            <h4 style="font-size:0.95rem;">${gap.skill}</h4>
            <span class="badge ${gap.importance === "Critical" ? "badge-red" : gap.importance === "High" ? "badge-orange" : "badge-cyan"}">${gap.importance}</span>
          </div>
          <div class="grid-2" style="gap:0.5rem;margin-top:0.5rem;">
            <div>
              <p class="text-xs text-muted">Current Level</p>
              <p class="text-sm font-bold text-danger">${gap.current_level || "None"}</p>
            </div>
            <div>
              <p class="text-xs text-muted">Required Level</p>
              <p class="text-sm font-bold text-success">${gap.required_level || "—"}</p>
            </div>
          </div>
          <p class="text-xs text-muted mt-2">⏱ Est. ${gap.estimated_weeks_to_learn || "?"} weeks to learn</p>
        </div>`;
    }).join("") || "<p class='text-muted text-sm'>No skill gaps detected — you're well-positioned!</p>";
  }

  // ─── ROADMAP TIMELINE TAB ────────────────────────────────────
  const phasesEl = document.getElementById("phasesContainer");
  if (phasesEl) {
    phasesEl.innerHTML = (data.roadmap?.phases || []).map((phase, pi) => `
      <div class="glass-card card-accent-purple mb-3" style="margin-bottom:1.5rem;">
        <div class="flex items-center gap-2 mb-3">
          <div style="background:var(--gradient-primary);width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;">${phase.phase}</div>
          <div>
            <h3 style="font-size:1rem;">${phase.title}</h3>
            <span class="text-muted text-sm">⏱ ${phase.duration_weeks} weeks · Focus: ${(phase.focus_areas || []).join(", ")}</span>
          </div>
        </div>
        <div class="timeline" id="phase-${pi}-timeline">
          ${(phase.weekly_plan || []).map((week, wi) => `
            <div class="timeline-item" style="animation-delay:${wi * 0.1}s;">
              <div class="timeline-dot"></div>
              <div class="timeline-week">Week ${week.week}</div>
              <div class="timeline-title">${week.goal}</div>
              <div class="timeline-body">
                <strong>Topics:</strong> ${(week.topics || []).join(", ")}
              </div>

              ${week.resources?.length ? `
              <div style="margin-top:8px;">
                <strong class="text-xs text-cyan">📚 Resources:</strong>
                <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
                  ${week.resources.slice(0, 3).map(r => `
                    <span style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:6px;padding:3px 10px;font-size:0.72rem;color:var(--accent-secondary);">
                      ${r.free ? "🆓" : "💰"} ${r.title} (${r.platform})
                    </span>`).join("")}
                </div>
              </div>` : ""}

              ${week.project ? `
              <div style="margin-top:8px;background:rgba(108,99,255,0.06);border-radius:8px;padding:8px;">
                <strong class="text-xs text-purple">🏗️ Project:</strong>
                <p class="text-sm text-secondary">${week.project.name} — ${week.project.description}</p>
              </div>` : ""}

              ${week.milestone ? `
              <div style="margin-top:6px;">
                <span class="badge badge-green">🎯 ${week.milestone}</span>
              </div>` : ""}
            </div>`).join("")}
        </div>
      </div>
    `).join("") || "<p class='text-muted text-sm'>No roadmap phases generated.</p>";
  }

  // ─── PORTFOLIO PROJECTS TAB ──────────────────────────────────
  const portfolioEl = document.getElementById("portfolioGrid");
  if (portfolioEl) {
    portfolioEl.innerHTML = (data.portfolio_recommendations || []).map((proj, i) => `
      <div class="glass-card" style="border-top:2px solid var(--accent-${["primary","secondary","purple","success"][i%4]});">
        <div class="flex justify-between items-center mb-2">
          <h4 style="font-size:0.95rem;">${proj.project_name}</h4>
          <span class="badge badge-orange">~${proj.estimated_hours || "?"} hrs</span>
        </div>
        <p class="text-secondary text-sm mb-2">${proj.description}</p>
        <div class="alert alert-info" style="padding:0.6rem;font-size:0.8rem;margin-bottom:0.75rem;">
          <span>💼 ${proj.impact}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">
          ${(proj.technologies || []).map(t => `<span class="skill-tag">${t}</span>`).join("")}
        </div>
      </div>`).join("") || "<p class='text-muted text-sm'>Build projects from the weekly plan above.</p>";
  }

  // ─── QUICK WINS TAB ─────────────────────────────────────────
  const quickWinsEl = document.getElementById("quickWinsList");
  if (quickWinsEl) {
    quickWinsEl.innerHTML = (data.quick_wins || []).map((win, i) => `
      <div class="flex items-start gap-2 mb-3 p-3" style="background:rgba(0,230,118,0.06);border:1px solid rgba(0,230,118,0.2);border-radius:10px;">
        <span style="background:var(--accent-success);color:#000;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:900;flex-shrink:0;">${i+1}</span>
        <p class="text-sm text-secondary">${win}</p>
      </div>`).join("");
  }

  const interviewPrepEl = document.getElementById("interviewPrepList");
  if (interviewPrepEl) {
    interviewPrepEl.innerHTML = (data.interview_prep_focus || []).map(topic => `
      <div class="flex items-center gap-2 mb-2">
        <span style="color:var(--accent-warning);">⭐</span>
        <span class="text-sm text-secondary">${topic}</span>
      </div>`).join("");
  }
}

// ── Helpers ──────────────────────────────────────────────────────
function animateEl(id, target, suffix = "") {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = target + suffix;
    // Simple fade in
    el.style.opacity = 0;
    setTimeout(() => { el.style.transition = "opacity 0.5s"; el.style.opacity = 1; }, 50);
  }
}
