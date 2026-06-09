/**
 * Theme — system preference detection, manual toggle, localStorage persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initTheme, getCurrentTheme, toggleTheme } from '../js/theme.js';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  // ── initTheme ──────────────────────────

  it('uses light by default when no system preference is dark', () => {
    window.matchMedia = (q) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    const theme = initTheme();
    expect(theme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('follows system dark preference when no saved choice exists', () => {
    window.matchMedia = (q) => ({
      matches: q.includes('dark'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });

    const theme = initTheme();
    expect(theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('restores saved dark theme from localStorage', () => {
    localStorage.setItem('ziqi-theme', 'dark');
    const theme = initTheme();
    expect(theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('restores saved light theme from localStorage', () => {
    localStorage.setItem('ziqi-theme', 'dark');
    toggleTheme(); // now light
    localStorage.setItem('ziqi-theme', 'light');
    const theme = initTheme();
    expect(theme).toBe('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  // ── toggleTheme ────────────────────────

  it('toggles from light to dark', () => {
    expect(getCurrentTheme()).toBe('light');
    const next = toggleTheme();
    expect(next).toBe('dark');
    expect(getCurrentTheme()).toBe('dark');
    expect(localStorage.getItem('ziqi-theme')).toBe('dark');
  });

  it('toggles from dark to light', () => {
    toggleTheme(); // → dark
    const next = toggleTheme(); // → light
    expect(next).toBe('light');
    expect(getCurrentTheme()).toBe('light');
    expect(localStorage.getItem('ziqi-theme')).toBe('light');
  });

  // ── getCurrentTheme ────────────────────

  it('returns light when data-theme is absent', () => {
    document.documentElement.removeAttribute('data-theme');
    expect(getCurrentTheme()).toBe('light');
  });

  it('returns dark when data-theme is dark', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(getCurrentTheme()).toBe('dark');
  });
});
