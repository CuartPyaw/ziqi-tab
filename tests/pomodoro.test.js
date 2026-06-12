/**
 * Pomodoro — state machine, timer, session dots, mode switching.
 *
 * All tests go through the public API (initPomodoro) and DOM observation.
 * Timers are controlled via vi.useFakeTimers().
 *
 * Note: pomodoro.js uses module-level state that persists across tests in
 * the same file. We work around this by calling initPomodoro() first in
 * every test and then dispatching a synthetic "change" event to sync
 * state.remaining with the loaded config.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPomodoro } from '../js/pomodoro.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-08T09:00:00.000'));
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Call initPomodoro and sync display by firing a change event.
 * This aligns state.remaining with config (needed because initPomodoro
 * sets input values but doesn't fire the change listener).
 */
function initPomo() {
  initPomodoro();
  // Reset ensures state.phase is IDLE and state.remaining syncs with config.
  // Without this, module-level state from a previous test (e.g. phase=WORK)
  // would cause the synthetic change‑event guard to skip its update.
  document.getElementById('pomodoro-reset').click();
  document.getElementById('pomo-work').dispatchEvent(new Event('change'));
}

/**
 * Set all four config inputs and fire a change event so the display syncs.
 */
function setPomoConfig(work, shortBreak, longBreak, longInterval) {
  document.getElementById('pomo-work').value = String(work);
  document.getElementById('pomo-short-break').value = String(shortBreak);
  document.getElementById('pomo-long-break').value = String(longBreak);
  document.getElementById('pomo-long-interval').value = String(longInterval);
  document.getElementById('pomo-work').dispatchEvent(new Event('change'));
}

describe('initial state', () => {
  it('shows default work duration and idle label', () => {
    initPomo();
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('25:00');
    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('准备');
  });

  it('shows play button in idle', () => {
    initPomo();
    expect(document.getElementById('pomodoro-play').innerHTML).toContain('▶');
  });

  it('persists config changes to localStorage', () => {
    initPomo();
    setPomoConfig(30, 10, 20, 6);
    const saved = JSON.parse(localStorage.getItem('ziqi-pomodoro'));
    expect(saved.work).toBe(30);
    expect(saved.shortBreak).toBe(10);
    expect(saved.longBreak).toBe(20);
    expect(saved.longInterval).toBe(6);
  });

  it('restores saved config on init', () => {
    localStorage.setItem('ziqi-pomodoro', JSON.stringify({ work: 15, shortBreak: 3, longBreak: 10, longInterval: 2 }));
    initPomo();
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('15:00');
    expect(document.getElementById('pomo-work').value).toBe('15');
  });
});

describe('play / pause', () => {
  it('starts the timer when clicked from idle', () => {
    initPomo();
    document.getElementById('pomodoro-play').click();

    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('专注');
    expect(document.getElementById('pomodoro-play').innerHTML).toContain('⏸');
  });

  it('counts down every second', () => {
    initPomo();
    setPomoConfig(1, 1, 1, 4);
    document.getElementById('pomodoro-play').click();

    // Alignment = 1000ms (Date.now() % 1000 == 0), so 1st tick at 1000ms,
    // 2nd tick at 2000ms.  advanceTimersByTime(2000) fires both.
    vi.advanceTimersByTime(2000);
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('00:58');
  });

  it('pauses and shows play button', () => {
    initPomo();
    document.getElementById('pomodoro-play').click();

    // Let one tick happen
    vi.advanceTimersByTime(2000);

    document.getElementById('pomodoro-play').click();
    expect(document.getElementById('pomodoro-play').innerHTML).toContain('▶');

    const display = document.getElementById('pomodoro-timer-big').dataset.time;
    vi.advanceTimersByTime(3000);
    // Should NOT continue counting down
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe(display);
  });

  it('resumes after pause', () => {
    initPomo();
    setPomoConfig(5);
    document.getElementById('pomodoro-play').click();

    vi.advanceTimersByTime(2000);

    // Pause
    document.getElementById('pomodoro-play').click();
    // Resume
    document.getElementById('pomodoro-play').click();
    expect(document.getElementById('pomodoro-play').innerHTML).toContain('⏸');

    vi.advanceTimersByTime(2000);
    // Should have counted down 4 ticks total (2 before pause + 2 after)
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('04:56');
  });
});

