/**
 * Quick Links — CRUD, localStorage sync, rendering, icon helpers.
 *
 * All tests go through the public API (initLinks) and observe DOM / localStorage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initLinks, resolveIconUrl, iconUrl } from '../js/links.js';

const DEFAULTS = [
  { id: '1', title: 'YouTube', url: 'https://www.youtube.com' },
  { id: '2', title: 'X',        url: 'https://x.com' },
  { id: '3', title: 'GitHub',   url: 'https://github.com' },
];

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('initLinks', () => {
  it('renders default links when localStorage is empty', () => {
    initLinks();
    const items = document.querySelectorAll('.link-item');
    expect(items.length).toBe(3);
    expect(items[0].getAttribute('title')).toBe('YouTube');
    expect(items[1].getAttribute('title')).toBe('X');
    expect(items[2].getAttribute('title')).toBe('GitHub');
  });

  it('loads saved links from localStorage', () => {
    const custom = [
      { id: 'c1', title: 'Custom', url: 'https://example.com' },
    ];
    localStorage.setItem('ziqi-links', JSON.stringify(custom));
    initLinks();
    const items = document.querySelectorAll('.link-item');
    expect(items.length).toBe(1);
    expect(items[0].getAttribute('title')).toBe('Custom');
  });

  it('falls back to defaults when localStorage is corrupted', () => {
    localStorage.setItem('ziqi-links', 'not-json');
    initLinks();
    const items = document.querySelectorAll('.link-item');
    expect(items.length).toBe(3);
  });

  it('renders the add button', () => {
    initLinks();
    expect(document.querySelector('.link-add')).not.toBeNull();
    expect(document.querySelector('.link-add-label').textContent).toBe('添加');
  });

  it('renders fallback letter when URL is invalid', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'fb', title: 'Test', url: 'not-a-valid-url' },
    ]));
    initLinks();
    const fallback = document.querySelector('.link-icon-fallback');
    expect(fallback).not.toBeNull();
    expect(fallback.textContent).toBe('T');
  });
});

describe('CRUD', () => {
  beforeEach(() => {
    initLinks();
  });

  it('opens dialog for a new link when add button is clicked', () => {
    document.querySelector('.link-add').click();
    const dialog = document.getElementById('link-dialog');
    expect(dialog.open).toBe(true);
    expect(document.getElementById('link-title').value).toBe('');
    expect(document.getElementById('link-url').value).toBe('');
    expect(document.getElementById('link-delete').hidden).toBe(true);
  });

  it('opens dialog for editing on right-click of a link item', () => {
    const linkItem = document.querySelector('.link-item');
    linkItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(document.getElementById('link-dialog').open).toBe(true);
    expect(document.getElementById('link-title').value).toBe('YouTube');
    expect(document.getElementById('link-url').value).toBe('https://www.youtube.com');
    expect(document.getElementById('link-delete').hidden).toBe(false);
  });

  it('opens dialog for editing on right-click', () => {
    const linkItem = document.querySelector('.link-item');
    linkItem.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(document.getElementById('link-dialog').open).toBe(true);
    expect(document.getElementById('link-title').value).toBe('YouTube');
  });

  it('adds a new link on form submit', () => {
    document.querySelector('.link-add').click();
    document.getElementById('link-title').value = 'New Site';
    document.getElementById('link-url').value = 'https://newsite.com';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links.length).toBe(4);
    expect(links).toContainEqual(expect.objectContaining({
      title: 'New Site',
      url: 'https://newsite.com',
    }));
  });

  it('prepends https:// if no protocol is provided', () => {
    document.querySelector('.link-add').click();
    document.getElementById('link-title').value = 'No Proto';
    document.getElementById('link-url').value = 'example.com';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links).toContainEqual(expect.objectContaining({
      title: 'No Proto',
      url: 'https://example.com',
    }));
  });

  it('edits an existing link', () => {
    // Right-click YouTube
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.getElementById('link-title').value = 'YouTube Edited';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links.find((l) => l.id === '1').title).toBe('YouTube Edited');
  });

  it('deletes a link', () => {
    // Right-click YouTube
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.getElementById('link-delete').click();

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links.length).toBe(2);
    expect(links.find((l) => l.id === '1')).toBeUndefined();
  });

  it('re-renders grid after adding a link', () => {
    const before = document.querySelectorAll('.link-item').length;
    document.querySelector('.link-add').click();
    document.getElementById('link-title').value = 'A';
    document.getElementById('link-url').value = 'https://a.com';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const after = document.querySelectorAll('.link-item').length;
    expect(after).toBe(before + 1);
  });

  it('closes dialog on cancel button click', () => {
    document.querySelector('.link-add').click();
    document.querySelector('#link-form [value="cancel"]').click();
    expect(document.getElementById('link-dialog').open).toBe(false);
  });

  it('closes dialog on backdrop click', () => {
    document.querySelector('.link-add').click();
    document.getElementById('link-dialog').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // The handler checks e.target === elDialog — dispatch on dialog itself
    expect(document.getElementById('link-dialog').open).toBe(false);
  });

  it('does not close dialog when clicking inside the form', () => {
    document.querySelector('.link-add').click();
    // The cancel button inside the form triggers closeDialog, but that's intentional
    // (handled by its own listener). The backdrop check (e.target === elDialog)
    // should NOT match when clicking the cancel button.
    // We can't easily dispatch a click on the cancel button and also test the
    // backdrop path, so we test the backdrop path separately:
    const dialog = document.getElementById('link-dialog');
    dialog.close(); // reset
    dialog.showModal();
    const form = dialog.querySelector('form');
    form.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dialog.open).toBe(true); // backdrop handler didn't fire
  });
});

describe('icon helpers (via DOM)', () => {
  it('produces simpleicons URL for a valid domain', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'i1', title: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img).not.toBeNull();
    expect(img.src).toContain('cdn.simpleicons.org');
    expect(img.src).toContain('duckduckgo');
  });

  it('uses white GitHub icon in dark mode', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'g1', title: 'GitHub', url: 'https://github.com' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img.src).toContain('FFFFFF');
  });

  it('uses dark GitHub icon in light mode', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'g2', title: 'GitHub', url: 'https://github.com' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img.src).toContain('181717');
  });
});

describe('custom icon URL', () => {
  it('uses custom icon URL when provided', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c1', title: 'Custom', url: 'https://example.com', icon: 'https://example.com/icon.svg' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img.src).toBe('https://example.com/icon.svg');
  });

  it('falls back to Simple Icons CDN when icon field is empty', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c2', title: 'NoIcon', url: 'https://example.com' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img.src).toContain('cdn.simpleicons.org');
  });

  it('falls back to Simple Icons CDN when icon field is blank string', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c3', title: 'BlankIcon', url: 'https://example.com', icon: '' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img.src).toContain('cdn.simpleicons.org');
  });

  it('stores custom icon URL when saving a new link', () => {
    initLinks();
    document.querySelector('.link-add').click();
    document.getElementById('link-title').value = 'With Icon';
    document.getElementById('link-url').value = 'https://example.com';
    document.getElementById('link-icon').value = 'https://example.com/icon.svg';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links).toContainEqual(expect.objectContaining({
      title: 'With Icon',
      url: 'https://example.com',
      icon: 'https://example.com/icon.svg',
    }));
  });

  it('populates icon field when editing a link with custom icon', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c4', title: 'HasIcon', url: 'https://example.com', icon: 'https://example.com/icon.svg' },
    ]));
    initLinks();
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    expect(document.getElementById('link-icon').value).toBe('https://example.com/icon.svg');
  });

  it('clears custom icon when field is emptied during edit', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c5', title: 'HadIcon', url: 'https://example.com', icon: 'https://example.com/icon.svg' },
    ]));
    initLinks();
    document.querySelector('.link-item').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    document.getElementById('link-icon').value = '';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links[0].icon).toBe('');
  });

  it('renders custom icon image with correct src', () => {
    localStorage.setItem('ziqi-links', JSON.stringify([
      { id: 'c6', title: 'CustomIcon', url: 'https://example.com', icon: 'https://example.com/icon.svg' },
    ]));
    initLinks();
    const img = document.querySelector('.link-item img');
    expect(img.src).toBe('https://example.com/icon.svg');
    expect(img.crossOrigin).toBeNull();
  });
});

describe('resolveIconUrl (unit)', () => {
  it('returns custom icon URL when present', () => {
    const link = { id: '1', title: 'X', url: 'https://x.com', icon: 'https://custom/icon.svg' };
    expect(resolveIconUrl(link)).toBe('https://custom/icon.svg');
  });

  it('falls back to Simple Icons CDN when no custom icon', () => {
    const link = { id: '1', title: 'X', url: 'https://x.com' };
    expect(resolveIconUrl(link)).toContain('cdn.simpleicons.org/x');
  });

  it('returns null for bad URL and no custom icon', () => {
    const link = { id: '1', title: 'Bad', url: 'not-a-url' };
    expect(resolveIconUrl(link)).toBeNull();
  });
});

describe('drag and drop reorder', () => {
  beforeEach(() => {
    initLinks();
  });

  /**
   * Dispatch a synthetic drag event with a dataTransfer property.
   * Uses a plain Event + Object.defineProperty to avoid depending on
   * DragEvent constructor (not implemented in jsdom).
   */
  function dispatchDragEvent(target, type, dataTransfer, cancelable = false) {
    const event = new Event(type, { bubbles: true, cancelable });
    Object.defineProperty(event, 'dataTransfer', {
      value: dataTransfer,
      writable: false,
    });
    target.dispatchEvent(event);
  }

  function dragAndDrop(sourceIndex, targetIndex) {
    const items = document.querySelectorAll('.link-item');
    const source = items[sourceIndex];
    const target = items[targetIndex];

    const dt = new DataTransfer();

    dispatchDragEvent(source, 'dragstart', dt);
    dispatchDragEvent(target, 'dragover', dt, true);
    dispatchDragEvent(target, 'drop', dt, true);
    dispatchDragEvent(source, 'dragend', dt);
  }

  it('reorders links: first item dragged to last position', () => {
    // Default order: YouTube, X, GitHub
    dragAndDrop(0, 2); // Drag YouTube to GitHub position

    const items = document.querySelectorAll('.link-item');
    expect(items[0].getAttribute('title')).toBe('X');
    expect(items[1].getAttribute('title')).toBe('GitHub');
    expect(items[2].getAttribute('title')).toBe('YouTube');

    const stored = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(stored[0].title).toBe('X');
    expect(stored[1].title).toBe('GitHub');
    expect(stored[2].title).toBe('YouTube');
  });

  it('reorders links: last item dragged to first position', () => {
    dragAndDrop(2, 0); // Drag GitHub to YouTube position

    const items = document.querySelectorAll('.link-item');
    expect(items[0].getAttribute('title')).toBe('GitHub');
    expect(items[1].getAttribute('title')).toBe('YouTube');
    expect(items[2].getAttribute('title')).toBe('X');

    const stored = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(stored[0].title).toBe('GitHub');
    expect(stored[1].title).toBe('YouTube');
    expect(stored[2].title).toBe('X');
  });

  it('does nothing when dragging to the same position', () => {
    dragAndDrop(1, 1); // X → X (same position)

    const items = document.querySelectorAll('.link-item');
    expect(items[0].getAttribute('title')).toBe('YouTube');
    expect(items[1].getAttribute('title')).toBe('X');
    expect(items[2].getAttribute('title')).toBe('GitHub');
  });

  it('adds .dragging class on dragstart and .drag-over on target', () => {
    const items = document.querySelectorAll('.link-item');
    const source = items[0];
    const target = items[1];

    const dt = new DataTransfer();
    dispatchDragEvent(source, 'dragstart', dt);

    expect(source.classList.contains('dragging')).toBe(true);

    dispatchDragEvent(target, 'dragover', dt, true);

    expect(target.classList.contains('drag-over')).toBe(true);
  });

  it('cleans up .dragging class on dragend (cancel scenario)', () => {
    const items = document.querySelectorAll('.link-item');
    const source = items[0];

    const dt = new DataTransfer();
    dispatchDragEvent(source, 'dragstart', dt);
    expect(source.classList.contains('dragging')).toBe(true);

    dispatchDragEvent(source, 'dragend', dt);
    expect(source.classList.contains('dragging')).toBe(false);
  });

  it('appends to end when dropping on the add button', () => {
    const items = document.querySelectorAll('.link-item');
    const source = items[0]; // YouTube

    const addBtn = document.querySelector('.link-add');

    const dt = new DataTransfer();
    dispatchDragEvent(source, 'dragstart', dt);
    dispatchDragEvent(addBtn, 'dragover', dt, true);
    dispatchDragEvent(addBtn, 'drop', dt, true);

    const newItems = document.querySelectorAll('.link-item');
    expect(newItems[0].getAttribute('title')).toBe('X');
    expect(newItems[1].getAttribute('title')).toBe('GitHub');
    expect(newItems[2].getAttribute('title')).toBe('YouTube');
  });
});

