import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initContentView, destroyContentView, initBrowserShortcuts, openBrowserUrl } from '../js/app.js';

describe('app bootstrap', () => {
  it('wires up the content view switcher via DOMContentLoaded and applies the default view', () => {
    localStorage.clear();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');

    expect(linksButton.classList.contains('is-active')).toBe(true);
    expect(quickLinks.hidden).toBe(false);
    expect(bookmarksSection.hidden).toBe(true);

    // Clean up so the tests below start from a known state
    destroyContentView();
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
    document.getElementById('history-shortcut').click();

    expect(update).toHaveBeenNthCalledWith(1, { url: 'chrome://extensions/' }, expect.any(Function));
    expect(update).toHaveBeenNthCalledWith(2, { url: 'chrome://history/' }, expect.any(Function));
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

describe('content view switcher transition', () => {
  beforeEach(() => {
    localStorage.clear();
    destroyContentView();

    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const contentStage = document.getElementById('content-stage');
    quickLinks.className = 'quick-links';
    quickLinks.style.display = '';
    bookmarksSection.className = 'bookmarks-section';
    bookmarksSection.style.display = '';
    contentStage.className = 'content-stage';
    contentStage.style.height = '';

    initContentView();
  });

  it('animates links to bookmarks with the forward slide direction, finishing on animationend', () => {
    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

    bookmarksButton.click();

    // Button state updates immediately, but the incoming panel stays hidden
    // until the outgoing panel has faded out. This avoids content ghosting.
    expect(linksButton.classList.contains('is-active')).toBe(false);
    expect(bookmarksButton.classList.contains('is-active')).toBe(true);
    expect(bookmarksSection.hidden).toBe(true);
    expect(quickLinks.classList.contains('content-panel-out')).toBe(true);
    expect(bookmarksSection.classList.contains('content-panel-in')).toBe(false);
    expect(quickLinks.hidden).toBe(false);

    document.getElementById('links-grid').dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.hidden).toBe(true);
    expect(quickLinks.classList.contains('content-panel-out')).toBe(true);

    quickLinks.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(quickLinks.hidden).toBe(true);
    expect(quickLinks.style.display).toBe('none');
    expect(bookmarksSection.hidden).toBe(false);
    expect(bookmarksSection.style.display).toBe('');
    expect(quickLinks.classList.contains('content-panel-out')).toBe(false);
    expect(bookmarksSection.classList.contains('content-panel-in')).toBe(true);

    document.getElementById('bookmarks-grid').dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.classList.contains('content-panel-in')).toBe(true);

    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(quickLinks.hidden).toBe(true);
    expect(quickLinks.style.display).toBe('none');
    expect(bookmarksSection.hidden).toBe(false);
    expect(bookmarksSection.style.display).toBe('');
    expect(quickLinks.classList.contains('content-panel-out')).toBe(false);
    expect(bookmarksSection.classList.contains('content-panel-in')).toBe(false);
  });

  it('animates bookmarks back to links with the reverse slide direction', () => {
    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

    bookmarksButton.click();
    quickLinks.dispatchEvent(new Event('animationend', { bubbles: true }));
    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    linksButton.click();

    expect(bookmarksSection.classList.contains('content-panel-out')).toBe(true);
    expect(quickLinks.classList.contains('content-panel-in')).toBe(false);

    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.hidden).toBe(true);
    expect(quickLinks.hidden).toBe(false);
    expect(quickLinks.classList.contains('content-panel-in')).toBe(true);

    quickLinks.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.hidden).toBe(true);
    expect(quickLinks.hidden).toBe(false);
    expect(quickLinks.classList.contains('content-panel-in')).toBe(false);
  });

  it('ignores a click on the other button while a transition is in flight', () => {
    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

    bookmarksButton.click();
    linksButton.click(); // should be ignored — bookmarks transition still in flight

    expect(bookmarksButton.classList.contains('is-active')).toBe(true);
    expect(linksButton.classList.contains('is-active')).toBe(false);

    quickLinks.dispatchEvent(new Event('animationend', { bubbles: true }));
    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.hidden).toBe(false);
    expect(quickLinks.hidden).toBe(true);
  });

  it('ignores a click on the already-active button', () => {
    const quickLinks = document.getElementById('quick-links');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');

    linksButton.click();

    expect(linksButton.classList.contains('is-active')).toBe(true);
    expect(quickLinks.classList.contains('content-panel-out')).toBe(false);
    expect(quickLinks.classList.contains('content-panel-in')).toBe(false);
  });

  it('positions the sliding pill behind the active button on init and after switching', () => {
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');
    const pill = document.getElementById('content-switcher-pill');

    // jsdom never computes real layout (offsetWidth/offsetLeft are always 0),
    // so give the two buttons distinct fake geometry — otherwise both buttons
    // produce the same '0px'/'translateX(0px)' expectation and the assertions
    // below can't tell "positioned to the right button" from "never ran".
    Object.defineProperty(linksButton, 'offsetWidth', { value: 80, configurable: true });
    Object.defineProperty(linksButton, 'offsetLeft', { value: 3, configurable: true });
    Object.defineProperty(bookmarksButton, 'offsetWidth', { value: 64, configurable: true });
    Object.defineProperty(bookmarksButton, 'offsetLeft', { value: 85, configurable: true });

    destroyContentView();
    initContentView();

    expect(pill.style.width).toBe('80px');
    expect(pill.style.transform).toBe('translateX(3px)');

    bookmarksButton.click();

    expect(pill.style.width).toBe('64px');
    expect(pill.style.transform).toBe('translateX(85px)');
  });

  afterEach(() => {
    const links = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarks = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');
    if (links) {
      // configurable:true descriptors can be deleted to restore inherited defaults
      delete links.offsetWidth;
      delete links.offsetLeft;
    }
    if (bookmarks) {
      delete bookmarks.offsetWidth;
      delete bookmarks.offsetLeft;
    }
  });
});
