/* ══════════════════════════════════════════════════════════════
   Magic Fingers – Game Engine
   Integrates MediaPipe Hands for real-time finger counting
   ══════════════════════════════════════════════════════════════ */

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : '';

// ── State ────────────────────────────────────────────────────
const state = {
  level: 'easy',
  questions: [],
  qIndex: 0,
  score: 0,
  lives: 3,
  stars: 0,
  correct: 0,
  timerInterval: null,
  timeLeft: 600,
  muted: false,
  answerLocked: false,     // prevent rapid multi-answers
  holdCount: 0,            // how many frames finger count matches
  lastDetected: -1,
  currentAnswer: 0,
  holdThreshold: 18,       // ~0.6s at 30fps to confirm answer
};

// ── Screen helpers ───────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showMenu() {
  stopCamera();
  stopTimer();
  showScreen('screenMenu');
}

// ── DOM refs ─────────────────────────────────────────────────
const videoEl    = document.getElementById('video');
const overlayEl  = document.getElementById('overlay');
const ctx        = overlayEl.getContext('2d');

// ── MediaPipe ────────────────────────────────────────────────
let hands = null;
let camera = null;

function initMediaPipe() {
  hands = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });
  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.75,
    minTrackingConfidence: 0.6,
  });
  hands.onResults(onHandResults);
}

function startCamera() {
  setCamStatus('Starting camera…');
  camera = new Camera(videoEl, {
    onFrame: async () => {
      if (hands) await hands.send({ image: videoEl });
    },
    width: 640,
    height: 480,
  });
  camera.start()
    .then(() => setCamStatus('Camera ready! ✅'))
    .catch(err => {
      console.error(err);
      setCamStatus('❌ Camera denied. Please allow access.');
    });
}

function stopCamera() {
  if (camera) { camera.stop(); camera = null; }
}

// ── Finger counting (MediaPipe landmarks) ────────────────────
/*
  Landmarks: 0=wrist, 1-4=thumb, 5-8=index, 9-12=middle,
             13-16=ring, 17-20=pinky
  Tip indices: 4,8,12,16,20
  Mcp indices: 2,5,9,13,17
*/
function countFingers(landmarks) {
  const tips = [4, 8, 12, 16, 20];
  const mcps = [2, 5, 9, 13, 17];
  let count = 0;

  // Thumb: compare x-axis (mirrored video — use x of tip vs mcp)
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const wrist    = landmarks[0];
  const indexMcp = landmarks[5];
  // Thumb extended if tip is further from wrist than mcp on the x axis
  const thumbExtended = Math.abs(thumbTip.x - wrist.x) > Math.abs(thumbMcp.x - wrist.x);
  if (thumbExtended) count++;

  // Other fingers: tip.y < mcp.y means finger is up (y increases downward)
  for (let i = 1; i < 5; i++) {
    if (landmarks[tips[i]].y < landmarks[mcps[i]].y) count++;
  }

  return count;
}

// ── MediaPipe result handler ──────────────────────────────────
function onHandResults(results) {
  overlayEl.width  = videoEl.videoWidth  || 640;
  overlayEl.height = videoEl.videoHeight || 480;
  ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
    hideDetected();
    state.holdCount = 0;
    state.lastDetected = -1;
    return;
  }

  let totalFingers = 0;
  results.multiHandLandmarks.forEach(landmarks => {
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 3 });
    drawLandmarks(ctx, landmarks, { color: '#7C3AED', lineWidth: 2, radius: 5 });
    totalFingers += countFingers(landmarks);
  });

  totalFingers = Math.min(totalFingers, 10);
  showDetected(totalFingers, results.multiHandLandmarks.length);

  if (totalFingers === state.lastDetected) {
    state.holdCount++;
  } else {
    state.holdCount = 0;
    state.lastDetected = totalFingers;
  }

  if (state.holdCount >= state.holdThreshold && !state.answerLocked) {
    submitAnswer(totalFingers);
  }
}

