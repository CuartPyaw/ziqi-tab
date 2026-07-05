/**
 * Search — engine selection, menu open/close, search navigation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initSearch, destroySearch } from '../js/search.js';

describe('search', () => {
  let fetchMock;
  let sendMessageMock;

  afterEach(() => {
    delete globalThis.chrome;
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    sendMessageMock = vi.fn();
    globalThis.chrome = {
      runtime: {
        sendMessage: sendMessageMock,
      },
    };
    document.getElementById('search-suggestions').setAttribute('hidden', '');
    document.getElementById('search-suggestion-list').innerHTML = '';
    navigator.clipboard.writeText.mockClear?.();

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

  function queueSuggestionResponse(suggestions) {
    sendMessageMock.mockResolvedValueOnce({
      suggestions,
    });
  }

  async function typeAndFlushSuggestions(value) {
    const input = document.getElementById('search-input');
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(200);
    await Promise.resolve();
    return input;
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

  // ── Engine Menu / Tab Shortcut ──────────

  it('opens the menu without cycling when icon button is clicked', () => {
    document.getElementById('engine-icon-btn').click();
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
    expect(localStorage.getItem('ziqi-engine')).toBe('google');
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(false);
  });

  it('opens the menu when only one engine exists', () => {
    localStorage.setItem('ziqi-engine-order', '["google"]');
    initSearch();
    document.getElementById('engine-icon-btn').click();
    expect(localStorage.getItem('ziqi-engine')).toBe('google');
    expect(document.getElementById('engine-menu').hasAttribute('hidden')).toBe(false);
  });

  // ── Tab Keyboard ────────────────────────

  it('does not switch normal engines on a single Tab when input is focused', () => {
    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }));
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  it('does not switch normal engines on Shift+Tab when input is focused', () => {
    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  it('opens AI search on a quick double Tab', async () => {
    const input = document.getElementById('search-input');
    input.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await vi.advanceTimersByTimeAsync(150);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    const items = document.querySelectorAll('.search-suggestion');
    expect(document.getElementById('search-suggestions').hasAttribute('hidden')).toBe(false);
    expect(items[0]?.textContent).toBe('AI 智能搜索 · DeepSeek');
    expect(items[1]?.textContent).toBe('AI 智能搜索 · ChatGPT');
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });

  it('uses DeepSeek by default when Enter is pressed with AI search open', async () => {
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = document.getElementById('search-input');
    input.value = 'hello ai';
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await vi.advanceTimersByTimeAsync(150);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(captured.href).toBe('https://chat.deepseek.com/');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello ai');
    window.location = origLoc;
  });

  it('cycles AI targets with Tab once the AI search panel is open', async () => {
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = document.getElementById('search-input');
    input.value = 'compare models';
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await vi.advanceTimersByTimeAsync(150);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(document.querySelector('.search-suggestion.is-highlighted')?.textContent).toBe('AI 智能搜索 · ChatGPT');
    expect(captured.href).toBe('https://chatgpt.com/?q=compare%20models');
    window.location = origLoc;
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
        sendMessage: sendMessageMock,
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

  // ── Search Suggestions ───────────────────

  describe('search suggestions', () => {
    it('renders suggestions for non-empty input', async () => {
      queueSuggestionResponse(['hello', 'hello kitty']);

      await typeAndFlushSuggestions('hel');

      const panel = document.getElementById('search-suggestions');
      const items = document.querySelectorAll('.search-suggestion');

      expect(sendMessageMock).toHaveBeenCalledTimes(1);
      expect(sendMessageMock).toHaveBeenCalledWith({
        type: 'ziqi:get-search-suggestions',
        query: 'hel',
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(panel.hasAttribute('hidden')).toBe(false);
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toBe('hello');
    });

    it('inserts AI search entries before normal suggestions after double Tab', async () => {
      queueSuggestionResponse(['hello', 'hello kitty']);

      const input = await typeAndFlushSuggestions('hel');
      input.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      await vi.advanceTimersByTimeAsync(150);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      const items = document.querySelectorAll('.search-suggestion');
      expect(items).toHaveLength(4);
      expect(items[0].textContent).toBe('AI 智能搜索 · DeepSeek');
      expect(items[1].textContent).toBe('AI 智能搜索 · ChatGPT');
      expect(items[2].textContent).toBe('hello');
      expect(items[3].textContent).toBe('hello kitty');
    });

    it('hides suggestions for blank input without calling fetch', async () => {
      const input = document.getElementById('search-input');
      input.value = '   ';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(document.getElementById('search-suggestions').hasAttribute('hidden')).toBe(true);
    });

    it('uses the highlighted suggestion on Enter', async () => {
      queueSuggestionResponse(['hello', 'hello world']);

      const origLoc = window.location;
      delete window.location;
      const captured = { href: '' };
      window.location = captured;

      const input = await typeAndFlushSuggestions('hel');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(captured.href).toBe('https://www.google.com/search?q=hello');
      window.location = origLoc;
    });

    it('uses Tab to browse suggestions instead of cycling engines while the panel is open', async () => {
      queueSuggestionResponse(['alpha', 'beta']);

      const input = await typeAndFlushSuggestions('a');
      input.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(document.querySelector('.search-suggestion.is-highlighted')?.textContent).toBe('alpha');
      expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
    });

    it('ignores stale suggestion responses', async () => {
      let resolveFirst;
      let resolveSecond;

      sendMessageMock
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
        .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

      const input = document.getElementById('search-input');
      input.value = 'a';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      input.value = 'ab';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(200);

      resolveSecond({ suggestions: ['abacus'] });
      await Promise.resolve();
      resolveFirst({ suggestions: ['apple'] });
      await Promise.resolve();

      const items = document.querySelectorAll('.search-suggestion');
      expect(items).toHaveLength(1);
      expect(items[0].textContent).toBe('abacus');
    });

    it('searches with the selected engine after choosing a suggestion', async () => {
      document.getElementById('engine-icon-btn').click();
      document.querySelector('[data-value="bing"]').click();
      document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));

      queueSuggestionResponse(['weather today']);

      const origLoc = window.location;
      delete window.location;
      const captured = { href: '' };
      window.location = captured;

      const input = await typeAndFlushSuggestions('weather');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(captured.href).toBe('https://www.bing.com/search?q=weather%20today');
      window.location = origLoc;
    });
  });
});
