import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadNewtabDocument() {
  const html = readFileSync(resolve('newtab.html'), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('new tab structure', () => {
  it('uses only quick links content instead of a separate bookmarks panel', () => {
    const doc = loadNewtabDocument();

    expect(doc.getElementById('quick-links')).not.toBeNull();
    expect(doc.getElementById('content-switcher')).toBeNull();
    expect(doc.getElementById('bookmarks-section')).toBeNull();
    expect(doc.querySelector('script[src="js/bookmarks.js"]')).toBeNull();
    expect(doc.querySelector('link[href="css/bookmarks.css"]')).toBeNull();
  });

  it('has a bottom shortcut to the browser bookmarks manager', () => {
    const doc = loadNewtabDocument();
    const shortcut = doc.getElementById('bookmarks-shortcut');

    expect(shortcut).not.toBeNull();
    expect(shortcut.tagName).toBe('BUTTON');
    expect(shortcut.classList.contains('settings-btn')).toBe(true);
    expect(shortcut.dataset.browserUrl).toBe('chrome://bookmarks/');
    expect(shortcut.getAttribute('title')).toBe('书签');
    expect(shortcut.getAttribute('aria-label')).toBe('书签');
    expect(shortcut.getAttribute('type')).toBe('button');
    expect(shortcut.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('extension manifest', () => {
  it('does not request bookmark-reading permissions after removing the bookmarks panel', () => {
    const manifest = JSON.parse(readFileSync(resolve('manifest.json'), 'utf8'));

    expect(manifest.permissions ?? []).not.toContain('bookmarks');
  });
});
