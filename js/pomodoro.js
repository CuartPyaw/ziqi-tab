/**
 * Pomodoro Timer — 番茄钟模块
 * 经典 25min 专注 + 5min 短休息，每 4 个番茄一次 15min 长休息。
 * 状态不持久化（关闭标签页即重置），仅持久化时长配置。
 */

const STORAGE_KEY = 'ziqi-pomodoro';

const DEFAULTS = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
  longInterval: 4,
};

const PHASE = {
  IDLE: 'idle',
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
};

const PHASE_LABELS = {
  [PHASE.WORK]: '专注',
  [PHASE.SHORT_BREAK]: '短休息',
  [PHASE.LONG_BREAK]: '长休息',
};

const RING_RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 326.73

// ── Runtime State ─────────────────────────

let state = {
  phase: PHASE.IDLE,
  remaining: DEFAULTS.work * 60,
  total: DEFAULTS.work * 60,
  sessionCount: 0,
  cycleWorkCount: 0,
  isPaused: false,
};

let config = { ...DEFAULTS };
let timerId = null;

// ── DOM References ────────────────────────

let elTimer, elPhase, elRingFill, elSessions;
let elStart, elPause, elResume, elStop, elSkip;
let elWork, elShort, elLong, elInterval;

/** The root container used for completion flash */
let elContainer;

// ── Config Persistence ────────────────────

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch (_) { /* corrupted — use defaults */ }
  return { ...DEFAULTS };
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      work: config.work,
      shortBreak: config.shortBreak,
      longBreak: config.longBreak,
      longInterval: config.longInterval,
    }));
  } catch (_) { /* storage full — silent */ }
}

// ── Display Helpers ───────────────────────

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateDisplay() {
  elTimer.textContent = formatTime(state.remaining);
  elRingFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - state.remaining / state.total);
}

function updatePhaseLabel() {
  elPhase.textContent = PHASE_LABELS[state.phase] || '';
}

function updateSessionDots() {
  const dots = elSessions.querySelectorAll('.pomodoro-dot');
  dots.forEach((dot) => {
    const n = parseInt(dot.getAttribute('data-n'), 10);
    dot.classList.toggle('filled', n <= state.cycleWorkCount);
  });
}

function updateControlButtons() {
  const isIdle = state.phase === PHASE.IDLE;
  const isRunning = !isIdle && !state.isPaused;
  const isPaused = !isIdle && state.isPaused;

  elStart.hidden = !isIdle;
  elPause.hidden = !isRunning;
  elResume.hidden = !isPaused;
  elStop.hidden = isIdle;
  elSkip.hidden = isIdle;
}

function updateAllDisplay() {
  updateDisplay();
  updatePhaseLabel();
  updateSessionDots();
  updateControlButtons();
}

// ── Notifications ─────────────────────────

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) { /* audio unavailable */ }
}

