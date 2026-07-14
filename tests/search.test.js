/**
 * Search — default engine selection and search navigation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCurrentEngine, initSearch, destroySearch, setCurrentEngine } from '../js/search.js';

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
    localStorage.removeItem('ziqi-engine');
    initSearch();
    expect(getCurrentEngine().id).toBe('google');
  });

  it('restores saved engine from localStorage', () => {
    localStorage.setItem('ziqi-engine', 'bing');
    initSearch();
    expect(getCurrentEngine().id).toBe('bing');
  });

  it('ignores invalid saved engine value', () => {
    localStorage.setItem('ziqi-engine', 'nonexistent');
    initSearch();
    expect(getCurrentEngine().id).toBe('google');
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
    setCurrentEngine('bing');

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

  // ── Tab Keyboard ────────────────────────

  it('does not switch normal engines on a single Tab when input is focused', () => {
    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true }));
    expect(getCurrentEngine().id).toBe('google');
  });

  it('does not switch normal engines on Shift+Tab when input is focused', () => {
    const input = document.getElementById('search-input');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(getCurrentEngine().id).toBe('google');
  });

  it('puts the matching AI shortcut ahead of normal suggestions', async () => {
    queueSuggestionResponse(['gpt login']);
    const input = document.getElementById('search-input');
    input.value = 'gpt';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(200);
    await Promise.resolve();

    const items = document.querySelectorAll('.search-suggestion');
    expect(items[0]?.textContent).toBe('按 Tab 使用 ChatGPT');
    expect(items[1]?.textContent).toBe('gpt login');
  });

  it('activates an AI site on Tab after its complete shortcut', () => {
    const input = document.getElementById('search-input');
    input.value = 'ds';
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.getElementById('ai-search-chip-name').textContent).toBe('DeepSeek');
    expect(document.getElementById('ai-search-chip').hasAttribute('hidden')).toBe(false);
    expect(input.value).toBe('');
  });

  it('navigates with the active AI URL template on Enter', () => {
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = document.getElementById('search-input');
    input.value = 'gpt';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    input.value = 'hello ai';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(captured.href).toBe('https://chatgpt.com/?hints=search&ref=ext&q=hello%20ai');
    window.location = origLoc;
  });

  it('does not activate AI search for a partial shortcut', () => {
    const input = document.getElementById('search-input');
    input.value = 'g';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.getElementById('ai-search-chip').hasAttribute('hidden')).toBe(true);
  });

  // ── engines-changed Event ───────────────

  it('falls back to Google when current engine is deleted via engines-changed', () => {
    addCustomEngine('kagi-test', 'Kagi', 'https://kagi.com/search?q=');
    setCurrentEngine('kagi-test');

    localStorage.setItem('ziqi-engines', '[]');
    window.dispatchEvent(new CustomEvent('engines-changed'));

    expect(getCurrentEngine().id).toBe('google');
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

    it('does not activate AI search while a normal suggestion is open', async () => {
      queueSuggestionResponse(['alpha', 'beta']);

      const input = await typeAndFlushSuggestions('a');
      input.focus();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

      expect(document.getElementById('ai-search-chip').hasAttribute('hidden')).toBe(true);
      expect(getCurrentEngine().id).toBe('google');
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
      setCurrentEngine('bing');

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
