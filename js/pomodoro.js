/**
 * Pomodoro Timer — 番茄钟计时器
 * Focus / short break / long break with localStorage persistence and
 * auto session cycling. Page switching uses Animate.css fadeInRight.
 */

/* ── Constants ────────────────────────────── */

const STORAGE_KEY = 'ziqi-pomodoro-state';

const MODES = {
  focus:      { id: 'focus',      label: '专注', mins: 25 },
  shortBreak: { id: 'shortBreak', label: '短休', mins: 5 },
  longBreak:  { id: 'longBreak',  label: '长休', mins: 15 },
};

const CIRCUMFERENCE = 2 * Math.PI * 110; // r = 110 → ≈691.15

/* ── State ────────────────────────────────── */

let state = {
  mode: 'focus',
  remainingSeconds: 25 * 60,
  startedAt: null,         // Date.now() when running; null when paused
  totalSeconds: 25 * 60,   // total for current mode (for progress calc)
  completedSessions: 0,    // completed focus sessions in current cycle
};

let tickInterval = null;
let audioCtx = null;

/* ── DOM Refs (assigned in init) ──────────── */

let elTime;
let elProgressRing;
let elStartBtn;
let elPauseBtn;
let elResetBtn;
let elDots;

/* ── Helpers ──────────────────────────────── */

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      /* audio not available */
    }
  }
  return audioCtx;
}

/* ── Persistence ──────────────────────────── */

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    /* storage full or unavailable */
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      resetState();
      return;
    }
    const saved = JSON.parse(raw);
    // Validate essential fields
    if (!saved.mode || !MODES[saved.mode] || typeof saved.remainingSeconds !== 'number') return;
    state = saved;

    // If timer was running, catch up elapsed time
    if (state.startedAt) {
      const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsed);
      state.startedAt = Date.now(); // reset anchor to now

      // Timer expired while page was closed
      if (state.remainingSeconds <= 0) {
        handleTimerEnd();
        return; // handleTimerEnd calls saveState + updates
      }
    }
    saveState();
  } catch (_) {
    resetState();
  }
}

function resetState() {
  state = {
    mode: 'focus',
    remainingSeconds: MODES.focus.mins * 60,
    startedAt: null,
    totalSeconds: MODES.focus.mins * 60,
    completedSessions: 0,
  };
  saveState();
}

/* ── UI Updates ───────────────────────────── */

function updateDisplay() {
  elTime.textContent = formatTime(state.remainingSeconds);
  const fraction = state.remainingSeconds / state.totalSeconds;
  elProgressRing.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
  updateDocumentTitle();
}

function updateDocumentTitle() {
  document.title = state.startedAt
    ? `${formatTime(state.remainingSeconds)} - ${MODES[state.mode].label} - Ziqi Tab`
    : 'Ziqi Tab';
}

function updateModeButtons() {
  document.querySelectorAll('.pomodoro-mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === state.mode);
  });
}

function updateSessionDots() {
  if (!elDots) return;
  const dots = elDots.querySelectorAll('.pomodoro-dot');
  const filled = state.completedSessions % 4;
  dots.forEach((dot, i) => dot.classList.toggle('filled', i < filled));
}

function updateControlButtons() {
  const running = tickInterval !== null;
  elStartBtn.style.display = running ? 'none' : '';
  elPauseBtn.style.display = running ? '' : 'none';
}

/* ── Timer Lifecycle ──────────────────────── */

function tick() {
  if (state.remainingSeconds <= 0) {
    handleTimerEnd();
    return;
  }
  state.remainingSeconds--;
  state.startedAt = Date.now(); // re-anchor each tick
  saveState();
  updateDisplay();

  // Timer just reached 0 — advance immediately within the same tick
  if (state.remainingSeconds <= 0) {
    handleTimerEnd();
  }
}

function startTimer() {
  if (tickInterval) return; // already running
  state.startedAt = Date.now();
  saveState();
  tickInterval = setInterval(tick, 1000);
  updateControlButtons();
  updateDocumentTitle();
}

function pauseTimer() {
  if (!tickInterval) return;
  clearInterval(tickInterval);
  tickInterval = null;
  state.startedAt = null;
  saveState();
  updateControlButtons();
  updateDocumentTitle();
}

