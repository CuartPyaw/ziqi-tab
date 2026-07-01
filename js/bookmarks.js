/**
 * Bookmarks — read-only browser bookmarks bar via chrome.bookmarks API.
 * Loaded as a separate module entry point via newtab.html.
 *
 * Reads native bookmarks directly from the browser (no localStorage caching).
 * Supports folder navigation with a stack-based back button.
 */

import { fallbackLetter } from './links.js';

/* ── State ─────────────────────────────── */

let folderStack = [];
let rootNode = null;
let elGrid = null;
let elSection = null;
let elFolderHeader = null;
let elBackBtn = null;
let elFolderTitle = null;
let elEmptyState = null;
let elEmptyText = null;
let initialized = false;

/* ── Utilities ─────────────────────────── */

/**
 * Find the bookmarks bar root node from the Chrome bookmarks tree.
 * Standard Chrome tree structure:
 *   tree[0] — root node (id: "0")
 *     .children[0] — Bookmarks bar (id: "1")
 *     .children[1] — Other bookmarks (id: "2")
 *     .children[2] — Mobile bookmarks (id: "3")
 */
function getBookmarksBar(tree) {
  const root = tree[0];
  if (!root || !root.children) return null;
  return root.children.find(n => n.id === '1') || null;
}

/** Derive a display label for a bookmark node, falling back to hostname. */
function getLabel(node) {
  if (node.title) return node.title;
  if (node.url) {
    try {
      return new URL(node.url).hostname.replace(/^www\./, '');
    } catch {
      return node.url;
    }
  }
  return '';
}

