/**
 * interview.js — Interview simulator with voice recording, emotion detection, and feedback
 * AI Career Intelligence System
 */

// ── State ────────────────────────────────────────────────────────
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordTimer = null;
let recordSeconds = 0;

let sessionQuestions = [];
let currentQuestionIdx = 0;
let sessionQAPairs = [];
let emotionEnabled = false;
let emotionInterval = null;
let emotionHistory = { happy: [], neutral: [], fearful: [], angry: [] };
let faceApiModelsLoaded = false;

// ── Start Session ────────────────────────────────────────────────
async function startSession() {
  const role = document.getElementById("interviewRole")?.value || "Software Engineer";
  const level = document.getElementById("experienceLevel")?.value || "Mid";
  const interviewType = document.getElementById("interviewType")?.value || "Mixed";
  const skillsRaw = document.getElementById("interviewSkills")?.value || "";
  const skills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);

  document.getElementById("setupSection").classList.add("hidden");
  document.getElementById("interviewArena").classList.remove("hidden");

  showToast("Generating your interview questions...", "info");

  try {
    const res = await apiPost("/api/interview/questions", {
      role, skills, level, interview_type: interviewType
    });

    if (!res.success) throw new Error(res.error);

    sessionQuestions = res.data.questions || [];
    if (!sessionQuestions.length) throw new Error("No questions received");

    document.getElementById("totalQNum").textContent = sessionQuestions.length;
    loadQuestion(0);
    showToast(`Session started! ${sessionQuestions.length} questions loaded`, "success");

  } catch (err) {
    showToast(`Failed to generate questions: ${err.message}`, "error");
    // Fallback: demo questions
    sessionQuestions = getFallbackQuestions();
    document.getElementById("totalQNum").textContent = sessionQuestions.length;
    loadQuestion(0);
  }
}

function getFallbackQuestions() {
  return [
    { id: 1, question: "Tell me about yourself and your background.", type: "Behavioral", difficulty: "Easy", expected_answer_themes: ["experience", "motivation", "skills"], follow_up: "What motivates you in this field?" },
    { id: 2, question: "Describe a challenging technical problem you solved recently. Walk me through your approach.", type: "Technical", difficulty: "Medium", expected_answer_themes: ["problem-solving", "technical skill", "communication"], follow_up: "What would you do differently now?" },
    { id: 3, question: "How do you handle conflicting priorities and tight deadlines?", type: "Behavioral", difficulty: "Medium", expected_answer_themes: ["prioritization", "stress management", "communication"], follow_up: "Give a specific example." },
    { id: 4, question: "Where do you see yourself in 3 years, and how does this role align with your goals?", type: "Situational", difficulty: "Easy", expected_answer_themes: ["career goals", "alignment", "growth"], follow_up: "What skills do you want to develop?" },
    { id: 5, question: "Do you have any questions for us about the team, role, or company culture?", type: "Behavioral", difficulty: "Easy", expected_answer_themes: ["curiosity", "preparation", "engagement"], follow_up: null },
  ];
}

// ── Load Question ────────────────────────────────────────────────
function loadQuestion(idx) {
  if (idx >= sessionQuestions.length) {
    endSession();
    return;
  }

  const q = sessionQuestions[idx];
  currentQuestionIdx = idx;

  document.getElementById("currentQNum").textContent = idx + 1;
  document.getElementById("qNum").textContent = idx + 1;
  document.getElementById("sessionProgress").style.width =
    `${((idx + 1) / sessionQuestions.length) * 100}%`;

  document.getElementById("questionText").textContent = q.question;
  document.getElementById("questionType").textContent = q.type || "General";
  document.getElementById("questionDifficulty").textContent = q.difficulty || "Medium";

  const hint = q.expected_answer_themes?.length
    ? `Focus on: ${q.expected_answer_themes.slice(0, 3).join(", ")}`
    : "Structure your answer clearly.";
  document.getElementById("questionHint").textContent = hint;

  // Reset answer UI
  resetAnswerUI();
}