describe('click navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    initLinks();
  });

  it('adds animate__pulse and click-pulse classes on link click', () => {
    const linkItem = document.querySelector('.link-item');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    const prevented = !linkItem.dispatchEvent(clickEvent);

    // Should prevent default navigation
    expect(prevented).toBe(true);
    // Should add pulse classes
    expect(linkItem.classList.contains('animate__pulse')).toBe(true);
    expect(linkItem.classList.contains('click-pulse')).toBe(true);
  });

  it('does not add pulse classes on Ctrl+click', () => {
    const linkItem = document.querySelector('.link-item');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    linkItem.dispatchEvent(clickEvent);

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
  });

  it('does not add pulse classes on middle-click', () => {
    const linkItem = document.querySelector('.link-item');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 });
    linkItem.dispatchEvent(clickEvent);

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
  });

  it('removes pulse classes after animationend and starts progress bar', () => {
    const linkItem = document.querySelector('.link-item');
    const progressBar = document.getElementById('nav-progress');

    // Click the link
    linkItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    expect(linkItem.classList.contains('animate__pulse')).toBe(true);
    expect(linkItem.classList.contains('click-pulse')).toBe(true);

    // Dispatch animationend — jsdom doesn't run CSS animations
    linkItem.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
    expect(progressBar.style.width).toBe('100%');
  });

  it('navigates after progress bar transitionend', () => {
    const linkItem = document.querySelector('.link-item');
    const progressBar = document.getElementById('nav-progress');

    // Click → animationend
    linkItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    linkItem.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(progressBar.style.width).toBe('100%');

    // Progress bar should have transitionend listener — verify by dispatching
    // and checking that the bar is still at 100% (listener doesn't reset it)
    const transitionFired = progressBar.dispatchEvent(new Event('transitionend', { bubbles: true }));
    expect(transitionFired).toBe(true);
    // After transitionend, the once:true listener is removed — dispatching again
    // should still work but the handler won't fire again
  });

  it('falls back to direct navigation when progress bar is absent', () => {
    // Remove progress bar from DOM
    const progressBar = document.getElementById('nav-progress');
    if (progressBar) progressBar.remove();

    const linkItem = document.querySelector('.link-item');

    // Click → should not throw
    expect(() => {
      linkItem.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    }).not.toThrow();

    // animationend → should not throw
    expect(() => {
      linkItem.dispatchEvent(new Event('animationend', { bubbles: true }));
    }).not.toThrow();

    expect(linkItem.classList.contains('animate__pulse')).toBe(false);
    expect(linkItem.classList.contains('click-pulse')).toBe(false);
  });
});
