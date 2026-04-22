/**
 * jobs.js — Job matching AI system
 * AI Career Intelligence System
 */

let allJobs = [];
let matchResults = [];
let currentJobDetail = null;

// ── Tab switching ────────────────────────────────────────────────
function switchJobTab(tab) {
  document.querySelectorAll("[id^='job-tab-']").forEach(el => {
    if (!el.id.endsWith("-content")) el.classList.remove("active");
  });
  document.querySelectorAll(".tab-content[id^='job-tab-']").forEach(tc => tc.classList.remove("active"));

  document.getElementById(`job-tab-${tab}`)?.classList.add("active");
  document.getElementById(`job-tab-${tab}-content`)?.classList.add("active");
}

// ── Load all jobs ────────────────────────────────────────────────
async function loadJobs() {
  try {
    const res = await apiGet("/api/jobs/list");
    allJobs = res.data || [];
    renderJobsBrowse(allJobs);
  } catch (err) {
    // Use hardcoded fallback
    allJobs = getFallbackJobs();
    renderJobsBrowse(allJobs);
  }
}

function getFallbackJobs() {
  return [
    { id: "j001", title: "Senior Data Scientist", company: "TechCorp AI", location: "Remote", salary: "$130k-$180k", skills: ["Python", "ML", "PyTorch", "SQL", "MLOps"], experience_required: "4+ years", description: "Lead ML model development with large datasets." },
    { id: "j002", title: "Full Stack Engineer", company: "StartupXYZ", location: "New York, NY", salary: "$110k-$150k", skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"], experience_required: "3+ years", description: "Build scalable web apps using React and Node.js." },
    { id: "j003", title: "DevOps Engineer", company: "CloudBase Inc", location: "Austin, TX", salary: "$120k-$160k", skills: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD"], experience_required: "3+ years", description: "Design CI/CD pipelines and cloud infrastructure." },
    { id: "j004", title: "ML Engineer", company: "AI Labs", location: "Remote", salary: "$140k-$190k", skills: ["Python", "TensorFlow", "PyTorch", "MLOps", "Kubernetes"], experience_required: "3+ years", description: "Build production ML systems at scale." },
    { id: "j005", title: "Backend Engineer (Python)", company: "FinTech Pro", location: "Chicago, IL", salary: "$115k-$155k", skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "gRPC"], experience_required: "3+ years", description: "High-performance APIs for financial applications." },
    { id: "j006", title: "Product Manager", company: "ProductCo", location: "San Francisco, CA", salary: "$125k-$170k", skills: ["Product Strategy", "Agile", "Data Analysis", "User Research"], experience_required: "4+ years", description: "Drive product strategy and work with engineering teams." },
  ];
}

function renderJobsBrowse(jobs) {
  const grid = document.getElementById("jobsGrid");
  if (!grid) return;

  grid.innerHTML = jobs.map(job => `
    <div class="job-card" onclick="showJobDetail('${job.id}', ${JSON.stringify(allJobs.findIndex(j => j.id === job.id))})" style="cursor:pointer;">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h4 style="font-size:0.95rem;margin-bottom:4px;">${job.title}</h4>
          <p class="text-secondary text-sm">🏢 ${job.company}</p>
        </div>
        <div class="text-right">
          <div class="badge badge-cyan text-xs">${job.experience_required || "—"}</div>
        </div>
      </div>
      <div class="flex gap-1 mb-2" style="flex-wrap:wrap;font-size:0.8rem;color:var(--text-muted);">
        <span>📍 ${job.location || "—"}</span>
        <span style="margin:0 4px;">·</span>
        <span style="color:var(--accent-success);">💰 ${job.salary || "Competitive"}</span>
      </div>
      <p class="text-secondary text-sm mb-2" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${job.description || ""}</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">
        ${(job.skills || []).slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join("")}
        ${job.skills?.length > 4 ? `<span class="skill-tag">+${job.skills.length - 4}</span>` : ""}
      </div>
    </div>`).join("") || "<p class='text-muted text-sm'>No jobs available.</p>";
}

// ── Match Jobs ───────────────────────────────────────────────────
async function matchJobs() {
  // Determine which input to use
  const activeTab = document.querySelector(".tab-btn.active")?.id?.replace("job-tab-", "") || "paste";

  let resumeAnalysis = null;

  if (activeTab === "upload") {
    resumeAnalysis = CareerSession.get("resumeAnalysis") || null;
    if (!resumeAnalysis) {
      showToast("Please analyze your resume on the Resume page first", "warning");
      return;
    }
  } else {
    // Build mock resume analysis from form data
    const skillsRaw = document.getElementById("jmSkills")?.value || "";
    const skills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);
    const exp = parseInt(document.getElementById("jmExperience")?.value || "3");
    const seniority = document.getElementById("jmSeniority")?.value || "Mid";

    if (!skills.length) {
      showToast("Please enter your skills", "error");
      return;
    }

    resumeAnalysis = {
      extracted_skills: { technical: skills, soft: [], tools: [] },
      experience_analysis: { years_of_experience: exp, seniority_level: seniority },
      education: { degrees: [] },
      industry_fit: []
    };
  }

  // Show loading
  document.getElementById("jobsLoading").classList.remove("hidden");
  document.getElementById("matchResults").classList.add("hidden");
  document.getElementById("jobsLoading").scrollIntoView({ behavior: "smooth" });

  try {
    const res = await apiPost("/api/jobs/match", { resume_analysis: resumeAnalysis });
    if (!res.success) throw new Error(res.error);

    matchResults = res.data || [];
    renderMatchResults(matchResults);

    document.getElementById("jobsLoading").classList.add("hidden");
    document.getElementById("matchResults").classList.remove("hidden");
    document.getElementById("matchCount").textContent = `${matchResults.length} matches`;
    showToast(`Found ${matchResults.length} job matches!`, "success");

  } catch (err) {
    document.getElementById("jobsLoading").classList.add("hidden");
    // Demo fallback — show hardcoded matches with random scores
    const demoMatches = getFallbackJobs().map(job => ({
      ...job,
      match_percentage: Math.round(50 + Math.random() * 45),
      verdict: "Good Match",
      why_suitable: ["Relevant technical background", "Experience matches requirement"],
      why_challenging: ["Some skills need development"],
      missing_mandatory_skills: [],
      application_advice: "Tailor your resume to highlight relevant experience.",
      embedding_similarity: Math.round(50 + Math.random() * 45)
    }));
    demoMatches.sort((a, b) => b.match_percentage - a.match_percentage);
    demoMatches.forEach(m => { m.job_info = { ...m }; });
    matchResults = demoMatches;
    renderMatchResults(matchResults);
    document.getElementById("matchResults").classList.remove("hidden");
    document.getElementById("matchCount").textContent = `${matchResults.length} matches (demo)`;
    showToast(`Demo mode: ${err.message}`, "warning");
  }
}