function resetAnswerUI() {
  document.getElementById("waveformContainer").classList.add("hidden");
  document.getElementById("recordTimer").classList.add("hidden");
  document.getElementById("transcriptSection").classList.add("hidden");
  document.getElementById("submitAnswerBtn").classList.add("hidden");
  document.getElementById("textInputFallback").classList.add("hidden");
  document.getElementById("recordBtn").textContent = "🎤 Start Recording";
  document.getElementById("recordBtn").classList.remove("btn-danger");
  document.getElementById("recordBtn").classList.add("btn-primary");
  document.getElementById("answerFeedback").innerHTML = `
    <p class="text-muted text-sm text-center" style="padding:1.5rem 0;">Submit your answer to see detailed AI feedback.</p>`;

  if (isRecording) stopRecording();
  audioChunks = [];
}

// ── Voice Recording ──────────────────────────────────────────────
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    const options = MediaRecorder.isTypeSupported("audio/webm") ? { mimeType: "audio/webm" } : {};
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      processAudio();
    };

    mediaRecorder.start(200);
    isRecording = true;

    document.getElementById("recordBtn").textContent = "⏹ Stop Recording";
    document.getElementById("recordBtn").classList.remove("btn-primary");
    document.getElementById("recordBtn").classList.add("btn-danger");
    document.getElementById("waveformContainer").classList.remove("hidden");
    document.getElementById("recordTimer").classList.remove("hidden");

    // Start timer
    recordSeconds = 0;
    recordTimer = setInterval(() => {
      recordSeconds++;
      const mins = Math.floor(recordSeconds / 60);
      const secs = recordSeconds % 60;
      document.getElementById("timerDisplay").textContent =
        `${mins}:${secs.toString().padStart(2, "0")}`;

      // Auto-stop at 3 minutes
      if (recordSeconds >= 180) stopRecording();
    }, 1000);

    showToast("Recording started — speak clearly", "info");

  } catch (err) {
    showToast("Microphone access denied. Use text input instead.", "error");
    showTextInput();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  isRecording = false;
  clearInterval(recordTimer);

  document.getElementById("recordBtn").textContent = "🎤 Start Recording";
  document.getElementById("recordBtn").classList.remove("btn-danger");
  document.getElementById("recordBtn").classList.add("btn-primary");
  document.getElementById("waveformContainer").classList.add("hidden");
}

async function processAudio() {
  showToast("Transcribing your answer...", "info");

  const q = sessionQuestions[currentQuestionIdx];
  const blob = new Blob(audioChunks, { type: "audio/webm" });

  // Try backend transcription first
  let transcript = "";
  try {
    const formData = new FormData();
    formData.append("audio", blob, "answer.webm");
    formData.append("question", q.question);
    formData.append("expected_themes", JSON.stringify(q.expected_answer_themes || []));

    const res = await apiPost("/api/interview/analyze-answer", formData, true);
    if (res.success) {
      transcript = res.data.transcript || "";
      // Show feedback directly if transcript came with evaluation
      if (res.data.content_score !== undefined) {
        sessionQAPairs.push({ question: q.question, answer: transcript, evaluation: res.data });
        renderAnswerFeedback(res.data);
        document.getElementById("transcriptSection").classList.remove("hidden");
        document.getElementById("transcriptText").textContent = transcript;
        document.getElementById("submitAnswerBtn").classList.remove("hidden");
        return;
      }
    }
  } catch (e) {
    // Fall back to browser Web Speech API
    transcript = ""; // will use text fallback
  }

  if (transcript) {
    document.getElementById("transcriptSection").classList.remove("hidden");
    document.getElementById("transcriptText").textContent = transcript;
    document.getElementById("submitAnswerBtn").classList.remove("hidden");
    showToast("Transcription complete!", "success");
  } else {
    showToast("Transcription unavailable — please type your answer", "warning");
    showTextInput();
  }
}

function showTextInput() {
  document.getElementById("textInputFallback").classList.remove("hidden");
  document.getElementById("submitAnswerBtn").classList.remove("hidden");
}

function editTranscript() {
  const text = document.getElementById("transcriptText").textContent;
  document.getElementById("textInputFallback").classList.remove("hidden");
  document.getElementById("textAnswer").value = text;
  document.getElementById("transcriptSection").classList.add("hidden");
}

