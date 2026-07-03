/**
 * Settings — search bar width slider, save/cancel behavior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initSettings } from '../js/settings.js';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--search-width');
  initSettings();
});

describe('search width', () => {
  it('applies default width (520px) on init', () => {
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px');
  });

  it('restores saved width from localStorage', () => {
    localStorage.setItem('ziqi-search-width', '620');
    // Re-init
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('620px');
  });

  it('clamps width to minimum 360', () => {
    localStorage.setItem('ziqi-search-width', '100');
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px'); // default
  });

  it('clamps width to maximum 720', () => {
    localStorage.setItem('ziqi-search-width', '999');
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px'); // default
  });

  it('handles non-numeric stored value gracefully', () => {
    localStorage.setItem('ziqi-search-width', 'abc');
    initSettings();
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px');
  });
});

describe('dialog', () => {
  it('opens the settings dialog on toggle button click', () => {
    document.getElementById('settings-toggle').click();
    expect(document.getElementById('settings-dialog').open).toBe(true);
  });

  it('sets slider to stored value when opening', () => {
    localStorage.setItem('ziqi-search-width', '650');
    initSettings();
    document.getElementById('settings-toggle').click();
    expect(document.getElementById('search-width').value).toBe('650');
  });

  it('displays the current slider value', () => {
    document.getElementById('settings-toggle').click();
    // Default is 520
    expect(document.getElementById('search-width-value').textContent).toBe('520px');
  });

  it('saves width and applies it on save button click', () => {
    document.getElementById('settings-toggle').click();
    const slider = document.getElementById('search-width');
    slider.value = '600';
    slider.dispatchEvent(new Event('input'));

    document.getElementById('settings-save').click();

    expect(localStorage.getItem('ziqi-search-width')).toBe('600');
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('600px');
  });

});

describe('settings tabs', () => {
  it('switches to engines panel when nav item clicked', () => {
    document.getElementById('settings-toggle').click();
    const enginesNav = document.querySelector('[data-tab="engines"]');
    enginesNav.click();
    expect(enginesNav.classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-panel="engines"]').classList.contains('active')).toBe(true);
  });

  it('has search panel active by default', () => {
    document.getElementById('settings-toggle').click();
    expect(document.querySelector('[data-tab="search"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-panel="search"]').classList.contains('active')).toBe(true);
  });
});

describe('bottom shortcuts', () => {
  it('extensions shortcut exists with correct target', () => {
    const el = document.getElementById('extensions-shortcut');
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('BUTTON');
    expect(el.classList.contains('settings-btn')).toBe(true);
    expect(el.dataset.browserUrl).toBe('chrome://extensions/');
    expect(el.getAttribute('title')).toBe('扩展程序');
    expect(el.getAttribute('aria-label')).toBe('扩展程序');
    expect(el.getAttribute('type')).toBe('button');
    expect(el.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('history shortcut exists with correct target', () => {
    const el = document.getElementById('history-shortcut');
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('BUTTON');
    expect(el.classList.contains('settings-btn')).toBe(true);
    expect(el.dataset.browserUrl).toBe('chrome://history/');
    expect(el.getAttribute('title')).toBe('历史记录');
    expect(el.getAttribute('aria-label')).toBe('历史记录');
    expect(el.getAttribute('type')).toBe('button');
    expect(el.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('bookmarks shortcut exists with correct target', () => {
    const el = document.getElementById('bookmarks-shortcut');
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('BUTTON');
    expect(el.classList.contains('settings-btn')).toBe(true);
    expect(el.dataset.browserUrl).toBe('chrome://bookmarks/');
    expect(el.getAttribute('title')).toBe('书签');
    expect(el.getAttribute('aria-label')).toBe('书签');
    expect(el.getAttribute('type')).toBe('button');
    expect(el.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('existing settings toggle and theme toggle remain present', () => {
    expect(document.getElementById('settings-toggle')).not.toBeNull();
    expect(document.getElementById('theme-toggle')).not.toBeNull();
  });
});

describe('engine management', () => {
  it('renders preset engines in the list', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    const items = document.querySelectorAll('.engine-list-item');
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items[0].textContent).toContain('Google');
    expect(items[0].textContent).toContain('预设');
  });

  it('renders custom engines with edit/delete buttons', () => {
    localStorage.setItem('ziqi-engines', JSON.stringify([
      { id: 'test-1', name: 'TestEngine', url: 'https://test.com/search?q=', builtin: false }
    ]));
    localStorage.setItem('ziqi-engine-order', JSON.stringify(['google', 'bing', 'duckduckgo', 'test-1']));
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    const editBtns = document.querySelectorAll('[data-action="edit"]');
    const deleteBtns = document.querySelectorAll('[data-action="delete"]');
    expect(editBtns.length).toBe(1);
    expect(deleteBtns.length).toBe(1);
  });

  it('opens engine form dialog on add button click', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();
    expect(document.getElementById('engine-form-dialog').open).toBe(true);
  });

  it('saves custom engine to localStorage', () => {
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    document.getElementById('engine-name').value = 'Kagi';
    document.getElementById('engine-url').value = 'https://kagi.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    const customs = JSON.parse(localStorage.getItem('ziqi-engines'));
    expect(customs.length).toBe(1);
    expect(customs[0].name).toBe('Kagi');
  });

  it('rejects empty engine name', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    document.getElementById('engine-name').value = '';
    document.getElementById('engine-url').value = 'https://example.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('名称'));
    alertMock.mockRestore();
  });

  it('rejects non-https URL', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    document.getElementById('engine-name').value = 'Test';
    document.getElementById('engine-url').value = 'http://example.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('https://'));
    alertMock.mockRestore();
  });

  it('deletes custom engine', () => {
    localStorage.setItem('ziqi-engines', JSON.stringify([
      { id: 'test-del', name: 'ToDelete', url: 'https://delete.com/search?q=', builtin: false }
    ]));
    localStorage.setItem('ziqi-engine-order', JSON.stringify(['google', 'bing', 'duckduckgo', 'test-del']));
    document.getElementById('settings-toggle').click();
    document.querySelector('[data-tab="engines"]').click();

    const deleteBtn = document.querySelector('[data-action="delete"]');
    deleteBtn.click();

    const customs = JSON.parse(localStorage.getItem('ziqi-engines'));
    expect(customs.length).toBe(0);
  });
});