function resetTimer() {
  pauseTimer();
  state.remainingSeconds = MODES[state.mode].mins * 60;
  state.totalSeconds = MODES[state.mode].mins * 60;
  saveState();
  updateDisplay();
}

/* ── Mode & Session Logic ─────────────────── */

function switchMode(modeId) {
  if (state.mode === modeId) return;
  pauseTimer();
  state.mode = modeId;
  state.remainingSeconds = MODES[modeId].mins * 60;
  state.totalSeconds = MODES[modeId].mins * 60;
  saveState();
  updateDisplay();
  updateModeButtons();
  updateSessionDots();
}

function advanceMode() {
  if (state.mode === 'focus') {
    state.completedSessions++;
    if (state.completedSessions % 4 === 0) {
      state.mode = 'longBreak';
      state.totalSeconds = MODES.longBreak.mins * 60;
    } else {
      state.mode = 'shortBreak';
      state.totalSeconds = MODES.shortBreak.mins * 60;
    }
  } else {
    state.mode = 'focus';
    state.totalSeconds = MODES.focus.mins * 60;
  }
  state.remainingSeconds = state.totalSeconds;
  state.startedAt = null;
  saveState();
  updateDisplay();
  updateModeButtons();
  updateSessionDots();
}

function handleTimerEnd() {
  pauseTimer();
  notifyUser();
  advanceMode();
  startTimer(); // auto-start next session
}

/* ── Notification ─────────────────────────── */

function notifyUser() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    // Resume if suspended (autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {
    /* audio not available */
  }
}

/* ── Page Switching ───────────────────────── */

/**
 * Switch between 'main' and 'pomodoro' pages with Animate.css fadeInRight.
 * @param {'main' | 'pomodoro'} pageName
 */
export function switchToPage(pageName) {
  const current = document.querySelector('.page--active');
  const target = document.querySelector(`.page--${pageName}`);

  if (!target || current === target) return;

  if (current) current.classList.remove('page--active');

  const animClass = pageName === 'pomodoro' ? 'animate__fadeInRight' : 'animate__fadeInLeft';

  target.classList.add('page--active', 'animate__animated', animClass);

  target.addEventListener('animationend', () => {
    target.classList.remove('animate__animated', animClass);
  }, { once: true });

  // Reflect active state on the toggle button
  const toggleBtn = document.getElementById('pomodoro-toggle');
  if (toggleBtn) {
    toggleBtn.classList.toggle('active', pageName === 'pomodoro');
  }
}

/* ── Init ─────────────────────────────────── */

export function initPomodoro() {
  // Clean up any previously-running interval (test / re-init isolation)
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }

  // Grab DOM refs
  elTime = document.getElementById('pomodoro-time');
  elProgressRing = document.getElementById('pomodoro-progress-ring');
  elStartBtn = document.getElementById('pomodoro-start');
  elPauseBtn = document.getElementById('pomodoro-pause');
  elResetBtn = document.getElementById('pomodoro-reset');
  elDots = document.getElementById('pomodoro-dots');

  // Pre-create AudioContext
  getAudioCtx();

  // Restore persisted state (and catch up elapsed time)
  loadState();

  // Initial UI render
  updateDisplay();
  updateModeButtons();
  updateSessionDots();
  updateControlButtons();

  // If timer was running (and still has time), resume ticking
  if (state.startedAt && state.remainingSeconds > 0) {
    tickInterval = setInterval(tick, 1000);
    updateControlButtons();
  }

  // Mode button handlers
  document.querySelectorAll('.pomodoro-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchMode(btn.getAttribute('data-mode')));
  });

  // Control button handlers
  elStartBtn.addEventListener('click', startTimer);
  elPauseBtn.addEventListener('click', pauseTimer);
  elResetBtn.addEventListener('click', resetTimer);

  // Toggle button (in .settings-bar)
  const toggleBtn = document.getElementById('pomodoro-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.querySelector('.page--active');
      const onPomodoro = current?.classList.contains('page--pomodoro');
      switchToPage(onPomodoro ? 'main' : 'pomodoro');
    });
  }
}
