import { afterEach, describe, expect, it, vi } from 'vitest';
import { initBrowserShortcuts, openBrowserUrl } from '../js/app.js';

describe('app bootstrap', () => {
  it('keeps quick links as the only content panel on DOMContentLoaded', () => {
    localStorage.clear();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const quickLinks = document.getElementById('quick-links');

    expect(document.getElementById('content-switcher')).toBeNull();
    expect(quickLinks.hidden).toBe(false);
    expect(document.getElementById('bookmarks-section')).toBeNull();
  });
});

describe('browser shortcuts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens chrome internal pages through the tabs API when available', () => {
    const update = vi.fn((_props, callback) => callback?.());
    vi.stubGlobal('chrome', {
      tabs: { update },
      runtime: {},
    });

    initBrowserShortcuts();
    document.getElementById('extensions-shortcut').click();
    document.getElementById('bookmarks-shortcut').click();
    document.getElementById('history-shortcut').click();

    expect(update).toHaveBeenNthCalledWith(1, { url: 'chrome://extensions/' }, expect.any(Function));
    expect(update).toHaveBeenNthCalledWith(2, { url: 'chrome://bookmarks/' }, expect.any(Function));
    expect(update).toHaveBeenNthCalledWith(3, { url: 'chrome://history/' }, expect.any(Function));
  });

  it('falls back to location navigation if the tabs API throws', () => {
    const update = vi.fn(() => {
      throw new Error('tabs unavailable');
    });
    vi.stubGlobal('chrome', {
      tabs: { update },
      runtime: {},
    });

    openBrowserUrl('#browser-shortcut-fallback');

    expect(window.location.hash).toBe('#browser-shortcut-fallback');
    window.history.replaceState(null, '', '/');
  });
});
