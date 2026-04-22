/**
 * app.js — Global utilities shared across all pages
 * AI Career Intelligence System
 */

// ── Config ──────────────────────────────────────────────────────
const API_BASE = "http://localhost:5000";

// ── Navbar scroll effect ─────────────────────────────────────────
const nav = document.getElementById("mainNav");
if (nav) {
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  });
}

// ── Tab switching (generic) ──────────────────────────────────────
function switchTab(tabId) {
  // Deactivate all tabs
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

  // Activate selected
  const tabContentEl = document.getElementById(`tab-${tabId}-content`);
  const tabBtnEl = document.getElementById(`tab-${tabId}`);

  if (tabContentEl) tabContentEl.classList.add("active");
  if (tabBtnEl) tabBtnEl.classList.add("active");
}

// ── Fade-in on scroll ────────────────────────────────────────────
const fadeEls = document.querySelectorAll(".fade-up");
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add("visible");
  });
}, { threshold: 0.15 });
fadeEls.forEach(el => observer.observe(el));

// ── Toast notifications ──────────────────────────────────────────
function showToast(message, type = "info", duration = 3500) {
  const colors = {
    success: "#00e676",
    error: "#ff5370",
    info: "#00d4ff",
    warning: "#ffab40"
  };
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };

  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:2rem;right:2rem;z-index:9999;
    background:rgba(13,17,23,0.95);border:1px solid ${colors[type]}40;
    border-left:3px solid ${colors[type]};border-radius:12px;
    padding:1rem 1.5rem;display:flex;align-items:center;gap:0.75rem;
    color:#f0f0ff;font-size:0.9rem;max-width:360px;
    box-shadow:0 8px 32px rgba(0,0,0,0.4);
    animation:slideInRight 0.3s ease;
  `;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Inject toast keyframes
const style = document.createElement("style");
style.textContent = `
  @keyframes slideInRight { from { opacity:0; transform:translateX(100%); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOutRight { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(100%); } }
`;
document.head.appendChild(style);

// ── API helpers ──────────────────────────────────────────────────
async function apiPost(endpoint, data, isFormData = false) {
  const options = { method: "POST" };

  if (isFormData) {
    options.body = data;
  } else {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(data);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Score color helper ───────────────────────────────────────────
function scoreColor(score) {
  if (score >= 75) return "var(--g)";
  if (score >= 50) return "var(--o)";
  return "var(--r)";
}

function scoreBadgeClass(score) {
  if (score >= 75) return "badge-g";
  if (score >= 50) return "badge-o";
  return "badge-r";
}

// Progress-fill class
function progressFillClass(score) {
  if (score >= 75) return "pf-success";
  if (score >= 50) return "pf-warning";
  return "pf-danger";
}

// ── Animated counter ─────────────────────────────────────────────
function animateCounter(el, target, suffix = "", duration = 1500) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ── Progress bar renderer ────────────────────────────────────────
function renderProgressBar(label, value, container) {
  const pfClass = progressFillClass(value);
  const bar = document.createElement("div");
  bar.className = "progress-bar-wrapper";
  bar.innerHTML = `
    <div class="progress-bar-label">
      <span>${label}</span>
      <span style="color:${scoreColor(value)};font-weight:700;">${value}/100</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill ${pfClass}" style="width:0%" data-target="${value}"></div>
    </div>
  `;
  container.appendChild(bar);

  // Animate after append
  setTimeout(() => {
    const fill = bar.querySelector(".progress-fill");
    if (fill) fill.style.width = `${value}%`;
  }, 50);
}

// ── Donut chart renderer ─────────────────────────────────────────
function renderDonutChart(canvasId, score, colorHex) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;

  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [score, 100 - score],
        backgroundColor: [colorHex, "rgba(255,255,255,0.06)"],
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      cutout: "78%",
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 1200, easing: "easeOutQuart" }
    }
  });
}

// ── Session storage for cross-page data ──────────────────────────
const CareerSession = {
  set(key, val) { sessionStorage.setItem(`cai_${key}`, JSON.stringify(val)); },
  get(key) {
    try { return JSON.parse(sessionStorage.getItem(`cai_${key}`)); }
    catch { return null; }
  },
  clear(key) { sessionStorage.removeItem(`cai_${key}`); }
};

// ── Mark active nav + FAB link ───────────────────────────────────
(function markActiveNav() {
  const page = window.location.pathname.split("/").pop() || "index.html";
  const pageKey = page.replace('.html','') || 'home';

  document.querySelectorAll(".nav-links a").forEach(a => {
    a.classList.remove("active");
    if (a.getAttribute("href") === page ||
        (page === "" && a.getAttribute("href") === "index.html")) {
      a.classList.add("active");
    }
  });

  // FAB bar active state
  const fabId = {
    'index':     'fab-home',
    'resume':    'fab-resume',
    'interview': 'fab-interview',
    'roadmap':   'fab-roadmap',
    'jobs':      'fab-jobs'
  }[pageKey];
  if (fabId) {
    document.querySelectorAll('.fab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(fabId);
    if (activeBtn) activeBtn.classList.add('active');
  }
})();