function bookmarkFaviconUrl(node) {
  if (!node.url) return null;
  try {
    new URL(node.url);
  } catch {
    return null;
  }
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    return null;
  }
  return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(node.url)}&size=32`);
}

/* ── Empty / Error States ──────────────── */

function resetFolderContext() {
  folderStack = [];
  elFolderHeader.hidden = true;
  elFolderTitle.textContent = '';
}

function showEmpty(message) {
  elEmptyText.textContent = message;
  elEmptyState.hidden = false;
  elGrid.hidden = true;
}

function hideEmpty() {
  elEmptyState.hidden = true;
  elGrid.hidden = false;
}

/* ── Render ────────────────────────────── */

function renderBookmarkItem(node) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.className = 'bookmark-item';
  a.href = node.url;
  a.title = node.title || getLabel(node);

  // Icon wrapper
  const iconWrap = document.createElement('div');
  iconWrap.className = 'bookmark-icon-wrapper';

  const img = document.createElement('img');
  const src = bookmarkFaviconUrl(node);
  img.src = src || '';
  img.alt = '';
  img.loading = 'eager';

  // Fallback: if CDN icon fails, show first letter
  img.onerror = () => {
    const fb = document.createElement('div');
    fb.className = 'bookmark-icon-fallback';
    fb.textContent = fallbackLetter(getLabel(node));
    img.replaceWith(fb);
  };

  if (!src) {
    // No CDN URL could be derived — use fallback immediately
    const fb = document.createElement('div');
    fb.className = 'bookmark-icon-fallback';
    fb.textContent = fallbackLetter(getLabel(node));
    iconWrap.appendChild(fb);
  } else {
    iconWrap.appendChild(img);
  }

  a.appendChild(iconWrap);

  // Label
  const label = document.createElement('span');
  label.className = 'bookmark-label';
  label.textContent = getLabel(node);
  a.appendChild(label);

  li.appendChild(a);
  return li;
}

function renderFolderItem(node) {
  const li = document.createElement('li');
  li.className = 'bookmark-folder-item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bookmark-item is-folder';
  button.title = node.title || '未命名文件夹';
  button.setAttribute('data-folder-id', node.id);

  // Folder icon — inline SVG (CSS-rendered)
  const folderIcon = document.createElement('div');
  folderIcon.className = 'bookmark-folder-icon';
  folderIcon.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="32" height="32">'
    + '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
    + '</svg>';
  button.appendChild(folderIcon);

  // Label
  const label = document.createElement('span');
  label.className = 'bookmark-label';
  label.textContent = node.title || '未命名文件夹';
  button.appendChild(label);

  li.appendChild(button);
  return li;
}

function renderBookmarks(nodes) {
  elGrid.innerHTML = '';
  if (!nodes || nodes.length === 0) {
    showEmpty('书签栏暂无书签');
    return;
  }
  hideEmpty();

  nodes.forEach(node => {
    if (node.url) {
      elGrid.appendChild(renderBookmarkItem(node));
    } else if (node.children) {
      // Folder node
      elGrid.appendChild(renderFolderItem(node));
    }
    // Nodes without url and without children (separators, etc.) are skipped
  });
}

function renderRoot() {
  if (!rootNode || !rootNode.children) {
    showEmpty('书签栏暂无书签');
    return;
  }
  resetFolderContext();
  renderBookmarks(rootNode.children);
}

/* ── Folder Navigation ─────────────────── */

function enterFolder(folderNode) {
  folderStack.push(folderNode);
  elFolderHeader.hidden = false;
  elFolderTitle.textContent = folderNode.title || '未命名文件夹';
  renderBookmarks(folderNode.children);
}

function goBack() {
  if (folderStack.length === 0) return;
  folderStack.pop();
  if (folderStack.length === 0) {
    renderRoot();
  } else {
    const parent = folderStack[folderStack.length - 1];
    elFolderTitle.textContent = parent.title || '未命名文件夹';
    renderBookmarks(parent.children);
  }
}

/** Find a folder node by ID within the current rendering context. */
function findFolderNodeById(id) {
  let nodes;
  if (folderStack.length === 0) {
    nodes = rootNode ? rootNode.children : null;
  } else {
    nodes = folderStack[folderStack.length - 1].children;
  }
  if (!nodes) return null;
  return nodes.find(n => n.id === id) || null;
}

/* ── Load from Chrome API ──────────────── */

function loadAndRender() {
  loadAndRenderInternal([]);
}

function loadAndRenderInternal(prevFolderIds = []) {
  if (typeof chrome === 'undefined' || !chrome.bookmarks) {
    rootNode = null;
    resetFolderContext();
    showEmpty('仅在扩展模式下可读取书签栏');
    return;
  }

  try {
    chrome.bookmarks.getTree(tree => {
      try {
        if (!tree || !tree[0]) {
          rootNode = null;
          resetFolderContext();
          showEmpty('无法读取书签栏');
          return;
        }
        const barRoot = getBookmarksBar(tree);
        if (!barRoot || !barRoot.children || barRoot.children.length === 0) {
          rootNode = null;
          resetFolderContext();
          showEmpty('书签栏暂无书签');
          return;
        }
        rootNode = barRoot;
        hideEmpty();
        renderRoot();

        // Restore folder path if available
        if (prevFolderIds.length > 0) {
          restoreFolderPath(prevFolderIds);
        }
      } catch (_) {
        rootNode = null;
        resetFolderContext();
        showEmpty('无法读取书签栏');
      }
    });
  } catch (_) {
    rootNode = null;
    resetFolderContext();
    showEmpty('无法读取书签栏');
  }
}

/** Re-read the tree from the API and re-render preserving folder context. */
function refreshFromApi() {
  const prevFolderIds = folderStack.map(f => f.id);
  loadAndRenderInternal(prevFolderIds);
}

/** Restore the deepest still-existing folder path after a re-render. */
function restoreFolderPath(prevFolderIds) {
  if (!rootNode || !rootNode.children) return;
  let currentNodes = rootNode.children;
  const restoredPath = [];

  for (const id of prevFolderIds) {
    const folder = currentNodes.find(n => n.id === id && n.children);
    if (folder) {
      restoredPath.push(folder);
      currentNodes = folder.children;
    } else {
      break; // folder no longer exists
    }
  }

  if (restoredPath.length > 0) {
    folderStack = restoredPath;
    const leaf = folderStack[folderStack.length - 1];
    elFolderHeader.hidden = false;
    elFolderTitle.textContent = leaf.title || '未命名文件夹';
    renderBookmarks(leaf.children);
  }
}

/* ── Click Handling ────────────────────── */

function setupClickHandler() {
  elGrid.addEventListener('click', e => {
    // Only intercept primary-button left clicks without modifier keys
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;

    // Check for folder item first (it also contains a .bookmark-item anchor)
    const folderLi = e.target.closest('.bookmark-folder-item');
    if (folderLi) {
      e.preventDefault();
      const a = folderLi.querySelector('.bookmark-item');
      const folderId = a && a.getAttribute('data-folder-id');
      if (!folderId) return;
      const folderNode = findFolderNodeById(folderId);
      if (folderNode) {
        enterFolder(folderNode);
      }
      return;
    }

    // Bookmark link
    const a = e.target.closest('a.bookmark-item');
    if (!a || !a.href) return;
    e.preventDefault();

    const href = a.href;
    const progressBar = document.getElementById('nav-progress');

    // Stage 1: click pulse
    a.classList.add('click-pulse', 'animate__pulse');

    a.addEventListener('animationend', function onPulseEnd() {
      a.removeEventListener('animationend', onPulseEnd);
      a.classList.remove('click-pulse', 'animate__pulse');

      // Stage 2: nav progress bar
      if (progressBar) {
        progressBar.style.width = '100%';
        progressBar.addEventListener('transitionend', () => {
          window.location.href = href;
        }, { once: true });
      } else {
        window.location.href = href;
      }
    }, { once: true });
  });
}

/* ── Bookmark Change Listeners ─────────── */

function setupBookmarkListeners() {
  try {
    if (chrome.bookmarks.onCreated) {
      chrome.bookmarks.onCreated.addListener(refreshFromApi);
    }
    if (chrome.bookmarks.onRemoved) {
      chrome.bookmarks.onRemoved.addListener(refreshFromApi);
    }
    if (chrome.bookmarks.onChanged) {
      chrome.bookmarks.onChanged.addListener(refreshFromApi);
    }
    if (chrome.bookmarks.onMoved) {
      chrome.bookmarks.onMoved.addListener(refreshFromApi);
    }
  } catch (_) {
    // API may not support listeners in all contexts
  }
}

/* ── Init ──────────────────────────────── */

export function initBookmarks() {
  if (initialized) return;

  elGrid = document.getElementById('bookmarks-grid');
  elSection = document.getElementById('bookmarks-section');
  elFolderHeader = document.getElementById('bookmark-folder-header');
  elBackBtn = document.getElementById('bookmark-back-btn');
  elFolderTitle = document.getElementById('bookmark-folder-title');
  elEmptyState = document.getElementById('bookmark-empty-state');
  elEmptyText = document.getElementById('bookmark-empty-text');

  // Safety: if required DOM elements are missing, we are not on the extension page
  if (!elGrid || !elSection) return;

  initialized = true;

  // Check chrome.bookmarks API availability
  if (typeof chrome === 'undefined' || !chrome.bookmarks) {
    showEmpty('仅在扩展模式下可读取书签栏');
    return;
  }

  // Initial load and render
  loadAndRender();

  // Back button
  elBackBtn.addEventListener('click', goBack);

  // Click handling for bookmark and folder items
  setupClickHandler();

  // Live bookmark change listeners (onCreated, onRemoved, onChanged)
  setupBookmarkListeners();
}
