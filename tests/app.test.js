import { beforeEach, describe, expect, it } from 'vitest';
import { initContentView, destroyContentView } from '../js/app.js';

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

    // Button state, panel reveal, and animation classes apply immediately —
    // they do not wait for the animation to finish.
    expect(linksButton.classList.contains('is-active')).toBe(false);
    expect(bookmarksButton.classList.contains('is-active')).toBe(true);
    expect(bookmarksSection.hidden).toBe(false);
    expect(quickLinks.classList.contains('content-slide-out-to-left')).toBe(true);
    expect(bookmarksSection.classList.contains('content-slide-in-from-right')).toBe(true);
    expect(quickLinks.hidden).toBe(false); // still present until animationend

    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(quickLinks.hidden).toBe(true);
    expect(quickLinks.style.display).toBe('none');
    expect(bookmarksSection.hidden).toBe(false);
    expect(bookmarksSection.style.display).toBe('');
    expect(quickLinks.classList.contains('content-slide-out-to-left')).toBe(false);
    expect(bookmarksSection.classList.contains('content-slide-in-from-right')).toBe(false);
  });

  it('animates bookmarks back to links with the reverse slide direction', () => {
    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

    bookmarksButton.click();
    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    linksButton.click();

    expect(bookmarksSection.classList.contains('content-slide-out-to-right')).toBe(true);
    expect(quickLinks.classList.contains('content-slide-in-from-left')).toBe(true);

    quickLinks.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.hidden).toBe(true);
    expect(quickLinks.hidden).toBe(false);
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

    bookmarksSection.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(bookmarksSection.hidden).toBe(false);
    expect(quickLinks.hidden).toBe(true);
  });

  it('ignores a click on the already-active button', () => {
    const quickLinks = document.getElementById('quick-links');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');

    linksButton.click();

    expect(linksButton.classList.contains('is-active')).toBe(true);
    expect(quickLinks.classList.contains('content-slide-out-to-left')).toBe(false);
    expect(quickLinks.classList.contains('content-slide-out-to-right')).toBe(false);
  });

  it('positions the sliding pill behind the active button on init and after switching', () => {
    const pill = document.getElementById('content-switcher-pill');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

    expect(pill.style.width).toBe(`${linksButton.offsetWidth}px`);
    expect(pill.style.transform).toBe(`translateX(${linksButton.offsetLeft}px)`);

    bookmarksButton.click();

    expect(pill.style.width).toBe(`${bookmarksButton.offsetWidth}px`);
    expect(pill.style.transform).toBe(`translateX(${bookmarksButton.offsetLeft}px)`);
  });
});
