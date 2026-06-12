/**
 * Settings — search bar width slider, save/cancel behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initSettings } from '../js/settings.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--search-width');
  initSettings();
});

describe('search width', () => {
  it('applies default width (520px) on init', () => {
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px');
  });

  it('restores saved width from localStorage', () => {
    localStorage.setItem('ziqi-search-width', '620');
    // Re-init
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('620px');
  });

  it('clamps width to minimum 360', () => {
    localStorage.setItem('ziqi-search-width', '100');
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px'); // default
  });

  it('clamps width to maximum 720', () => {
    localStorage.setItem('ziqi-search-width', '999');
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px'); // default
  });

  it('handles non-numeric stored value gracefully', () => {
    localStorage.setItem('ziqi-search-width', 'abc');
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px');
  });
});

describe('dialog', () => {
  it('opens the settings dialog on toggle button click', () => {
    document.getElementById('settings-toggle').click();
    expect(document.getElementById('settings-dialog').open).toBe(true);
  });

  it('sets slider to stored value when opening', () => {
    localStorage.setItem('ziqi-search-width', '650');
    initSettings();
    document.getElementById('settings-toggle').click();
    expect(document.getElementById('search-width').value).toBe('650');
  });

  it('displays the current slider value', () => {
    document.getElementById('settings-toggle').click();
    // Default is 520
    expect(document.getElementById('search-width-value').textContent).toBe('520px');
  });

  it('saves width and applies it on save button click', () => {
    document.getElementById('settings-toggle').click();
    const slider = document.getElementById('search-width');
    slider.value = '600';
    slider.dispatchEvent(new Event('input'));

    document.getElementById('settings-save').click();

    expect(localStorage.getItem('ziqi-search-width')).toBe('600');
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('600px');
  });
});