function showDetected(n, handCount) {
  const badge = document.getElementById('detectedBadge');
  badge.classList.remove('hidden');
  const handsLabel = handCount === 2 ? ' (2 hands)' : '';
  document.getElementById('detectedNum').textContent = n + handsLabel;
}
function hideDetected() {
  document.getElementById('detectedBadge').classList.add('hidden');
}
function setCamStatus(msg) {
  document.getElementById('camStatus').textContent = msg;
}

// ── Game Flow ─────────────────────────────────────────────────
async function startGame(level) {
  state.level   = level;
  state.qIndex  = 0;
  state.score   = 0;
  state.lives   = 3;
  state.stars   = 0;
  state.correct = 0;
  state.timeLeft = 600;
  state.answerLocked = false;
  state.holdCount = 0;

  showScreen('screenGame');
  updateUI();

  // Load questions from backend
  try {
    const res  = await fetch(`${API}/api/questions?level=${level}&count=10`);
    const data = await res.json();
    state.questions = data.questions;
  } catch {
    // Fallback: generate locally
    state.questions = generateLocalQuestions(level, 10);
  }

  showQuestion();
  initMediaPipe();
  startCamera();
  startTimer();
}

function generateLocalQuestions(level, count) {
  const q = [];
  for (let i = 0; i < count; i++) {
    const ops = level === 'easy' ? ['+'] : level === 'medium' ? ['+', '-'] : ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 5) + 1;
    let b = Math.floor(Math.random() * 5) + 1;
    if (op === '-' && a < b) [a, b] = [b, a];
    if (op === '*') { a = Math.min(a, 3); b = Math.min(b, 3); }
    let ans = op === '+' ? a+b : op === '-' ? a-b : a*b;
    if (ans < 1 || ans > 10) { i--; continue; }
    q.push({ a, b, op, answer: ans });
  }
  return q;
}

function showQuestion() {
  const q = state.questions[state.qIndex];
  if (!q) { endGame(); return; }

  state.currentAnswer = q.answer;
  state.answerLocked  = false;
  state.holdCount     = 0;
  state.lastDetected  = -1;

  document.getElementById('qNum').textContent   = state.qIndex + 1;
  document.getElementById('qTotal').textContent = state.questions.length;
  document.querySelector('.eq-a').textContent   = q.a;
  document.querySelector('.eq-op').textContent  = q.op;
  document.querySelector('.eq-b').textContent   = q.b;

  setFeedback('Waiting for your answer…', '');
  showSpinner(true);
}

function submitAnswer(count) {
  if (state.answerLocked) return;
  state.answerLocked = true;
  state.holdCount = 0;
  showSpinner(false);

  if (count === state.currentAnswer) {
    // Correct!
    state.score   += scoreForLevel();
    state.correct++;
    state.stars = Math.min(5, state.stars + 1);
    setFeedback(`🎉 Correct! ${count} is right!`, 'correct');
    setMascot('🎊');
    updateStarsBar();
    playSound('correct');
  } else {
    // Wrong
    state.lives = Math.max(0, state.lives - 1);
    setFeedback(`❌ You showed ${count}, answer is ${state.currentAnswer}`, 'wrong');
    setMascot('😬');
    playSound('wrong');
    updateLives();
    if (state.lives === 0) { setTimeout(endGame, 1500); return; }
  }

  updateScore();
  setTimeout(() => {
    state.qIndex++;
    if (state.qIndex >= state.questions.length) { endGame(); return; }
    setMascot('🐒');
    showQuestion();
  }, 1600);
}

function scoreForLevel() {
  const map = { easy:10, medium:20, hard:30 };
  return map[state.level] || 10;
}

function skipQuestion() {
  if (state.answerLocked) return;
  state.qIndex++;
  state.lives = Math.max(0, state.lives - 1);
  updateLives();
  if (state.lives === 0 || state.qIndex >= state.questions.length) { endGame(); return; }
  showQuestion();
}

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    const m = String(Math.floor(state.timeLeft / 60)).padStart(2,'0');
    const s = String(state.timeLeft % 60).padStart(2,'0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
    if (state.timeLeft <= 0) { stopTimer(); endGame(); }
  }, 1000);
}
function stopTimer() {
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
}

