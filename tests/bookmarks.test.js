/**
 * Bookmarks — native browser bookmarks via chrome.bookmarks API.
 *
 * Each test uses vi.resetModules() + dynamic import to get a fresh module
 * instance with the desired chrome mock.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Test Data ──────────────────────────────

const fullTree = [{
  id: '0',
  title: '',
  children: [{
    id: '1',
    title: 'Bookmarks Bar',
    children: [
      { id: '2', title: 'GitHub', url: 'https://github.com' },
      { id: '3', title: 'YouTube', url: 'https://youtube.com' },
      {
        id: '4',
        title: '工作',
        children: [
          { id: '5', title: 'Gmail', url: 'https://mail.google.com' },
          { id: '6', title: '', url: '' },
        ],
      },
      { id: '7', title: '', url: 'https://example.com' },
      { id: '8', title: '', children: [] },
    ],
  }],
}];

const emptyTree = [{
  id: '0',
  title: '',
  children: [{ id: '1', title: 'Bookmarks Bar', children: [] }],
}];

const nestedTree = [{
  id: '0',
  title: '',
  children: [{
    id: '1',
    title: 'Bookmarks Bar',
    children: [{
      id: '4',
      title: 'Outer',
      children: [{
        id: '5',
        title: 'Inner',
        children: [
          { id: '6', title: 'DeepLink', url: 'https://deep.com' },
        ],
      }],
    }],
  }],
}];

const githubTree = [{
  id: '0',
  title: '',
  children: [{
    id: '1',
    title: 'Bookmarks Bar',
    children: [
      { id: '2', title: 'GitHub', url: 'https://github.com' },
    ],
  }],
}];

// ── Mock Factory ───────────────────────────

function createMockChrome(treeData) {
  const listeners = {
    created: [],
    removed: [],
    changed: [],
    moved: [],
  };
  return {
    bookmarks: {
      getTree: vi.fn(cb => cb(treeData)),
      onCreated: { addListener: vi.fn(fn => listeners.created.push(fn)) },
      onRemoved: { addListener: vi.fn(fn => listeners.removed.push(fn)) },
      onChanged: { addListener: vi.fn(fn => listeners.changed.push(fn)) },
      onMoved: { addListener: vi.fn(fn => listeners.moved.push(fn)) },
    },
    _listeners: listeners,
  };
}

// ── DOM Cleanup ────────────────────────────
// The bookmarks module adds event listeners to the grid and back button.
// Replace these elements to remove accumulated listeners between tests.

function resetBookmarksDOM() {
  const grid = document.getElementById('bookmarks-grid');
  if (grid && grid.parentNode) {
    const newGrid = grid.cloneNode(false);
    grid.parentNode.replaceChild(newGrid, grid);
  }

  const backBtn = document.getElementById('bookmark-back-btn');
  if (backBtn && backBtn.parentNode) {
    const newBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBtn, backBtn);
  }

  // Reset visible state to defaults
  const emptyState = document.getElementById('bookmark-empty-state');
  if (emptyState) emptyState.hidden = true;
  const emptyText = document.getElementById('bookmark-empty-text');
  if (emptyText) emptyText.textContent = '';
  const section = document.getElementById('bookmarks-section');
  if (section) section.hidden = true;
  const folderHeader = document.getElementById('bookmark-folder-header');
  if (folderHeader) folderHeader.hidden = true;
  const folderTitle = document.getElementById('bookmark-folder-title');
  if (folderTitle) folderTitle.textContent = '';
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.resetModules();
  vi.unstubAllGlobals();
  resetBookmarksDOM();
});

// ── Rendering ──────────────────────────────

describe('rendering', () => {
  it('renders bookmark link cards from chrome.bookmarks.getTree()', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const links = document.querySelectorAll('.bookmark-item:not(.is-folder)');
    expect(links.length).toBe(3);
    expect(links[0].textContent).toContain('GitHub');
    expect(links[0].href).toContain('github.com');
    expect(links[1].textContent).toContain('YouTube');
    expect(links[1].href).toContain('youtube.com');
  });

  it('renders folder cards', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const folders = document.querySelectorAll('.bookmark-folder-item');
    expect(folders.length).toBe(2);
    expect(folders[0].textContent).toContain('工作');
    expect(folders[0].querySelector('.bookmark-item').tagName).toBe('BUTTON');
  });

  it('shows fallback title for folder with empty title', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const folders = document.querySelectorAll('.bookmark-folder-item');
    const emptyFolder = folders[1];
    expect(emptyFolder.textContent).toContain('未命名文件夹');
    const anchor = emptyFolder.querySelector('.bookmark-item');
    expect(anchor.title).toBe('未命名文件夹');
  });

  it('derives label from hostname for bookmark with empty title', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const links = document.querySelectorAll('.bookmark-item:not(.is-folder)');
    // Third link: id:7 has empty title, derives label from hostname
    const emptyTitleLink = links[2];
    expect(emptyTitleLink.textContent).toContain('example.com');
    expect(emptyTitleLink.title).toBe('example.com');
    expect(emptyTitleLink.href).toContain('example.com');
  });
});

// ── Folder Navigation ──────────────────────

describe('folder navigation', () => {
  it('enters a folder and shows its children', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    // Click the "工作" folder
    const workFolderLink = document.querySelector('.bookmark-folder-item .bookmark-item');
    workFolderLink.click();

    // Grid should now show folder children (Gmail only; empty-url node is skipped)
    const children = document.querySelectorAll('.bookmark-item:not(.is-folder)');
    expect(children.length).toBe(1);
    expect(children[0].textContent).toContain('Gmail');

    // Folder header should be visible with correct title
    expect(document.getElementById('bookmark-folder-header').hidden).toBe(false);
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('工作');
  });

  it('returns to parent folder on back button click', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    // Enter "工作" folder
    document.querySelector('.bookmark-folder-item .bookmark-item').click();
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('工作');

    // Click back
    document.getElementById('bookmark-back-btn').click();

    // Should show root items again
    const items = document.querySelectorAll('.bookmark-item');
    expect(items.length).toBe(5); // 3 links + 2 folders

    // Folder header should be hidden
    expect(document.getElementById('bookmark-folder-header').hidden).toBe(true);
  });

  it('supports nested folder navigation with back', async () => {
    const mockChrome = createMockChrome(nestedTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    // Root level: should see "Outer" folder
    expect(document.querySelector('.bookmark-folder-item').textContent).toContain('Outer');

    // Enter "Outer" folder
    document.querySelector('.bookmark-folder-item .bookmark-item').click();
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('Outer');

    // Enter "Inner" folder
    document.querySelector('.bookmark-folder-item .bookmark-item').click();
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('Inner');

    // Should see "DeepLink" bookmark
    expect(document.querySelector('.bookmark-item:not(.is-folder)').textContent).toContain('DeepLink');

    // Back to "Outer"
    document.getElementById('bookmark-back-btn').click();
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('Outer');

    // Back to root
    document.getElementById('bookmark-back-btn').click();
    expect(document.getElementById('bookmark-folder-header').hidden).toBe(true);
  });
});

// ── Empty / Error States ───────────────────

describe('empty and error states', () => {
  it('shows API unavailable message when chrome.bookmarks is missing', async () => {
    vi.stubGlobal('chrome', {});
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    expect(document.getElementById('bookmark-empty-state').hidden).toBe(false);
    expect(document.getElementById('bookmark-empty-text').textContent).toBe('仅在扩展模式下可读取书签栏');
  });

  it('shows empty state when bookmarks bar has no children', async () => {
    const mockChrome = createMockChrome(emptyTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    expect(document.getElementById('bookmark-empty-state').hidden).toBe(false);
    expect(document.getElementById('bookmark-empty-text').textContent).toBe('书签栏暂无书签');
  });

  it('shows read failure message when getTree throws', async () => {
    const mockChrome = {
      bookmarks: {
        getTree: vi.fn(() => { throw new Error('API error'); }),
      },
    };
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    expect(document.getElementById('bookmark-empty-state').hidden).toBe(false);
    expect(document.getElementById('bookmark-empty-text').textContent).toBe('无法读取书签栏');
  });
});

// ── Click Behavior ─────────────────────────

describe('click behavior', () => {
  it('prevents default and adds pulse animation on left-click', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const link = document.querySelector('.bookmark-item:not(.is-folder)');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    const prevented = !link.dispatchEvent(clickEvent);

    expect(prevented).toBe(true);
    expect(link.classList.contains('animate__pulse')).toBe(true);
    expect(link.classList.contains('click-pulse')).toBe(true);

    // Capture location to verify navigation
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    // After animationend + transitionend, navigation should occur
    const progressBar = document.getElementById('nav-progress');
    link.dispatchEvent(new Event('animationend', { bubbles: true }));
    progressBar.dispatchEvent(new Event('transitionend', { bubbles: true }));

    expect(captured.href).toBe('https://github.com/');
    window.location = origLoc;
  });

  it('does not intercept click with modifier keys', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    // Capture location to verify navigation is NOT triggered
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const link = document.querySelector('.bookmark-item:not(.is-folder)');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
    link.dispatchEvent(clickEvent);

    expect(link.classList.contains('animate__pulse')).toBe(false);
    expect(link.classList.contains('click-pulse')).toBe(false);

    // Navigation should not have been triggered
    expect(captured.href).toBe('');
    window.location = origLoc;
  });

  it('navigates after animationend and transitionend', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const link = document.querySelector('.bookmark-item:not(.is-folder)');
    const progressBar = document.getElementById('nav-progress');

    // Click triggers preventDefault + pulse
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));

    expect(link.classList.contains('animate__pulse')).toBe(true);
    expect(link.classList.contains('click-pulse')).toBe(true);

    // animationend → stage 2: progress bar
    link.dispatchEvent(new Event('animationend', { bubbles: true }));

    expect(link.classList.contains('animate__pulse')).toBe(false);
    expect(link.classList.contains('click-pulse')).toBe(false);
    expect(progressBar.style.width).toBe('100%');

    // Capture location to verify navigation
    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    // transitionend → navigation occurs
    progressBar.dispatchEvent(new Event('transitionend', { bubbles: true }));

    expect(captured.href).toBe('https://github.com/');
    window.location = origLoc;
  });
});

// ── Theme Changes ──────────────────────────

describe('theme changes', () => {
  it('refreshes bookmark icon src on theme-changed event', async () => {
    const mockChrome = createMockChrome(githubTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    const img = document.querySelector('.bookmark-item img');
    expect(img).toBeTruthy();
    expect(img.src).toContain('181717'); // light mode color

    // Switch to dark mode
    document.documentElement.setAttribute('data-theme', 'dark');
    window.dispatchEvent(new CustomEvent('theme-changed'));

    expect(img.src).toContain('FFFFFF'); // dark mode color
  });
});

// ── Bookmark Events ────────────────────────

describe('chrome bookmark events', () => {
  it('re-renders when bookmark event fires', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    // Initial load should call getTree once
    expect(mockChrome.bookmarks.getTree).toHaveBeenCalledTimes(1);

    // Update mock data to empty tree
    mockChrome.bookmarks.getTree.mockImplementation(cb => cb(emptyTree));

    // Trigger bookmark event
    mockChrome._listeners.created[0]();

    // getTree should be called again
    expect(mockChrome.bookmarks.getTree).toHaveBeenCalledTimes(2);

    // UI should reflect the new data
    expect(document.getElementById('bookmark-empty-state').hidden).toBe(false);
    expect(document.getElementById('bookmark-empty-text').textContent).toBe('书签栏暂无书签');
  });

  it('clears stale folder context when refresh falls back to empty state', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    document.querySelector('.bookmark-folder-item .bookmark-item').click();
    expect(document.getElementById('bookmark-folder-header').hidden).toBe(false);
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('工作');

    mockChrome.bookmarks.getTree.mockImplementation(cb => cb(emptyTree));
    mockChrome._listeners.removed[0]();

    expect(document.getElementById('bookmark-folder-header').hidden).toBe(true);
    expect(document.getElementById('bookmark-folder-title').textContent).toBe('');
    expect(document.getElementById('bookmark-empty-state').hidden).toBe(false);
  });

  it('re-renders when bookmark move event fires', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    mockChrome.bookmarks.getTree.mockImplementation(cb => cb(emptyTree));
    mockChrome._listeners.moved[0]();

    expect(mockChrome.bookmarks.getTree).toHaveBeenCalledTimes(2);
    expect(document.getElementById('bookmark-empty-state').hidden).toBe(false);
    expect(document.getElementById('bookmark-empty-text').textContent).toBe('书签栏暂无书签');
  });

  it('registers listeners for create/remove/change/move bookmark events', async () => {
    const mockChrome = createMockChrome(fullTree);
    vi.stubGlobal('chrome', mockChrome);
    const { initBookmarks } = await import('../js/bookmarks.js');
    initBookmarks();

    // Module should register onCreated, onRemoved, onChanged, onMoved
    expect(mockChrome.bookmarks.onCreated.addListener).toHaveBeenCalledTimes(1);
    expect(mockChrome.bookmarks.onRemoved.addListener).toHaveBeenCalledTimes(1);
    expect(mockChrome.bookmarks.onChanged.addListener).toHaveBeenCalledTimes(1);
    expect(mockChrome.bookmarks.onMoved.addListener).toHaveBeenCalledTimes(1);

    expect(mockChrome._listeners.created.length).toBe(1);
    expect(mockChrome._listeners.removed.length).toBe(1);
    expect(mockChrome._listeners.changed.length).toBe(1);
    expect(mockChrome._listeners.moved.length).toBe(1);
  });
});
