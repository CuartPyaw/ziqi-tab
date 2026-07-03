/**
 * Search — engine selection, menu open/close, search navigation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initSearch, destroySearch } from '../js/search.js';

describe('search', () => {
  afterEach(() => {
    delete globalThis.chrome;
  });

  beforeEach(() => {
    // Remove event listeners from the previous test so initSearch starts clean
    destroySearch();

    localStorage.clear();
    // Force Google as the default engine for a clean baseline
    localStorage.setItem('ziqi-engine', 'google');
    document.getElementById('engine-icon').src = '';
    document.getElementById('engine-menu').setAttribute('hidden', '');
    document.getElementById('engine-backdrop').setAttribute('hidden', '');
    document.getElementById('engine-chevron-btn').classList.remove('open');
    initSearch();
  });

  function addCustomEngine(id, name, url) {
    const existing = JSON.parse(localStorage.getItem('ziqi-engines') || '[]');
    existing.push({ id, name, url, builtin: false });
    localStorage.setItem('ziqi-engines', JSON.stringify(existing));
    const order = JSON.parse(localStorage.getItem('ziqi-engine-order') || '["google","bing","duckduckgo"]');
    order.push(id);
    localStorage.setItem('ziqi-engine-order', JSON.stringify(order));
  }

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

  it('opens menu when the current engine icon is clicked', () => {
    document.getElementById('engine-icon-btn').click();
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('engine-backdrop').hasAttribute('hidden')).toBe(false);
  });

  it('closes menu when backdrop is clicked', () => {
    document.getElementById('engine-icon-btn').click();
    document.getElementById('engine-backdrop').click();
    // jsdom doesn't fire CSS animationend, so fire it manually
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(true);
  });

  it('closes menu on Escape key', () => {
    document.getElementById('engine-icon-btn').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(true);
  });

  it('keeps the legacy chevron trigger hidden', () => {
    const chevron = document.getElementById('engine-chevron-btn');
    expect(chevron.hasAttribute('hidden')).toBe(true);
    expect(chevron.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders icon-only engine options in the menu on open', () => {
    document.getElementById('engine-icon-btn').click();
    const options = document.querySelectorAll('.engine-option');
    expect(options.length).toBe(3);
    expect(options[0].textContent).not.toContain('Google');
    expect(options[1].textContent).not.toContain('Bing');
    expect(options[2].textContent).not.toContain('DuckDuckGo');
    expect(options[0].getAttribute('aria-label')).toBe('Google');
    expect(options[1].getAttribute('aria-label')).toBe('Bing');
    expect(options[2].getAttribute('aria-label')).toBe('DuckDuckGo');
  });

  it('highlights the current engine in the menu', () => {
    document.getElementById('engine-icon-btn').click();
    const selected = document.querySelector('.engine-option.selected');
    expect(selected).not.toBeNull();
    // The first (Google) option should be selected after a fresh init
    expect(selected.getAttribute('data-value')).toBe('google');
  });

  // ── Engine Selection ───────────────────

  it('switches engine when a menu option is clicked', () => {
    document.getElementById('engine-icon-btn').click();

    // Click the Bing option
    const bingOption = document.querySelector('[data-value="bing"]');
    bingOption.click();
    // selectEngine calls closeMenu which waits for animationend
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));

    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/bing\.svg$/);
    expect(localStorage.getItem('ziqi-engine')).toBe('bing');
  });

  it('selecting an engine closes the menu', () => {
    document.getElementById('engine-icon-btn').click();
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
    document.getElementById('engine-icon-btn').click();
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

  // ── Engine Cycling ──────────────────────

  it('opens the menu without cycling when icon button is clicked', () => {
    document.getElementById('engine-icon-btn').click();
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
    expect(localStorage.getItem('ziqi-engine')).toBe('google');
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(false);
  });

  it('keeps keyboard cycling after selecting the last engine', () => {
    // Select duckduckgo via menu to set the internal state
    document.getElementById('engine-icon-btn').click();
    document.querySelector('[data-value="duckduckgo"]').click();
    document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));

    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }));
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  it('opens the menu when only one engine exists', () => {
    localStorage.setItem('ziqi-engine-order', '["google"]');
    initSearch();
    document.getElementById('engine-icon-btn').click();
    expect(localStorage.getItem('ziqi-engine')).toBe('google');
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(false);
  });

  // ── Tab Keyboard ────────────────────────

  it('switches to next engine on Tab when input is focused', () => {
    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }));
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/bing\.svg$/);
  });

  it('switches to previous engine on Shift+Tab when input is focused', () => {
    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/duckduckgo\.svg$/);
  });

  // ── Custom Engines ──────────────────────

  it('shows custom engines in the menu', () => {
    addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
    document.getElementById('engine-icon-btn').click();
    const options = document.querySelectorAll('.engine-option');
    expect(options.length).toBe(4);
    expect(options[3].textContent).not.toContain('Kagi');
    expect(options[3].getAttribute('aria-label')).toBe('Kagi');
    expect(options[3].querySelector('.engine-edit-btn')).toBeNull();
    expect(options[3].querySelector('.engine-delete-btn')).toBeNull();
  });

  it('shows a colored icon for the current custom engine when its domain can be resolved', () => {
    addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
    localStorage.setItem('ziqi-engine', 'kagi-test');
    initSearch();

    const icon = document.getElementById('engine-icon');
    const letter = document.getElementById('engine-letter');

    expect(icon.getAttribute('src')).toContain('cdn.simpleicons.org/kagi');
    expect(icon.hasAttribute('hidden')).toBe(false);
    expect(letter.hasAttribute('hidden')).toBe(true);
  });

  it('shows a colored icon for custom engines in the menu when their domain can be resolved', () => {
    addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
    document.getElementById('engine-icon-btn').click();

    const customOptionIcon = document.querySelector('[data-value="kagi-test"] .engine-option-icon');
    expect(customOptionIcon).not.toBeNull();
    expect(customOptionIcon.getAttribute('src')).toContain('cdn.simpleicons.org/kagi');
  });

  it('uses Chrome favicon URLs for custom engine icons inside the extension', () => {
    globalThis.chrome = {
      runtime: {
        getURL: (path) => `chrome-extension://test${path}`,
      },
    };
    addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
    localStorage.setItem('ziqi-engine', 'kagi-test');
    initSearch();

    const icon = document.getElementById('engine-icon');

    expect(icon.getAttribute('src')).toContain('/_favicon/?pageUrl=');
    expect(icon.getAttribute('src')).toContain(encodeURIComponent('https://kagi.com/search?q='));
  });

  it('falls back to a colored letter badge when a custom engine URL cannot be resolved', () => {
    addCustomEngine('bad-test', 'Brave', 'not-a-url');
    localStorage.setItem('ziqi-engine', 'bad-test');
    initSearch();

    const icon = document.getElementById('engine-icon');
    const letter = document.getElementById('engine-letter');

    expect(icon.hasAttribute('hidden')).toBe(true);
    expect(letter.hasAttribute('hidden')).toBe(false);
    expect(letter.textContent).toBe('B');
    expect(letter.style.backgroundColor).not.toBe('');
  });

  // ── engines-changed Event ───────────────

  it('falls back to Google when current engine is deleted via engines-changed', () => {
    addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
    localStorage.setItem('ziqi-engine', 'kagi-test');
    initSearch();

    localStorage.setItem('ziqi-engines', '[]');
    window.dispatchEvent(new CustomEvent('engines-changed'));

    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });
});
