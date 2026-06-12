/**
 * Pomodoro Timer — 番茄钟模块（内联时钟替换式）
 * 仿 qiaomu-tab 设计：巨大衬线数字 + 极简控制（模式药丸 + 播放/暂停 + 重置）。
 * 番茄钟面板与时钟共享同一视觉空间，通过 #pomodoro-toggle 按钮切换。
 * 状态不持久化（关闭番茄钟面板即重置），仅持久化时长配置。
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
  [PHASE.IDLE]: '准备',
  [PHASE.WORK]: '专注',
  [PHASE.SHORT_BREAK]: '短休息',
  [PHASE.LONG_BREAK]: '长休息',
};

// ── Runtime State ─────────────────────────

let state = {
  phase: PHASE.IDLE,
  remaining: DEFAULTS.work * 60,
  total: DEFAULTS.work * 60,
  sessionCount: 0,
  cycleWorkCount: 0,
  isPaused: false,
  faceVisible: false,
};

let config = { ...DEFAULTS };
let timerId = null;
let transitioning = false;

// ── DOM References ────────────────────────

let elStage;
let elClockDisplay;
let elPomodoroFace;
let elTimerBig;
let elPhaseLabel;
let elSessions;
let elPlay;
let elReset;
let elModeFocus;
let elModeBreak;
let elWork, elShort, elLong, elInterval;
let elDigits = [];

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
  const time = formatTime(state.remaining);
  elTimerBig.dataset.time = time;

  const d = [time[0], time[1], time[3], time[4]]; // M0 M1 S0 S1，跳过冒号
  d.forEach((newVal, i) => {
    const cur = elDigits[i];
    if (cur.textContent === newVal) return;

    const next = cur.cloneNode(false);
    next.textContent = newVal;
    next.classList.add('pomo-entering');
    cur.classList.add('pomo-exiting');
    cur.parentElement.appendChild(next);

    next.addEventListener('animationend', () => {
      cur.remove();
      next.classList.remove('pomo-entering');
      elDigits[i] = next;
    }, { once: true });
  });
}

function updatePhaseLabel() {
  elPhaseLabel.textContent = PHASE_LABELS[state.phase] || '';
}

function updateSessionDots() {
  const dots = elSessions.querySelectorAll('.pomodoro-dot');
  dots.forEach((dot) => {
    const n = parseInt(dot.getAttribute('data-n'), 10);
    dot.classList.toggle('filled', n <= state.cycleWorkCount);
  });
}

function updatePlayButton() {
  if (state.phase === PHASE.IDLE || state.isPaused) {
    elPlay.innerHTML = '&#9654;';   // ▶
    elPlay.title = '开始';
  } else {
    elPlay.innerHTML = '&#9208;';   // ⏸
    elPlay.title = '暂停';
  }
}

function updateModePills() {
  const isBreakPhase = state.phase === PHASE.SHORT_BREAK || state.phase === PHASE.LONG_BREAK;
  elModeFocus.classList.toggle('is-active', !isBreakPhase);
  elModeBreak.classList.toggle('is-active', isBreakPhase);
}

function updateAllDisplay() {
  updateDisplay();
  updatePhaseLabel();
  updateSessionDots();
  updateModePills();
  updatePlayButton();
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
  // Flash the big timer text colour
  elTimerBig.classList.add('pomodoro-flash');
  setTimeout(() => elTimerBig.classList.remove('pomodoro-flash'), 1800);

  playBeep();

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

// ── State Machine — Phase Transitions ─────

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

  updateModePills();
  updatePlayButton();
  startTimer();
}

// ── Face Toggle ───────────────────────────

/**
 * Animate two panels in opposite directions using Animate.css.
 *
 * @param {HTMLElement} outEl    — Element exiting (fade out).
 * @param {string}      outClass — Animate.css exit class (e.g. 'animate__fadeOutLeft').
 * @param {HTMLElement} inEl     — Element entering (fade in).
 * @param {string}      inClass  — Animate.css enter class (e.g. 'animate__fadeInRight').
 * @param {Function}    onDone   — Called when both animations finish.
 */