// ── End Game ──────────────────────────────────────────────────
function endGame() {
  stopCamera();
  stopTimer();
  showScreen('screenResult');

  const pct = state.correct / state.questions.length;
  let emoji = '😊', title = 'Good Try!', msg = 'Keep practising!';
  if (pct >= .9) { emoji='🏆'; title='Champion!'; msg='Outstanding performance! You\'re a math wizard!'; }
  else if (pct >= .7) { emoji='🎉'; title='Great Job!'; msg='Excellent! Almost perfect!'; }
  else if (pct >= .5) { emoji='👍'; title='Well Done!'; msg='Good job! A bit more practice and you\'ll be amazing!'; }

  document.getElementById('resultEmoji').textContent  = emoji;
  document.getElementById('resultTitle').textContent  = title;
  document.getElementById('resultMsg').textContent    = msg;
  document.getElementById('rScore').textContent       = state.score;
  document.getElementById('rCorrect').textContent     = `${state.correct}/${state.questions.length}`;
  document.getElementById('rStars').textContent       = '⭐'.repeat(state.stars) || '—';
}

async function saveScore() {
  const name = document.getElementById('playerName').value.trim();
  if (!name) { document.getElementById('saveMsg').textContent = '⚠️ Enter your name!'; return; }
  try {
    await fetch(`${API}/api/score`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, score:state.score, level:state.level }),
    });
    document.getElementById('saveMsg').textContent = '✅ Score saved! Check the leaderboard!';
  } catch {
    document.getElementById('saveMsg').textContent = '⚠️ Could not save — server offline.';
  }
}

function restartGame() { startGame(state.level); }

// ── UI helpers ────────────────────────────────────────────────
function updateUI() {
  updateScore();
  updateLives();
  document.getElementById('levelDisplay').textContent =
    state.level.charAt(0).toUpperCase() + state.level.slice(1);
  updateStarsBar();
}

function updateScore() {
  document.getElementById('scoreDisplay').textContent = state.score;
}

function updateLives() {
  const full  = '❤️';
  const empty = '🖤';
  document.getElementById('livesDisplay').textContent =
    full.repeat(state.lives) + empty.repeat(3 - state.lives);
}

function updateStarsBar() {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById('s' + i);
    if (i <= state.stars) {
      el.textContent = '⭐';
      el.classList.add('filled');
    } else {
      el.textContent = '☆';
      el.classList.remove('filled');
    }
  }
}

function setFeedback(msg, cls) {
  const el = document.getElementById('feedback');
  el.textContent  = msg;
  el.className    = 'feedback-text ' + cls;
}

function showSpinner(show) {
  const sp = document.getElementById('spinner');
  sp.className = show ? 'spinner' : 'spinner hidden';
}

function setMascot(emoji) {
  document.getElementById('mascot').textContent = emoji;
}

// ── Sound (Web Audio API) ─────────────────────────────────────
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  if (state.muted) return;
  try {
    const ac  = getAudio();
    const osc = ac.createOscillator();
    const gain= ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);

    if (type === 'correct') {
      osc.frequency.setValueAtTime(523, ac.currentTime);
      osc.frequency.setValueAtTime(659, ac.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ac.currentTime + 0.2);
      gain.gain.setValueAtTime(.3, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .5);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + .5);
    } else {
      osc.frequency.setValueAtTime(300, ac.currentTime);
      osc.frequency.setValueAtTime(200, ac.currentTime + 0.1);
      gain.gain.setValueAtTime(.3, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .3);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + .3);
    }
  } catch(e) { /* silent fail */ }
}

function toggleMute() {
  state.muted = !state.muted;
  document.getElementById('muteBtn').textContent = state.muted ? '🔇' : '🔊';
}
