/**
 * Pomodoro Timer — mode switching, countdown, session tracking,
 * localStorage persistence, and page switching.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initPomodoro, switchToPage } from '../js/pomodoro.js';

/* ── Helpers ──────────────────────────────── */

function getTimeText() {
  return document.getElementById('pomodoro-time').textContent;
}

function getProgressOffset() {
  return document.getElementById('pomodoro-progress-ring').style.strokeDashoffset;
}

function clickStart() {
  document.getElementById('pomodoro-start').click();
}

function clickPause() {
  document.getElementById('pomodoro-pause').click();
}

function clickReset() {
  document.getElementById('pomodoro-reset').click();
}

function clickMode(mode) {
  document.querySelector(`.pomodoro-mode-btn[data-mode="${mode}"]`).click();
}

function getFilledDots() {
  return document.querySelectorAll('.pomodoro-dot.filled').length;
}

function initFresh() {
  localStorage.clear();
  // Reset DOM state
  document.querySelectorAll('.pomodoro-mode-btn').forEach((b) => b.classList.remove('active'));
  const focusBtn = document.querySelector('.pomodoro-mode-btn[data-mode="focus"]');
  if (focusBtn) focusBtn.classList.add('active');
  document.getElementById('pomodoro-time').textContent = '25:00';
  document.getElementById('pomodoro-start').style.display = '';
  document.getElementById('pomodoro-pause').style.display = 'none';
  document.querySelectorAll('.pomodoro-dot').forEach((d) => d.classList.remove('filled'));
  // Reset page active state
  document.querySelector('.page--pomodoro')?.classList.remove('page--active');
  document.querySelector('.page--main')?.classList.add('page--active');
  // Reset toggle button state
  const toggleBtn = document.getElementById('pomodoro-toggle');
  if (toggleBtn) toggleBtn.classList.remove('active');
}

/* ── Test Suite ───────────────────────────── */