function runTransition(outEl, outClass, inEl, inClass, onDone) {
  const ANIM_CLASSES = [
    'animate__animated',
    'animate__fadeInLeft', 'animate__fadeInRight',
    'animate__fadeOutLeft', 'animate__fadeOutRight',
  ];

  let completed = 0;
  let settled = false;

  function finish() {
    if (settled) return;
    settled = true;

    // Remove all Animate.css classes from both elements
    outEl.classList.remove(...ANIM_CLASSES);
    inEl.classList.remove(...ANIM_CLASSES);

    // Set final inline styles: outEl hidden, inEl visible
    outEl.style.opacity = '0';
    outEl.style.pointerEvents = 'none';
    outEl.style.transform = '';

    inEl.style.opacity = '1';
    inEl.style.pointerEvents = 'auto';
    inEl.style.transform = '';

    onDone();
  }

  // Listen for animationend on both elements (once each)
  outEl.addEventListener('animationend', () => { completed++; if (completed >= 2) finish(); }, { once: true });
  inEl.addEventListener('animationend',  () => { completed++; if (completed >= 2) finish(); }, { once: true });

  // Safety timeout: ensure we never stay locked
  setTimeout(() => { if (!settled) finish(); }, 1200);

  // Reset inline styles so animation `from` keyframes match current render state
  outEl.style.opacity = '1';
  outEl.style.pointerEvents = '';
  outEl.style.transform = '';

  inEl.style.opacity = '0';
  inEl.style.pointerEvents = 'none';
  inEl.style.transform = '';

  // Force reflow so the browser picks up the inline changes before adding classes
  void outEl.offsetWidth;

  // Trigger both animations simultaneously
  outEl.classList.add('animate__animated', outClass);
  inEl.classList.add('animate__animated', inClass);
}

/**
 * Toggle between clock display and pomodoro face.
 * Uses Animate.css fade swap instead of the previous 3D card-flip.
 */
function toggleFace() {
  if (transitioning) return;
  transitioning = true;

  const showPomodoro = !state.faceVisible;
  state.faceVisible = showPomodoro;

  if (showPomodoro) {
    // Clock exits left, pomodoro enters from right
    runTransition(
      elClockDisplay, 'animate__fadeOutLeft',
      elPomodoroFace, 'animate__fadeInRight',
      () => {
        elStage.classList.add('pomodoro-active');
        transitioning = false;
      }
    );
  } else {
    // Stop timer and reset when closing (before the visual transition)
    if (state.phase !== PHASE.IDLE) {
      handleReset();
    }
    // Pomodoro exits right, clock enters from left
    runTransition(
      elPomodoroFace, 'animate__fadeOutRight',
      elClockDisplay, 'animate__fadeInLeft',
      () => {
        elStage.classList.remove('pomodoro-active');
        transitioning = false;
      }
    );
  }
}

// ── Controls ──────────────────────────────

function handlePlayPause() {
  if (state.phase === PHASE.IDLE) {
    // Determine starting mode from active pill
    const activePill = elPomodoroFace.querySelector('.pomodoro-mode-btn.is-active');
    const mode = activePill ? activePill.dataset.mode : 'focus';
    if (mode === 'focus') {
      transitionTo(PHASE.WORK, config.work * 60);
    } else {
      transitionTo(PHASE.SHORT_BREAK, config.shortBreak * 60);
    }
    state.sessionCount = 0;
    state.cycleWorkCount = 0;
    updateSessionDots();
    updateModePills();
    updatePlayButton();
    startTimer();
  } else if (state.isPaused) {
    state.isPaused = false;
    updatePlayButton();
    startTimer();
  } else {
    // Running — pause
    state.isPaused = true;
    stopTimer();
    updatePlayButton();
  }
}

function handleReset() {
  stopTimer();
  state.phase = PHASE.IDLE;
  state.sessionCount = 0;
  state.cycleWorkCount = 0;

  // Set remaining to the currently selected mode pill's duration
  const activePill = elPomodoroFace.querySelector('.pomodoro-mode-btn.is-active');
  const mode = activePill ? activePill.dataset.mode : 'focus';
  state.remaining = mode === 'focus' ? config.work * 60 : config.shortBreak * 60;
  state.total = state.remaining;
  state.isPaused = false;
  updateAllDisplay();
}