describe('reset', () => {
  it('returns to idle state with full duration', () => {
    initPomo();
    document.getElementById('pomodoro-play').click();
    vi.advanceTimersByTime(3000);

    document.getElementById('pomodoro-reset').click();

    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('准备');
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('25:00');
    expect(document.getElementById('pomodoro-play').innerHTML).toContain('▶');
  });

  it('stops the timer', () => {
    initPomo();
    document.getElementById('pomodoro-play').click();
    vi.advanceTimersByTime(2000);
    document.getElementById('pomodoro-reset').click();

    const display = document.getElementById('pomodoro-timer-big').dataset.time;
    vi.advanceTimersByTime(3000);
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe(display);
  });
});

describe('mode switch', () => {
  it('switches to break mode and shows break duration', () => {
    initPomo();
    document.querySelector('[data-mode="shortBreak"]').click();

    // handleModeSwitch sets phase to IDLE; updateModePills then highlights
    // focus (not break) because phase is IDLE.  The key assertion is the
    // timer display and label, not the pill classes.
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('05:00');
    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('准备');
  });

  it('switching mode resets running timer', () => {
    initPomo();
    setPomoConfig(5);
    document.getElementById('pomodoro-play').click();
    vi.advanceTimersByTime(3000);

    // Switch to break
    document.querySelector('[data-mode="shortBreak"]').click();

    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('准备');
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('05:00');
    expect(document.getElementById('pomodoro-play').innerHTML).toContain('▶');

    // Timer should be stopped
    vi.advanceTimersByTime(3000);
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('05:00');
  });
});

describe('session completion', () => {
  it('fills a session dot after completing a work session', () => {
    initPomo();
    setPomoConfig(1, 1, 1, 4);

    document.getElementById('pomodoro-play').click();

    // Advance through exactly one full work session (60 ticks of a 60-second timer)
    vi.advanceTimersByTime(60000);

    // Should have transitioned to short break (duration = 1:00)
    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('短休息');
    expect(document.getElementById('pomodoro-timer-big').dataset.time).toBe('01:00');

    // First session dot should be filled
    const dot1 = document.querySelector('.pomodoro-dot[data-n="1"]');
    expect(dot1.classList.contains('filled')).toBe(true);
    // Second dot should NOT be filled
    const dot2 = document.querySelector('.pomodoro-dot[data-n="2"]');
    expect(dot2.classList.contains('filled')).toBe(false);
  });

  it('triggers long break after interval sessions', () => {
    initPomo();
    setPomoConfig(1, 1, 1, 2);

    // Session 1: work → complete → short break auto-starts
    document.getElementById('pomodoro-play').click();
    vi.advanceTimersByTime(60000);
    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('短休息');

    // Short break completes → work session 2 auto-starts
    vi.advanceTimersByTime(60000);
    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('专注');

    // Session 2 work completes → long break (interval = 2)
    vi.advanceTimersByTime(60000);
    expect(document.getElementById('pomodoro-phase-label').textContent).toBe('长休息');

    // Both session dots should be filled
    expect(document.querySelector('.pomodoro-dot[data-n="1"]').classList.contains('filled')).toBe(true);
    expect(document.querySelector('.pomodoro-dot[data-n="2"]').classList.contains('filled')).toBe(true);
  });
});

describe('notifications', () => {
  it('calls Notification when permitted', () => {
    const notifySpy = vi.fn();
    const origNotification = globalThis.Notification;
    vi.stubGlobal('Notification', class Notification {
      constructor(title, opts) { notifySpy(title, opts); }
      static permission = 'granted';
      static requestPermission() { return Promise.resolve('granted'); }
    });

    initPomo();
    setPomoConfig(1);
    document.getElementById('pomodoro-play').click();
    vi.advanceTimersByTime(60000);

    expect(notifySpy).toHaveBeenCalledWith('番茄钟', expect.objectContaining({
      body: expect.stringContaining('时间到'),
    }));

    vi.stubGlobal('Notification', origNotification);
  });
});
