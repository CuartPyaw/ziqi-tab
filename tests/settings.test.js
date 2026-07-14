/**
 * Standalone settings page — persistence, tabs, and inline editors.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initSettingsLink, initSettingsPage } from '../js/settings.js';
import { getCurrentEngine, setCurrentEngine } from '../js/search.js';

function mountSettingsPage() {
  document.body.innerHTML = `
    <a id="settings-toggle" href="settings.html" target="_blank"></a>
    <nav id="settings-nav">
      <button class="settings-nav-item active" data-tab="dashboard"></button>
      <button class="settings-nav-item" data-tab="search"></button>
      <button class="settings-nav-item" data-tab="engines"></button>
      <button class="settings-nav-item" data-tab="ai"></button>
    </nav>
    <section class="settings-panel active" data-panel="dashboard">
      <input id="recent-enabled" type="checkbox">
      <fieldset id="recent-limit-group"><input type="radio" name="recent-limit" value="4"><input type="radio" name="recent-limit" value="8"><input type="radio" name="recent-limit" value="12"></fieldset>
      <input id="todos-enabled" type="checkbox">
    </section>
    <section class="settings-panel" data-panel="search">
      <input id="search-width" value="520"><span id="search-width-value"></span>
    </section>
    <section class="settings-panel" data-panel="engines">
      <div id="engine-list-view"><ul id="engine-list"></ul><button id="engine-add-btn"></button></div>
      <form id="engine-form" hidden>
        <h2 id="engine-form-title"></h2><input id="engine-name"><input id="engine-url">
        <button type="button" id="engine-form-cancel"></button><button type="button" id="engine-delete" hidden></button>
      </form>
    </section>
    <section class="settings-panel" data-panel="ai">
      <div id="ai-site-list-view"><ul id="ai-site-list"></ul><button id="ai-site-add-btn"></button></div>
      <form id="ai-site-form" hidden>
        <h2 id="ai-site-form-title"></h2><input id="ai-site-name"><input id="ai-site-shortcut"><input id="ai-site-url">
        <button type="button" id="ai-site-form-cancel"></button><button type="button" id="ai-site-delete" hidden></button>
      </form>
    </section>
  `;
}

beforeEach(() => {
  localStorage.clear();
  setCurrentEngine('google');
  document.documentElement.style.removeProperty('--search-width');
  mountSettingsPage();
  initSettingsPage();
});

describe('settings link', () => {
  it('keeps the navigation target and applies the saved search width', () => {
    localStorage.setItem('ziqi-search-width', '620');
    initSettingsLink();

    expect(document.getElementById('settings-toggle').getAttribute('href')).toBe('settings.html');
    expect(document.getElementById('settings-toggle').getAttribute('target')).toBe('_blank');
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('620px');
  });
});

describe('search width', () => {
  it('applies the default width on load', () => {
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('520px');
    expect(document.getElementById('search-width-value').textContent).toBe('520px');
  });

  it('restores a valid stored width', () => {
    localStorage.setItem('ziqi-search-width', '650');
    initSettingsPage();

    expect(document.getElementById('search-width').value).toBe('650');
    expect(document.documentElement.style.getPropertyValue('--search-width')).toBe('650px');
  });

  it('saves width changes immediately', () => {
    const slider = document.getElementById('search-width');
    slider.value = '600';
    slider.dispatchEvent(new Event('input'));

    expect(localStorage.getItem('ziqi-search-width')).toBe('600');
    expect(document.getElementById('search-width-value').textContent).toBe('600px');
  });
});

describe('settings tabs', () => {
  it('switches to the engines panel', () => {
    document.querySelector('[data-tab="engines"]').click();

    expect(document.querySelector('[data-tab="engines"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-panel="engines"]').classList.contains('active')).toBe(true);
  });

  it('renders the AI presets when its panel is selected', () => {
    document.querySelector('[data-tab="ai"]').click();

    expect(document.querySelectorAll('.ai-site-list-item')).toHaveLength(8);
  });
});

describe('dashboard settings', () => {
  it('saves recent browsing visibility and count', () => {
    document.getElementById('recent-enabled').click();
    document.querySelector('input[name="recent-limit"][value="8"]').click();

    expect(localStorage.getItem('ziqi-recent-enabled')).toBe('false');
    expect(localStorage.getItem('ziqi-recent-limit')).toBe('8');
  });

  it('saves todo visibility', () => {
    document.getElementById('todos-enabled').click();

    expect(localStorage.getItem('ziqi-todos-enabled')).toBe('false');
  });
});

describe('engine management', () => {
  it('changes the default engine immediately', () => {
    document.querySelector('[data-tab="engines"]').click();
    document.querySelector('.engine-default-radio[value="bing"]').click();

    expect(localStorage.getItem('ziqi-engine')).toBe('bing');
    expect(getCurrentEngine().id).toBe('bing');
  });

  it('restores the saved default engine', () => {
    localStorage.setItem('ziqi-engine', 'bing');
    initSettingsPage();
    document.querySelector('[data-tab="engines"]').click();

    expect(document.querySelector('.engine-default-radio:checked').value).toBe('bing');
  });

  it('opens and cancels the inline add form', () => {
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();

    expect(document.getElementById('engine-form').hidden).toBe(false);
    expect(document.getElementById('engine-list-view').hidden).toBe(true);

    document.getElementById('engine-form-cancel').click();
    expect(document.getElementById('engine-form').hidden).toBe(true);
  });

  it('saves a custom engine from the inline form', () => {
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();
    document.getElementById('engine-name').value = 'Kagi';
    document.getElementById('engine-url').value = 'https://kagi.com/search?q=';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    expect(JSON.parse(localStorage.getItem('ziqi-engines'))[0]).toMatchObject({ name: 'Kagi' });
    expect(document.getElementById('engine-form').hidden).toBe(true);
  });

  it('deletes an edited custom engine from its inline form', () => {
    localStorage.setItem('ziqi-engines', JSON.stringify([
      { id: 'test-delete', name: 'To Delete', url: 'https://example.com/?q=', builtin: false },
    ]));
    localStorage.setItem('ziqi-engine-order', JSON.stringify(['google', 'bing', 'duckduckgo', 'test-delete']));
    initSettingsPage();
    document.querySelector('[data-tab="engines"]').click();
    document.querySelector('[data-action="edit"]').click();
    document.getElementById('engine-delete').click();

    expect(JSON.parse(localStorage.getItem('ziqi-engines'))).toEqual([]);
    expect(document.getElementById('engine-form').hidden).toBe(true);
  });

  it('rejects a non-HTTPS URL', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    document.querySelector('[data-tab="engines"]').click();
    document.getElementById('engine-add-btn').click();
    document.getElementById('engine-name').value = 'Test';
    document.getElementById('engine-url').value = 'http://example.com';
    document.getElementById('engine-form').dispatchEvent(new Event('submit'));

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('https://'));
    alertMock.mockRestore();
  });
});

describe('AI site management', () => {
  it('saves a custom AI site from the inline form', () => {
    document.querySelector('[data-tab="ai"]').click();
    document.getElementById('ai-site-add-btn').click();
    document.getElementById('ai-site-name').value = 'Example AI';
    document.getElementById('ai-site-shortcut').value = 'exa';
    document.getElementById('ai-site-url').value = 'https://example.com/?q={query}';
    document.getElementById('ai-site-form').dispatchEvent(new Event('submit'));

    expect(JSON.parse(localStorage.getItem('ziqi-ai-sites')).at(-1)).toMatchObject({ name: 'Example AI', shortcut: 'exa' });
    expect(document.getElementById('ai-site-form').hidden).toBe(true);
  });
});