function handleModeSwitch(mode) {
  // Update active pill
  elModeFocus.classList.toggle('is-active', mode === 'focus');
  elModeBreak.classList.toggle('is-active', mode === 'shortBreak');

  // Stop any running timer
  if (state.phase !== PHASE.IDLE) {
    stopTimer();
  }

  // Reset to idle with new mode's duration
  state.phase = PHASE.IDLE;
  state.isPaused = false;
  if (mode === 'focus') {
    state.remaining = config.work * 60;
    state.total = config.work * 60;
  } else {
    state.remaining = config.shortBreak * 60;
    state.total = config.shortBreak * 60;
  }

  // Reset session tracking when switching to focus (new work cycle)
  if (mode === 'focus') {
    state.sessionCount = 0;
    state.cycleWorkCount = 0;
  } else {
    // Switching to break from idle — keep session dots as they were
    state.sessionCount = 0;
  }

  updateAllDisplay();
}

// ── Init Entry ────────────────────────────

export function initPomodoro() {
  config = loadConfig();

  // DOM refs
  elStage = document.querySelector('.hero-stage');
  elClockDisplay = document.getElementById('clock-display');
  elPomodoroFace = document.getElementById('pomodoro-face');
  elTimerBig = document.getElementById('pomodoro-timer-big');
  elDigits = Array.from(elTimerBig.querySelectorAll('.pomo-v'));
  elPhaseLabel = document.getElementById('pomodoro-phase-label');
  elSessions = document.getElementById('pomodoro-sessions');
  elPlay = document.getElementById('pomodoro-play');
  elReset = document.getElementById('pomodoro-reset');
  elModeFocus = elPomodoroFace.querySelector('[data-mode="focus"]');
  elModeBreak = elPomodoroFace.querySelector('[data-mode="shortBreak"]');

  // Config inputs — restore stored values
  elWork = document.getElementById('pomo-work');
  elShort = document.getElementById('pomo-short-break');
  elLong = document.getElementById('pomo-long-break');
  elInterval = document.getElementById('pomo-long-interval');

  elWork.value = config.work;
  elShort.value = config.shortBreak;
  elLong.value = config.longBreak;
  elInterval.value = config.longInterval;

  // Config change → save + update idle display
  [elWork, elShort, elLong, elInterval].forEach((input) => {
    input.addEventListener('change', () => {
      config.work = parseInt(elWork.value, 10) || DEFAULTS.work;
      config.shortBreak = parseInt(elShort.value, 10) || DEFAULTS.shortBreak;
      config.longBreak = parseInt(elLong.value, 10) || DEFAULTS.longBreak;
      config.longInterval = parseInt(elInterval.value, 10) || DEFAULTS.longInterval;
      saveConfig();

      // If idle, reset display to current mode's duration
      if (state.phase === PHASE.IDLE) {
        const activePill = elPomodoroFace.querySelector('.pomodoro-mode-btn.is-active');
        const mode = activePill ? activePill.dataset.mode : 'focus';
        state.remaining = mode === 'focus' ? config.work * 60 : config.shortBreak * 60;
        state.total = state.remaining;
        updateDisplay();
      }
    });
  });

  // Toggle button (bottom-right settings bar)
  document.getElementById('pomodoro-toggle').addEventListener('click', toggleFace);

  // Control events
  elPlay.addEventListener('click', handlePlayPause);
  elReset.addEventListener('click', handleReset);
  elModeFocus.addEventListener('click', () => handleModeSwitch('focus'));
  elModeBreak.addEventListener('click', () => handleModeSwitch('shortBreak'));

  // Initial display (hidden — user clicks button to show)
  updateAllDisplay();

  // Initial visual state: clock visible, pomodoro hidden
  elClockDisplay.style.opacity = '1';
  elPomodoroFace.style.opacity = '0';
  elPomodoroFace.style.pointerEvents = 'none';
}