function notifyCompletion() {
  // Flash container border
  elContainer.classList.add('pomodoro-flash');
  setTimeout(() => elContainer.classList.remove('pomodoro-flash'), 1600);

  // Beep
  playBeep();

  // Browser notification
  if (Notification.permission === 'granted') {
    const label = PHASE_LABELS[state.phase] || '阶段';
    new Notification('番茄钟', {
      body: `${label} 时间到！`,
      icon: 'icons/icon-128.png',
    });
  } else if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ── Timer Engine ──────────────────────────

/**
 * 启动倒计时，使用 setTimeout 对齐到下一整秒。
 * 参考 clock.js 的整秒对齐模式。
 */
function startTimer() {
  stopTimer();
  const ms = 1000 - (Date.now() % 1000);
  timerId = setTimeout(() => {
    tick();
    timerId = setInterval(tick, 1000);
  }, ms);
}

function stopTimer() {
  if (timerId !== null) {
    clearTimeout(timerId);
    clearInterval(timerId);
    timerId = null;
  }
}

function tick() {
  if (state.isPaused) return;
  state.remaining--;
  updateDisplay();
  if (state.remaining <= 0) {
    complete();
  }
}

// ── State Machine ― Phase Transitions ────

function transitionTo(phase, totalSec) {
  state.phase = phase;
  state.remaining = totalSec;
  state.total = totalSec;
  state.isPaused = false;
  updatePhaseLabel();
  updateDisplay();
}

function complete() {
  stopTimer();
  notifyCompletion();

  if (state.phase === PHASE.WORK) {
    state.sessionCount++;
    state.cycleWorkCount++;
    updateSessionDots();

    if (state.cycleWorkCount >= config.longInterval) {
      state.cycleWorkCount = 0;
      transitionTo(PHASE.LONG_BREAK, config.longBreak * 60);
    } else {
      transitionTo(PHASE.SHORT_BREAK, config.shortBreak * 60);
    }
  } else {
    transitionTo(PHASE.WORK, config.work * 60);
  }

  updateControlButtons();
  startTimer();
}

// ── Controls ──────────────────────────────

function handleStart() {
  transitionTo(PHASE.WORK, config.work * 60);
  state.sessionCount = 0;
  state.cycleWorkCount = 0;
  updateSessionDots();
  updateControlButtons();
  startTimer();
}

function handlePause() {
  state.isPaused = true;
  stopTimer();
  updateControlButtons();
}

function handleResume() {
  state.isPaused = false;
  updateControlButtons();
  startTimer();
}

function handleStop() {
  stopTimer();
  state.phase = PHASE.IDLE;
  state.remaining = config.work * 60;
  state.total = config.work * 60;
  state.isPaused = false;
  state.sessionCount = 0;
  state.cycleWorkCount = 0;
  updateSessionDots();
  updateControlButtons();
  updateDisplay();
}

function handleSkip() {
  stopTimer();
  if (state.phase === PHASE.WORK) {
    transitionTo(PHASE.SHORT_BREAK, config.shortBreak * 60);
  } else {
    transitionTo(PHASE.WORK, config.work * 60);
  }
  updateSessionDots();
  updateControlButtons();
  startTimer();
}

// ── Init Entry ────────────────────────────

export function initPomodoro() {
  config = loadConfig();

  // Set config inputs to stored values
  elWork = document.getElementById('pomo-work');
  elShort = document.getElementById('pomo-short-break');
  elLong = document.getElementById('pomo-long-break');
  elInterval = document.getElementById('pomo-long-interval');

  elWork.value = config.work;
  elShort.value = config.shortBreak;
  elLong.value = config.longBreak;
  elInterval.value = config.longInterval;

  // Save config on change
  [elWork, elShort, elLong, elInterval].forEach((input) => {
    input.addEventListener('change', () => {
      config.work = parseInt(elWork.value, 10) || DEFAULTS.work;
      config.shortBreak = parseInt(elShort.value, 10) || DEFAULTS.shortBreak;
      config.longBreak = parseInt(elLong.value, 10) || DEFAULTS.longBreak;
      config.longInterval = parseInt(elInterval.value, 10) || DEFAULTS.longInterval;
      saveConfig();

      // If IDLE, reset display to new work duration
      if (state.phase === PHASE.IDLE) {
        state.remaining = config.work * 60;
        state.total = config.work * 60;
        updateDisplay();
      }
    });
  });

  // DOM refs
  elContainer = document.querySelector('.pomodoro-container');
  elTimer = document.getElementById('pomodoro-timer');
  elPhase = document.getElementById('pomodoro-phase');
  elRingFill = document.getElementById('pomodoro-ring-fill');
  elSessions = document.getElementById('pomodoro-sessions');
  elStart = document.getElementById('pomodoro-start');
  elPause = document.getElementById('pomodoro-pause');
  elResume = document.getElementById('pomodoro-resume');
  elStop = document.getElementById('pomodoro-stop');
  elSkip = document.getElementById('pomodoro-skip');

  // Control buttons
  elStart.addEventListener('click', handleStart);
  elPause.addEventListener('click', handlePause);
  elResume.addEventListener('click', handleResume);
  elStop.addEventListener('click', handleStop);
  elSkip.addEventListener('click', handleSkip);

  // Initial display
  updateAllDisplay();
}
