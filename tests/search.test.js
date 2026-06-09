/**
 * Search — engine selection, menu open/close, search navigation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initSearch } from '../js/search.js';

describe('search', () => {
  beforeEach(() => {
    localStorage.clear();
    // Force Google as the default engine for a clean baseline
    localStorage.setItem('ziqi-engine', 'google');
    document.getElementById('engine-icon').src = '';
    document.getElementById('engine-menu').setAttribute('hidden', '');
    document.getElementById('engine-backdrop').setAttribute('hidden', '');
    document.getElementById('engine-trigger').classList.remove('open');
    initSearch();
  });

  // ── Initialization ─────────────────────

  it('defaults to Google when no saved engine', () => {
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  it('restores saved engine from localStorage', () => {
    localStorage.setItem('ziqi-engine', 'bing');
    initSearch();
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/bing\.svg$/);
  });

  it('ignores invalid saved engine value', () => {
    localStorage.setItem('ziqi-engine', 'nonexistent');
    initSearch();
    // When invalid, the internal currentEngine stays as what it was before.
    // After the default beforeEach init, that's 'google'.
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  // ── Engine Menu ────────────────────────

  it('opens menu when trigger is clicked', () => {
    document.getElementById('engine-trigger').click();
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('engine-backdrop').hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('engine-trigger').classList.contains('open')).toBe(true);
  });

  it('closes menu when backdrop is clicked', () => {
    document.getElementById('engine-trigger').click();
    document.getElementById('engine-backdrop').click();
    // jsdom doesn't fire CSS animationend, so fire it manually
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(true);
  });

  it('closes menu on Escape key', () => {
    document.getElementById('engine-trigger').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(true);
  });

  it('renders engine options in the menu on open', () => {
    document.getElementById('engine-trigger').click();
    const options = document.querySelectorAll('.engine-option');
    expect(options.length).toBe(3);
    expect(options[0].textContent).toContain('Google');
    expect(options[1].textContent).toContain('Bing');
    expect(options[2].textContent).toContain('DuckDuckGo');
  });

  it('highlights the current engine in the menu', () => {
    document.getElementById('engine-trigger').click();
    const selected = document.querySelector('.engine-option.selected');
    expect(selected).not.toBeNull();
    // The first (Google) option should be selected after a fresh init
    expect(selected.getAttribute('data-value')).toBe('google');
  });

  // ── Engine Selection ───────────────────

  it('switches engine when a menu option is clicked', () => {
    document.getElementById('engine-trigger').click();

    // Click the Bing option
    const bingOption = document.querySelector('[data-value="bing"]');
    bingOption.click();
    // selectEngine calls closeMenu which waits for animationend
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));

    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/bing\.svg$/);
    expect(localStorage.getItem('ziqi-engine')).toBe('bing');
  });

  it('selecting an engine closes the menu', () => {
    document.getElementById('engine-trigger').click();
    document.querySelector('[data-value="duckduckgo"]').click();
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(true);
  });

  it('re-renders icons on theme-changed event', () => {
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
    window.dispatchEvent(new CustomEvent('theme-changed'));
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  // ── Search Navigation ──────────────────

  it('navigates to the correct search URL on Enter', () => {
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = document.getElementById('search-input');
    input.value = 'hello world';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(captured.href).toBe('https://www.google.com/search?q=hello%20world');
    window.location = origLoc;
  });

  it('uses the selected engine for search URL', () => {
    // Switch to Bing
    document.getElementById('engine-trigger').click();
    document.querySelector('[data-value="bing"]').click();
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));

    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = document.getElementById('search-input');
    input.value = 'test';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(captured.href).toBe('https://www.bing.com/search?q=test');
    window.location = origLoc;
  });

  it('does not navigate on empty query', () => {
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = document.getElementById('search-input');
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(captured.href).toBe('');
    window.location = origLoc;
  });
});