describe('Pomodoro Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Freeze time so Date.now() is deterministic
    vi.setSystemTime(new Date('2026-06-14T12:00:00'));
    initFresh();
    initPomodoro();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── 1. Initialization ─────────────────── */

  describe('initialization', () => {
    it('defaults to focus mode with 25:00', () => {
      expect(getTimeText()).toBe('25:00');
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('focus');
    });

    it('has no session dots filled', () => {
      expect(getFilledDots()).toBe(0);
    });

    it('shows start button and hides pause button', () => {
      expect(document.getElementById('pomodoro-start').style.display).toBe('');
      expect(document.getElementById('pomodoro-pause').style.display).toBe('none');
    });

    it('has progress ring at full circumference', () => {
      expect(getProgressOffset()).toBe('0');
    });
  });

  /* ── 2. Mode Switching ─────────────────── */

  describe('mode switching', () => {
    it('switches to short break and resets time to 05:00', () => {
      clickMode('shortBreak');
      expect(getTimeText()).toBe('05:00');
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('shortBreak');
    });

    it('switches to long break and resets time to 15:00', () => {
      clickMode('longBreak');
      expect(getTimeText()).toBe('15:00');
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('longBreak');
    });

    it('switches back to focus and resets time to 25:00', () => {
      clickMode('shortBreak');
      clickMode('focus');
      expect(getTimeText()).toBe('25:00');
    });

    it('does nothing when clicking already-active mode', () => {
      clickStart();
      vi.advanceTimersByTime(3000);
      clickMode('focus'); // already active — no-op, timer keeps running
      expect(getTimeText()).toBe('24:57');
    });

    it('pauses running timer when switching mode', () => {
      clickStart();
      vi.advanceTimersByTime(5000);
      clickMode('shortBreak');
      expect(getTimeText()).toBe('05:00');
      // Pause button should be hidden (timer was paused by mode switch)
      expect(document.getElementById('pomodoro-pause').style.display).toBe('none');
    });
  });

  /* ── 3. Timer Countdown ────────────────── */

  describe('timer countdown', () => {
    it('counts down by 1 second per tick', () => {
      clickStart();
      expect(getTimeText()).toBe('25:00');
      vi.advanceTimersByTime(1000);
      expect(getTimeText()).toBe('24:59');
      vi.advanceTimersByTime(2000);
      expect(getTimeText()).toBe('24:57');
    });

    it('updates progress ring as time decreases', () => {
      clickStart();
      expect(getProgressOffset()).toBe('0');
      vi.advanceTimersByTime(60000); // 1 minute
      const offset = parseFloat(getProgressOffset());
      expect(offset).toBeGreaterThan(0); // ring should be shrinking
    });

    it('pauses and resumes correctly', () => {
      clickStart();
      vi.advanceTimersByTime(3000);
      expect(getTimeText()).toBe('24:57');
      clickPause();
      vi.advanceTimersByTime(5000);
      expect(getTimeText()).toBe('24:57'); // unchanged while paused
      clickStart();
      vi.advanceTimersByTime(2000);
      expect(getTimeText()).toBe('24:55');
    });

    it('resets to full duration for current mode', () => {
      clickStart();
      vi.advanceTimersByTime(10000);
      clickReset();
      expect(getTimeText()).toBe('25:00');
      expect(document.getElementById('pomodoro-pause').style.display).toBe('none');
    });

    it('resets to correct duration for non-focus mode', () => {
      clickMode('shortBreak');
      clickStart();
      vi.advanceTimersByTime(3000);
      clickReset();
      expect(getTimeText()).toBe('05:00');
    });

    it('idempotent start button clicks do not create multiple intervals', () => {
      clickStart();
      clickStart(); // second click should be ignored
      vi.advanceTimersByTime(1000);
      expect(getTimeText()).toBe('24:59');
      vi.advanceTimersByTime(1000);
      expect(getTimeText()).toBe('24:58');
    });
  });

  /* ── 4. Auto-Advance ───────────────────── */

  describe('auto-advance', () => {
    it('switches to short break after focus ends', () => {
      clickStart();
      // Advance to end of 25 min
      vi.advanceTimersByTime(25 * 60 * 1000);
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('shortBreak');
      expect(getTimeText()).toBe('05:00');
    });

    it('switches to focus after short break ends', () => {
      clickMode('shortBreak');
      clickStart();
      vi.advanceTimersByTime(5 * 60 * 1000);
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('focus');
      expect(getTimeText()).toBe('25:00');
    });

    it('switches to long break after 4th focus session', () => {
      // Complete 3 focus sessions (each followed by short break)
      for (let i = 0; i < 3; i++) {
        clickStart();
        vi.advanceTimersByTime(25 * 60 * 1000); // focus ends → auto short break
        vi.advanceTimersByTime(5 * 60 * 1000);  // short break ends → auto focus
      }
      // Now start the 4th focus and complete it
      clickStart();
      vi.advanceTimersByTime(25 * 60 * 1000);
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('longBreak');
      expect(getTimeText()).toBe('15:00');
    });

    it('switches to focus after long break ends', () => {
      // Complete 4 focus sessions to trigger long break
      for (let i = 0; i < 3; i++) {
        clickStart();
        vi.advanceTimersByTime(25 * 60 * 1000);
        vi.advanceTimersByTime(5 * 60 * 1000);
      }
      clickStart();
      vi.advanceTimersByTime(25 * 60 * 1000); // → long break
      vi.advanceTimersByTime(15 * 60 * 1000); // long break ends → focus
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('focus');
      expect(getTimeText()).toBe('25:00');
    });

    it('auto-starts the next session after advancing', () => {
      clickStart();
      vi.advanceTimersByTime(25 * 60 * 1000); // → short break, auto-started
      expect(document.getElementById('pomodoro-pause').style.display).toBe('');
      vi.advanceTimersByTime(1000);
      expect(getTimeText()).toBe('04:59');
    });
  });

  /* ── 5. Session Dots ───────────────────── */

  describe('session dots', () => {
    it('shows 0 dots after init', () => {
      expect(getFilledDots()).toBe(0);
    });

    it('shows 1 dot after 1 completed focus', () => {
      clickStart();
      vi.advanceTimersByTime(25 * 60 * 1000);
      expect(getFilledDots()).toBe(1);
    });

    it('shows 3 dots after 3 completed focus sessions', () => {
      for (let i = 0; i < 3; i++) {
        clickStart();
        vi.advanceTimersByTime(25 * 60 * 1000); // focus → short break
        vi.advanceTimersByTime(5 * 60 * 1000);  // short break → focus
      }
      expect(getFilledDots()).toBe(3);
    });

    it('resets dots after long break (4 completions mod 4 = 0)', () => {
      for (let i = 0; i < 3; i++) {
        clickStart();
        vi.advanceTimersByTime(25 * 60 * 1000);
        vi.advanceTimersByTime(5 * 60 * 1000);
      }
      clickStart();
      vi.advanceTimersByTime(25 * 60 * 1000); // → long break (4th done)
      vi.advanceTimersByTime(15 * 60 * 1000); // long break → focus
      expect(getFilledDots()).toBe(0);
    });
  });

  /* ── 6. localStorage Persistence ───────── */

  describe('persistence', () => {
    it('saves state to localStorage on tick', () => {
      clickStart();
      vi.advanceTimersByTime(3000);
      const saved = JSON.parse(localStorage.getItem('ziqi-pomodoro-state'));
      expect(saved.mode).toBe('focus');
      expect(saved.remainingSeconds).toBe(25 * 60 - 3);
      expect(saved.startedAt).toBeTruthy();
    });

    it('saves paused state', () => {
      clickStart();
      vi.advanceTimersByTime(5000);
      clickPause();
      const saved = JSON.parse(localStorage.getItem('ziqi-pomodoro-state'));
      expect(saved.startedAt).toBeNull();
      expect(saved.remainingSeconds).toBe(25 * 60 - 5);
    });

    it('recovers running timer after re-init', () => {
      clickStart();
      vi.advanceTimersByTime(10000); // 10 ticks → remaining: 1490
      // Simulate 5 min passing by rolling back startedAt
      const saved = JSON.parse(localStorage.getItem('ziqi-pomodoro-state'));
      expect(saved.remainingSeconds).toBe(25 * 60 - 10);
      // Pretend timer started 5 min earlier → loadState will subtract 300s
      saved.startedAt = Date.now() - 5 * 60 * 1000;
      localStorage.setItem('ziqi-pomodoro-state', JSON.stringify(saved));

      initPomodoro(); // re-init simulates page reload
      // 25*60 - 10 - 300 = 1190s = 19:50
      expect(getTimeText()).toBe('19:50');
    });

    it('handles timer finishing while "closed"', () => {
      clickStart();
      vi.advanceTimersByTime(5000);
      // Jump forward past the end
      vi.setSystemTime(new Date('2026-06-14T13:00:00'));
      initPomodoro(); // re-init
      // Should have advanced to short break
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('shortBreak');
    });

    it('falls back to default state on corrupted localStorage', () => {
      localStorage.setItem('ziqi-pomodoro-state', 'not-json{');
      vi.setSystemTime(new Date('2026-06-14T12:00:00'));
      initPomodoro();
      expect(getTimeText()).toBe('25:00');
      const activeMode = document.querySelector('.pomodoro-mode-btn.active');
      expect(activeMode.getAttribute('data-mode')).toBe('focus');
    });

    it('falls back on missing mode in saved state', () => {
      localStorage.setItem('ziqi-pomodoro-state', JSON.stringify({ remainingSeconds: 100 }));
      vi.setSystemTime(new Date('2026-06-14T12:00:00'));
      initPomodoro();
      expect(getTimeText()).toBe('25:00');
    });
  });

  /* ── 7. Page Switching ─────────────────── */

  describe('page switching', () => {
    it('switchToPage activates pomodoro page', () => {
      switchToPage('pomodoro');
      const pomoPage = document.querySelector('.page--pomodoro');
      const mainPage = document.querySelector('.page--main');
      expect(pomoPage.classList.contains('page--active')).toBe(true);
      expect(mainPage.classList.contains('page--active')).toBe(false);
    });

    it('switchToPage activates main page', () => {
      switchToPage('pomodoro');
      switchToPage('main');
      const pomoPage = document.querySelector('.page--pomodoro');
      const mainPage = document.querySelector('.page--main');
      expect(pomoPage.classList.contains('page--active')).toBe(false);
      expect(mainPage.classList.contains('page--active')).toBe(true);
    });

    it('adds fadeInRight when entering pomodoro, fadeInLeft when returning to main', () => {
      switchToPage('pomodoro');
      const pomoPage = document.querySelector('.page--pomodoro');
      expect(pomoPage.classList.contains('animate__animated')).toBe(true);
      expect(pomoPage.classList.contains('animate__fadeInRight')).toBe(true);

      // Dispatch animationend to clean up before switching back
      pomoPage.dispatchEvent(new Event('animationend'));
      switchToPage('main');
      const mainPage = document.querySelector('.page--main');
      expect(mainPage.classList.contains('animate__animated')).toBe(true);
      expect(mainPage.classList.contains('animate__fadeInLeft')).toBe(true);
    });

    it('removes animation classes after animationend', () => {
      switchToPage('pomodoro');
      const pomoPage = document.querySelector('.page--pomodoro');
      // Dispatch animationend
      pomoPage.dispatchEvent(new Event('animationend'));
      expect(pomoPage.classList.contains('animate__animated')).toBe(false);
      expect(pomoPage.classList.contains('animate__fadeInRight')).toBe(false);
    });

    it('no-ops when switching to already-active page', () => {
      const mainPage = document.querySelector('.page--main');
      expect(mainPage.classList.contains('page--active')).toBe(true);
      switchToPage('main');
      expect(mainPage.classList.contains('page--active')).toBe(true);
    });

    it('toggle button gets active class on pomodoro page', () => {
      const toggleBtn = document.getElementById('pomodoro-toggle');
      switchToPage('pomodoro');
      expect(toggleBtn.classList.contains('active')).toBe(true);
      switchToPage('main');
      expect(toggleBtn.classList.contains('active')).toBe(false);
    });

    it('toggle button click switches pages', () => {
      const toggleBtn = document.getElementById('pomodoro-toggle');
      toggleBtn.click();
      expect(document.querySelector('.page--pomodoro').classList.contains('page--active')).toBe(true);
      toggleBtn.click();
      expect(document.querySelector('.page--main').classList.contains('page--active')).toBe(true);
    });
  });

  /* ── 8. Edge Cases ─────────────────────── */

  describe('edge cases', () => {
    it('does not create negative remainingSeconds when finishing', () => {
      clickMode('shortBreak');
      clickStart();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 1s past end
      // Timer should have advanced and display positive time
      const timeParts = getTimeText().split(':');
      const minutes = parseInt(timeParts[0], 10);
      const seconds = parseInt(timeParts[1], 10);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeGreaterThanOrEqual(0);
    });

    it('handles rapid mode switching without errors', () => {
      clickMode('shortBreak');
      clickMode('longBreak');
      clickMode('focus');
      clickMode('shortBreak');
      expect(getTimeText()).toBe('05:00');
    });

    it('handles rapid reset without errors', () => {
      clickStart();
      vi.advanceTimersByTime(3000);
      clickReset();
      clickReset();
      clickReset();
      expect(getTimeText()).toBe('25:00');
    });

    it('updateDisplay works when pomodoro page is hidden', () => {
      // Switch to main page (pomodoro hidden)
      switchToPage('main');
      // Timer operations should not throw
      clickMode('shortBreak');
      clickStart();
      vi.advanceTimersByTime(2000);
      expect(getTimeText()).toBe('04:58');
    });
  });
});