// ── Submit Answer ────────────────────────────────────────────────
async function submitAnswer() {
  const q = sessionQuestions[currentQuestionIdx];

  // Get transcript from either source
  let transcript = document.getElementById("transcriptText")?.textContent || "";
  const typedAnswer = document.getElementById("textAnswer")?.value || "";
  if (typedAnswer) transcript = typedAnswer;

  if (!transcript.trim()) {
    showToast("Please record or type your answer first", "warning");
    return;
  }

  document.getElementById("submitAnswerBtn").disabled = true;
  document.getElementById("submitAnswerBtn").textContent = "⏳ Analyzing...";

  try {
    const res = await apiPost("/api/interview/analyze-answer", {
      question: q.question,
      transcript,
      expected_themes: q.expected_answer_themes || []
    });

    if (!res.success) throw new Error(res.error);

    const evalData = res.data;
    evalData.answer = transcript;
    sessionQAPairs.push({ question: q.question, answer: transcript, evaluation: evalData });

    renderAnswerFeedback(evalData);
    showToast("Answer evaluated! Moving to next question in 5s...", "success");

    document.getElementById("submitAnswerBtn").textContent = "✅ Evaluated";

    // Auto-advance after 5 seconds
    setTimeout(() => {
      nextQuestion();
    }, 5000);

  } catch (err) {
    document.getElementById("submitAnswerBtn").disabled = false;
    document.getElementById("submitAnswerBtn").textContent = "✅ Submit Answer";
    showToast(`Evaluation failed: ${err.message}`, "error");
  }
}

