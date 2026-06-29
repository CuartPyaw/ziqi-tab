import { beforeEach, describe, expect, it, vi } from 'vitest';

const emptyBookmarksTree = [{
  id: '0',
  title: '',
  children: [{ id: '1', title: 'Bookmarks Bar', children: [] }],
}];

function createMockChrome() {
  return {
    bookmarks: {
      getTree: vi.fn(cb => cb(emptyBookmarksTree)),
      onCreated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      onChanged: { addListener: vi.fn() },
      onMoved: { addListener: vi.fn() },
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

  const quickLinks = document.getElementById('quick-links');
  const bookmarksSection = document.getElementById('bookmarks-section');
  const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
  const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

  quickLinks.hidden = false;
  quickLinks.style.display = '';
  bookmarksSection.hidden = true;
  bookmarksSection.style.display = '';
  linksButton.classList.add('is-active');
  bookmarksButton.classList.remove('is-active');
});

describe('content view switcher', () => {
  it('keeps quick links and bookmarks visually separated when switching views', async () => {
    vi.stubGlobal('chrome', createMockChrome());

    await import('../js/app.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const quickLinks = document.getElementById('quick-links');
    const bookmarksSection = document.getElementById('bookmarks-section');
    const linksButton = document.querySelector('.content-switcher-btn[data-view="links"]');
    const bookmarksButton = document.querySelector('.content-switcher-btn[data-view="bookmarks"]');

    expect(linksButton.classList.contains('is-active')).toBe(true);
    expect(bookmarksButton.classList.contains('is-active')).toBe(false);
    expect(quickLinks.hidden).toBe(false);
    expect(quickLinks.style.display).toBe('');
    expect(bookmarksSection.hidden).toBe(true);
    expect(quickLinks.getAttribute('hidden')).toBeNull();
    expect(bookmarksSection.getAttribute('hidden')).not.toBeNull();

    bookmarksButton.click();

    expect(linksButton.classList.contains('is-active')).toBe(false);
    expect(bookmarksButton.classList.contains('is-active')).toBe(true);
    expect(quickLinks.hidden).toBe(true);
    expect(quickLinks.style.display).toBe('none');
    expect(bookmarksSection.hidden).toBe(false);
    expect(bookmarksSection.style.display).toBe('');
    expect(quickLinks.getAttribute('hidden')).not.toBeNull();
    expect(bookmarksSection.getAttribute('hidden')).toBeNull();
  });
});
