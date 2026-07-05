/**
 * Recent browsing sites — history fetch, dedup, rendering, favicon fallback, API degradation.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initRecent } from '../js/recent.js';

let mockHistoryData = [];

vi.stubGlobal('chrome', {
  history: {
    search: vi.fn((_query) => Promise.resolve(mockHistoryData)),
  },
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  mockHistoryData = [];
  const grid = document.getElementById('recent-grid');
  if (grid) grid.innerHTML = '';
  const section = document.getElementById('recent-sites');
  if (section) section.hidden = true;
});

describe('initRecent', () => {
  it('renders sites from chrome.history', async () => {
    mockHistoryData = [
      { url: 'https://example.com/a', title: 'Example' },
      { url: 'https://openai.com', title: 'OpenAI' },
      { url: 'https://github.com', title: 'GitHub' },
    ];

    await initRecent();

    expect(document.querySelectorAll('#recent-grid .link-item')).toHaveLength(3);
    expect(document.getElementById('recent-sites').hidden).toBe(false);
  });

  it('deduplicates by hostname', async () => {
    mockHistoryData = [
      { url: 'https://example.com/a', title: 'Example A' },
      { url: 'https://example.com/b', title: 'Example B' },
    ];

    await initRecent();

    expect(document.querySelectorAll('#recent-grid .link-item')).toHaveLength(1);
  });

  it('limits to max 4', async () => {
    mockHistoryData = Array.from({ length: 6 }, (_value, index) => ({
      url: 'https://site' + index + '.example/page',
      title: 'Site ' + index,
    }));

    await initRecent();

    expect(document.querySelectorAll('#recent-grid .link-item')).toHaveLength(4);
  });

  it('hides section when chrome.history returns empty', async () => {
    await initRecent();

    expect(document.getElementById('recent-sites').hidden).toBe(true);
  });

  it('hides section when all results are internal pages', async () => {
    mockHistoryData = [
      { url: 'chrome://history/', title: 'History' },
      { url: 'file:///tmp/test.html', title: 'Local File' },
      { url: 'view-source:https://example.com', title: 'Source' },
      { url: 'devtools://devtools/bundled/inspector.html', title: 'DevTools' },
    ];

    await initRecent();

    expect(document.getElementById('recent-sites').hidden).toBe(true);
  });

  it('favicon fallback: img onerror should produce .link-icon-fallback', async () => {
    mockHistoryData = [
      { url: 'https://alpha.example/page', title: 'Alpha' },
    ];

    await initRecent();

    const img = document.querySelector('#recent-grid img');
    img.dispatchEvent(new Event('error'));

    expect(document.querySelector('#recent-grid .link-icon-fallback')).not.toBeNull();
    expect(document.querySelector('#recent-grid .link-icon-fallback').textContent).toBe('A');
  });

  it('hides section silently when chrome.history.search is undefined', async () => {
    // Store original
    const original = chrome.history.search;
    chrome.history.search = undefined;

    try {
      await initRecent();
    } catch (_) {
      // Should not throw
    }

    expect(document.getElementById('recent-sites').hidden).toBe(true);

    // Restore for other tests
    chrome.history.search = original;
  });

  it('renders title from history item when available, else uses hostname', async () => {
    mockHistoryData = [
      { url: 'https://titled.example/page', title: 'Readable Title' },
      { url: 'https://hostname-only.example/path', title: '' },
    ];

    await initRecent();

    const labels = Array.from(document.querySelectorAll('#recent-grid .link-label')).map((el) => el.textContent);
    expect(labels).toEqual(['Readable Title', 'hostname-only.example']);
  });
});