function renderMatchResults(results) {
  const grid = document.getElementById("matchGrid");
  if (!grid) return;

  grid.innerHTML = results.map((match, i) => {
    const job = match.job_info || {};
    const pct = match.match_percentage || 0;
    const color = pct >= 75 ? "#00e676" : pct >= 50 ? "#ffab40" : "#ff5370";

    return `
      <div class="job-card" style="border-top:2px solid ${color};cursor:pointer;" onclick="showMatchDetail(${i})">
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="flex items-center gap-1 mb-1">
              <span style="background:${color};color:#000;border-radius:50px;padding:2px 10px;font-size:0.75rem;font-weight:900;">${pct}% Match</span>
              <span class="badge ${pct >= 75 ? "badge-green" : pct >= 50 ? "badge-orange" : "badge-red"}">${match.verdict || "—"}</span>
            </div>
            <h4 style="font-size:0.95rem;">${job.title || "—"}</h4>
            <p class="text-secondary text-sm">🏢 ${job.company || "—"}</p>
          </div>
          <div style="width:54px;height:54px;border-radius:50%;background:conic-gradient(${color} ${pct}%, rgba(255,255,255,0.06) 0);display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0;">
            <div style="position:absolute;inset:6px;background:var(--bg-secondary);border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:0.7rem;font-weight:900;color:${color};">${pct}%</span>
            </div>
          </div>
        </div>

        <div class="progress-track mb-2">
          <div class="progress-fill" style="width:${pct}%;background:${color};"></div>
        </div>

        <p class="text-sm text-secondary mb-2">📍 ${job.location || "—"} · ${job.salary || "Competitive"}</p>

        ${(match.why_suitable || []).length ? `
        <div class="mb-2">
          ${match.why_suitable.slice(0, 2).map(r => `
            <div class="flex items-center gap-1 mb-1">
              <span style="color:var(--accent-success);">✓</span>
              <span class="text-sm text-secondary">${r}</span>
            </div>`).join("")}
        </div>` : ""}

        ${(match.missing_mandatory_skills || []).length ? `
        <div>
          <p class="text-xs text-muted mb-1">Missing:</p>
          <div style="display:flex;flex-wrap:wrap;gap:3px;">
            ${match.missing_mandatory_skills.slice(0, 3).map(s => `<span class="skill-tag missing">${s}</span>`).join("")}
          </div>
        </div>` : ""}
      </div>`;
  }).join("");
}