function renderAnswerFeedback(evalData) {
  const el = document.getElementById("answerFeedback");
  if (!el) return;

  const overall = evalData.overall_score || 0;
  const color = overall >= 70 ? "success" : overall >= 50 ? "warning" : "danger";

  el.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <span class="font-bold">Overall Score</span>
      <span style="font-size:1.5rem;font-weight:900;color:${scoreColor(overall)};">${overall}/100</span>
    </div>
    <div class="progress-track mb-3">
      <div class="progress-fill ${color}" style="width:${overall}%;"></div>
    </div>

    <div class="grid-2 mb-2" style="gap:0.75rem;">
      ${renderMiniScore("Content", evalData.content_score)}
      ${renderMiniScore("Communication", evalData.communication_score)}
      ${renderMiniScore("Confidence", evalData.confidence_score)}
      ${renderMiniScore("Structure", evalData.structure_score)}
    </div>

    ${evalData.star_method_analysis ? `
    <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:0.75rem;margin-bottom:0.75rem;">
      <p class="text-xs font-bold text-cyan mb-2">⭐ STAR Method Analysis</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.75rem;">
        ${["situation","task","action","result"].map(k => `
          <div>
            <span class="text-muted">${k.charAt(0).toUpperCase()+k.slice(1)}:</span>
            <span style="color:${evalData.star_method_analysis[k]==='Present'?'var(--accent-success)':'var(--accent-danger)'};">
              ${evalData.star_method_analysis[k] || "—"}
            </span>
          </div>`).join("")}
      </div>
    </div>` : ""}

    ${evalData.improvement_actions?.length ? `
    <div style="margin-top:0.5rem;">
      <p class="text-xs font-bold text-warning mb-1">💡 Improve This Answer:</p>
      <ul style="padding-left:1rem;font-size:0.8rem;color:var(--text-secondary);line-height:1.8;">
        ${evalData.improvement_actions.map(a => `<li>${a}</li>`).join("")}
      </ul>
    </div>` : ""}
  `;
}

function renderMiniScore(label, score) {
  const color = scoreColor(score || 0);
  return `<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:0.6rem;text-align:center;">
    <div style="font-size:1.1rem;font-weight:800;color:${color};">${score || 0}</div>
    <div style="font-size:0.7rem;color:var(--text-muted);">${label}</div>
  </div>`;
}

function skipQuestion() {
  sessionQAPairs.push({
    question: sessionQuestions[currentQuestionIdx]?.question || "Skipped",
    answer: "[Skipped]",
    evaluation: { overall_score: 0, content_score: 0, communication_score: 0, confidence_score: 0, structure_score: 0 }
  });
  nextQuestion();
}

function nextQuestion() {
  if (currentQuestionIdx + 1 >= sessionQuestions.length) {
    endSession();
  } else {
    loadQuestion(currentQuestionIdx + 1);
  }
}

// ── End Session & Report ─────────────────────────────────────────
async function endSession() {
  stopRecording();
  if (emotionEnabled) stopEmotionDetection();

  document.getElementById("interviewArena").classList.add("hidden");
  document.getElementById("sessionReport").classList.remove("hidden");
  document.getElementById("sessionReport").scrollIntoView({ behavior: "smooth" });

  const role = document.getElementById("interviewRole")?.value || "Software Engineer";

  try {
    const res = await apiPost("/api/interview/session-feedback", {
      role,
      qa_pairs: sessionQAPairs
    });

    if (!res.success) throw new Error(res.error);
    renderSessionReport(res.data);

  } catch (err) {
    // Fallback report
    renderFallbackReport();
    showToast(`Report error: ${err.message}`, "error");
  }
}

function renderSessionReport(data) {
  document.querySelector("#sessionReport > .glass-card").classList.add("hidden");
  document.getElementById("reportContent").classList.remove("hidden");

  animateEl("reportOverall", data.overall_session_score || 0);
  animateEl("reportTechnical", data.score_breakdown?.technical_knowledge || 0);
  animateEl("reportComms", data.score_breakdown?.communication || 0);
  animateEl("reportConfidence", data.score_breakdown?.confidence || 0);

  const hireEl = document.getElementById("hireRecommendation");
  if (hireEl) {
    const rec = data.hire_recommendation || "—";
    const isHire = rec.toLowerCase().includes("hire") && !rec.toLowerCase().includes("no hire");
    hireEl.textContent = rec;
    hireEl.className = `badge ${isHire ? "badge-green" : "badge-red"}`;
  }

  // Rejection reasons
  const rejEl = document.getElementById("rejectionReasons");
  if (rejEl) {
    rejEl.innerHTML = (data.rejection_reasons || []).map(r => `
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;padding:12px;background:rgba(255,83,112,0.06);border:1px solid rgba(255,83,112,0.2);border-radius:10px;">
        <span class="badge ${r.severity === "Critical" ? "badge-red" : r.severity === "High" ? "badge-orange" : "badge-cyan"}">${r.severity}</span>
        <div>
          <p class="text-sm font-bold">${r.category}</p>
          <p class="text-sm text-secondary">${r.description}</p>
        </div>
      </div>`).join("") || "<p class='text-muted text-sm'>No major rejection risks found!</p>";
  }

  // Top improvements
  const improveEl = document.getElementById("topImprovements");
  if (improveEl) {
    improveEl.innerHTML = (data.top_3_improvements || []).map((imp, i) => `
      <div style="display:flex;gap:12px;margin-bottom:14px;padding:14px;background:rgba(0,230,118,0.05);border:1px solid rgba(0,230,118,0.2);border-radius:12px;">
        <span style="background:var(--gradient-primary);width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:900;flex-shrink:0;">${i + 1}</span>
        <div>
          <p class="text-sm font-bold">${imp.area || "Area"}</p>
          <p class="text-sm text-secondary">${imp.action || ""}</p>
          <span class="badge badge-cyan mt-1">${imp.timeline || ""}</span>
        </div>
      </div>`).join("");
  }

  document.getElementById("encouragement").textContent = data.encouragement || "Keep pushing — every interview is a learning experience!";

  const nextEl = document.getElementById("nextSteps");
  if (nextEl) {
    nextEl.innerHTML = (data.next_steps || [])
      .map(s => `<li style="margin-bottom:8px;">${s}</li>`)
      .join("");
  }
}

function renderFallbackReport() {
  // Calculate average scores from session pairs
  const avgScore = sessionQAPairs.length
    ? Math.round(sessionQAPairs.reduce((sum, qa) => sum + (qa.evaluation?.overall_score || 0), 0) / sessionQAPairs.length)
    : 50;
  renderSessionReport({
    overall_session_score: avgScore,
    hire_recommendation: avgScore >= 70 ? "Hire" : "No Hire",
    score_breakdown: { technical_knowledge: avgScore, communication: avgScore, confidence: avgScore },
    rejection_reasons: avgScore < 70 ? [{ category: "General Performance", description: "Score below hiring threshold", severity: "High" }] : [],
    top_3_improvements: [
      { area: "Communication", action: "Practice answering out loud more frequently", timeline: "2 weeks" },
      { area: "Structure", action: "Use STAR method for all behavioral questions", timeline: "1 week" },
      { area: "Technical Depth", action: "Deep dive into role-specific topics", timeline: "3 weeks" }
    ],
    encouragement: "Great job completing the session! Review the feedback and keep practicing.",
    next_steps: ["Review areas of weakness", "Practice 3 more mock interviews", "Study role-specific technical concepts"]
  });
}

function restartInterview() {
  sessionQuestions = [];
  sessionQAPairs = [];
  currentQuestionIdx = 0;
  document.getElementById("sessionReport").classList.add("hidden");
  document.getElementById("setupSection").classList.remove("hidden");
  document.getElementById("interviewArena").classList.add("hidden");
  document.getElementById("reportContent").classList.add("hidden");
  document.querySelector("#sessionReport > .glass-card")?.classList.remove("hidden");
}

// ── Emotion Detection ────────────────────────────────────────────
async function toggleEmotionDetection() {
  if (emotionEnabled) {
    stopEmotionDetection();
    document.getElementById("emotionToggleBtn").textContent = "😊 Enable Emotion Detection";
    document.getElementById("emotionStatus").textContent = "Disabled";
    document.getElementById("emotionStatus").className = "badge badge-red";
  } else {
    await startEmotionDetection();
  }
}

async function startEmotionDetection() {
  document.getElementById("emotionStatus").textContent = "Loading...";
  document.getElementById("webcamPlaceholder").style.display = "none";

  try {
    // Load face-api models
    if (!faceApiModelsLoaded && typeof faceapi !== "undefined") {
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.2/model/";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      faceApiModelsLoaded = true;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById("webcamFeed");
    video.srcObject = stream;
    await video.play();

    emotionEnabled = true;
    document.getElementById("emotionToggleBtn").textContent = "😊 Disable Emotion Detection";
    document.getElementById("emotionStatus").textContent = "Live";
    document.getElementById("emotionStatus").className = "badge badge-green";

    // Poll for emotions every 800ms
    if (typeof faceapi !== "undefined") {
      emotionInterval = setInterval(() => detectEmotions(video), 800);
    } else {
      // Simulate emotions for demo
      emotionInterval = setInterval(simulateEmotions, 1000);
    }

    showToast("Webcam active — emotion detection running", "success");

  } catch (err) {
    document.getElementById("webcamPlaceholder").style.display = "flex";
    document.getElementById("emotionStatus").textContent = "Failed";
    document.getElementById("emotionStatus").className = "badge badge-red";
    showToast("Camera access denied or unavailable", "error");
  }
}

async function detectEmotions(video) {
  if (!faceApiModelsLoaded || typeof faceapi === "undefined") return;

  try {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (detection?.expressions) {
      const expr = detection.expressions;
      updateEmotionBar("happy", expr.happy || 0);
      updateEmotionBar("neutral", expr.neutral || 0);
      updateEmotionBar("fearful", expr.fearful || 0);
      updateEmotionBar("angry", expr.angry || 0);

      const confidence = Math.round((expr.happy * 100 + expr.neutral * 50) * 100) / 100;
      const confEl = document.getElementById("confidenceScore");
      if (confEl) confEl.textContent = `${Math.min(100, Math.round(confidence))}%`;
    }
  } catch (e) { /* silent */ }
}

function simulateEmotions() {
  // Demo simulation
  const base = { happy: 0.3, neutral: 0.5, fearful: 0.1, angry: 0.05 };
  Object.keys(base).forEach(k => {
    const val = Math.min(1, Math.max(0, base[k] + (Math.random() - 0.5) * 0.2));
    updateEmotionBar(k, val);
  });
  const confEl = document.getElementById("confidenceScore");
  if (confEl) confEl.textContent = `${Math.round(60 + Math.random() * 35)}%`;
}

function updateEmotionBar(emotion, value) {
  const pct = Math.round(value * 100);
  const fillEl = document.getElementById(`emo-${emotion}`);
  const pctEl = document.getElementById(`emo-${emotion}-pct`);
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function stopEmotionDetection() {
  clearInterval(emotionInterval);
  emotionEnabled = false;

  const video = document.getElementById("webcamFeed");
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  document.getElementById("webcamPlaceholder").style.display = "flex";
}

// ── Helpers ──────────────────────────────────────────────────────
function animateEl(id, target) {
  const el = document.getElementById(id);
  if (el) animateCounter(el, target);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
