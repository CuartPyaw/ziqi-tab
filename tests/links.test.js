/**
 * Quick Links — CRUD, localStorage sync, rendering, icon helpers.
 *
 * All tests go through the public API (initLinks) and observe DOM / localStorage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initLinks } from '../js/links.js';

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

  it('opens dialog for editing when a link is double-clicked', () => {
    const label = document.querySelector('.link-label');
    label.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

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
    // Double-click YouTube
    document.querySelector('.link-label').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    document.getElementById('link-title').value = 'YouTube Edited';
    document.getElementById('link-form').dispatchEvent(new Event('submit', { cancelable: true }));

    const links = JSON.parse(localStorage.getItem('ziqi-links'));
    expect(links.find((l) => l.id === '1').title).toBe('YouTube Edited');
  });

  it('deletes a link', () => {
    // Double-click YouTube
    document.querySelector('.link-label').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
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