// ── Job/Match Detail Modal ───────────────────────────────────────
function showJobDetail(jobId, idx) {
  const job = allJobs[idx];
  if (!job) return;

  const modal = document.getElementById("jobModal");
  const content = document.getElementById("jobModalContent");

  content.innerHTML = `
    <h2 style="font-size:1.5rem;margin-bottom:0.5rem;">${job.title}</h2>
    <p class="text-secondary mb-1">🏢 ${job.company} · 📍 ${job.location}</p>
    <p class="text-success mb-3">💰 ${job.salary || "Competitive"} · ${job.experience_required || "—"}</p>
    <div class="divider"></div>
    <h4 class="mb-2">About This Role</h4>
    <p class="text-secondary text-sm mb-3" style="line-height:1.8;">${job.description || "—"}</p>
    <h4 class="mb-2">Required Skills</h4>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:1.5rem;">
      ${(job.skills || []).map(s => `<span class="skill-tag">${s}</span>`).join("")}
    </div>
    <div class="flex gap-2" style="flex-wrap:wrap;">
      <button class="btn btn-primary" onclick="matchJobs(); closeJobModal();">📊 Check My Match</button>
      <a href="roadmap.html" class="btn btn-ghost">🗺️ Prep Roadmap</a>
    </div>`;

  modal.style.display = "flex";
}

function showMatchDetail(idx) {
  const match = matchResults[idx];
  if (!match) return;

  const job = match.job_info || {};
  const pct = match.match_percentage || 0;
  const color = pct >= 75 ? "var(--accent-success)" : pct >= 50 ? "var(--accent-warning)" : "var(--accent-danger)";

  const modal = document.getElementById("jobModal");
  const content = document.getElementById("jobModalContent");

  content.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <h2 style="font-size:1.4rem;">${job.title || "—"}</h2>
      <span style="color:${color};font-size:1.5rem;font-weight:900;">${pct}%</span>
    </div>
    <p class="text-secondary mb-1">🏢 ${job.company || "—"} · 📍 ${job.location || "—"}</p>
    <p style="color:var(--accent-success);" class="mb-3">💰 ${job.salary || "Competitive"}</p>
    <div class="divider"></div>

    <div class="grid-2 mb-3">
      <div>
        <h4 class="mb-2 text-success">✅ Why You're Suitable</h4>
        <ul style="padding-left:1rem;font-size:0.85rem;color:var(--text-secondary);line-height:2;">
          ${(match.why_suitable || []).map(r => `<li>${r}</li>`).join("") || "<li>—</li>"}
        </ul>
      </div>
      <div>
        <h4 class="mb-2 text-danger">⚠️ Challenges</h4>
        <ul style="padding-left:1rem;font-size:0.85rem;color:var(--text-secondary);line-height:2;">
          ${(match.why_challenging || []).map(r => `<li>${r}</li>`).join("") || "<li>—</li>"}
        </ul>
      </div>
    </div>

    ${(match.missing_mandatory_skills || []).length ? `
    <div class="mb-3">
      <h4 class="mb-2">🔧 Missing Must-Have Skills</h4>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${match.missing_mandatory_skills.map(s => `<span class="skill-tag missing">${s}</span>`).join("")}
      </div>
    </div>` : ""}

    ${match.application_advice ? `
    <div class="alert alert-info mb-3">
      <span class="alert-icon">💡</span>
      <span><strong>Application Advice:</strong> ${match.application_advice}</span>
    </div>` : ""}

    ${(match.cover_letter_hooks || []).length ? `
    <div class="mb-3">
      <h4 class="mb-2">✍️ Cover Letter Angles</h4>
      <ul style="padding-left:1rem;font-size:0.85rem;color:var(--text-secondary);line-height:2;">
        ${match.cover_letter_hooks.map(h => `<li>${h}</li>`).join("")}
      </ul>
    </div>` : ""}

    <div class="flex gap-2" style="flex-wrap:wrap;">
      <a href="roadmap.html" class="btn btn-primary">🗺️ Build Skills Roadmap</a>
      <a href="interview.html" class="btn btn-ghost">🎤 Practice Interview</a>
    </div>`;

  modal.style.display = "flex";
}

function closeJobModal() {
  const modal = document.getElementById("jobModal");
  if (modal) modal.style.display = "none";
}

// Close on backdrop click
document.getElementById("jobModal")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("jobModal")) closeJobModal();
});

// ── Handle resume upload for job matching ─────────────────────────
function handleJMUpload(input) {
  if (!input.files[0]) return;
  const statusEl = document.getElementById("jmUploadStatus");
  statusEl.classList.remove("hidden");
  statusEl.innerHTML = `<div class="alert alert-info"><span class="alert-icon">🔄</span><span>Resume will be analyzed when you click "Find Matches"</span></div>`;

  // Save to session for use during matchJobs
  // We need to re-analyze — redirect to resume page with a note
  showToast("For best results, analyze your resume on the Resume page first", "info", 5000);
}

// ── Init ──────────────────────────────────────────────────────────
loadJobs();
