# Google Search Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google-powered real-time search suggestions to the new-tab search box while keeping final searches routed through the currently selected engine.

**Architecture:** Keep the feature inside the existing `js/search.js` module. Add a lightweight suggestions panel to the search DOM, fetch Google suggestions with debounce and stale-response protection, and let `Tab`/`Shift+Tab` browse suggestions only while the panel is open. All behavior is covered in `tests/search.test.js` with mocked `fetch`.

**Tech Stack:** Chrome extension (Manifest V3), plain ES modules, DOM APIs, `fetch`, Vitest + jsdom.

**File change map:**

| File | Responsibility |
|------|----------------|
| `manifest.json` | Allow requests to the Google suggestions host |
| `newtab.html` | Add suggestions panel markup near the search input |
| `css/search.css` | Position and style the suggestions dropdown |
| `js/search.js` | Fetch, render, navigate, and apply suggestions |
| `tests/setup.js` | Extend the test DOM skeleton with the suggestions container |
| `tests/search.test.js` | Add failing tests for suggestions behavior and keyboard precedence |

---

### Task 1: Add the suggestions DOM skeleton

**Files:**
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\newtab.html`
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\tests\setup.js`

- [ ] **Step 1: Add the production suggestions container in `newtab.html`**

Update the search area so the wrapper contains a dedicated suggestions panel after the search bar:

```html
<div class="search-wrapper">
  <div class="search-bar" id="search-bar">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
    <input
      type="text"
      id="search-input"
      class="search-input"
      placeholder="搜索…"
      autofocus
      autocomplete="off"
    >
    <div class="engine-dropdown" id="engine-dropdown">
      <button class="engine-icon-btn" id="engine-icon-btn" type="button" title="点击选择搜索引擎 | Tab 循环" aria-haspopup="true" aria-expanded="false">
        <img class="engine-icon" id="engine-icon" src="" alt="" />
        <span class="engine-letter" id="engine-letter" hidden></span>
      </button>
      <button class="engine-chevron-btn" id="engine-chevron-btn" type="button" title="查看所有搜索引擎" aria-hidden="true" tabindex="-1" hidden>
        <svg class="engine-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="engine-menu" id="engine-menu" hidden></div>
    </div>
    <div class="engine-backdrop" id="engine-backdrop" hidden></div>
  </div>
  <div class="search-suggestions" id="search-suggestions" hidden>
    <div class="search-suggestion-list" id="search-suggestion-list" role="listbox" aria-label="搜索建议"></div>
  </div>
</div>
```

- [ ] **Step 2: Mirror the same markup in `tests/setup.js`**

Replace the search-wrapper section in the test DOM skeleton with the same structure so `getElementById('search-suggestions')` and `getElementById('search-suggestion-list')` resolve during module import:

```html
<div class="search-wrapper">
  <div class="search-bar" id="search-bar">
    <svg class="search-icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    <input type="text" id="search-input" class="search-input" placeholder="搜索…" autofocus autocomplete="off">
    <div class="engine-dropdown" id="engine-dropdown">
      <button class="engine-icon-btn" id="engine-icon-btn" type="button" title="点击选择搜索引擎 | Tab 循环" aria-haspopup="true" aria-expanded="false">
        <img class="engine-icon" id="engine-icon" src="" alt="">
        <span class="engine-letter" id="engine-letter" hidden></span>
      </button>
      <button class="engine-chevron-btn" id="engine-chevron-btn" type="button" title="查看所有搜索引擎" aria-hidden="true" tabindex="-1" hidden>
        <svg class="engine-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="engine-menu" id="engine-menu" hidden></div>
    </div>
    <div class="engine-backdrop" id="engine-backdrop" hidden></div>
  </div>
  <div class="search-suggestions" id="search-suggestions" hidden>
    <div class="search-suggestion-list" id="search-suggestion-list" role="listbox" aria-label="搜索建议"></div>
  </div>
</div>
```

- [ ] **Step 3: Sanity check the DOM-only change**

Run:

```bash
npx vitest run tests/search.test.js
```

Expected:

```text
FAIL
```

At this point failures are acceptable because the new suggestions behavior has not been implemented yet; the goal is only to confirm the suite still boots with the expanded DOM.

- [ ] **Step 4: Commit the DOM skeleton**

```bash
git add newtab.html tests/setup.js
git commit -m "refactor(search): add suggestions DOM scaffold"
```

---

### Task 2: Write failing tests for suggestions behavior

**Files:**
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\tests\search.test.js`

- [ ] **Step 1: Add fetch/timer test setup**

Extend the top of `tests/search.test.js` so suggestion tests can control debounce and network responses:

```js
describe('search', () => {
  let fetchMock;

  afterEach(() => {
    delete globalThis.chrome;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    destroySearch();

    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    localStorage.clear();
    localStorage.setItem('ziqi-engine', 'google');
    document.getElementById('engine-icon').src = '';
    document.getElementById('engine-menu').setAttribute('hidden', '');
    document.getElementById('engine-backdrop').setAttribute('hidden', '');
    document.getElementById('engine-chevron-btn').classList.remove('open');
    document.getElementById('search-suggestions').setAttribute('hidden', '');
    document.getElementById('search-suggestion-list').innerHTML = '';
    initSearch();
  });
```

- [ ] **Step 2: Add test helpers used by the new specs**

Add these helpers near `addCustomEngine`:

```js
function queueSuggestionResponse(suggestions) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ['', suggestions],
  });
}

async function typeAndFlushSuggestions(value) {
  const input = document.getElementById('search-input');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await vi.advanceTimersByTimeAsync(200);
  await Promise.resolve();
  return input;
}
```

- [ ] **Step 3: Add the first failing behavior tests**

Append these tests under a new `describe('search suggestions', ...)` block:

```js
describe('search suggestions', () => {
  it('renders suggestions for non-empty input', async () => {
    queueSuggestionResponse(['hello', 'hello kitty']);

    await typeAndFlushSuggestions('hel');

    const panel = document.getElementById('search-suggestions');
    const items = document.querySelectorAll('.search-suggestion');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('hello');
  });

  it('hides suggestions for blank input without calling fetch', async () => {
    const input = document.getElementById('search-input');
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(200);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById('search-suggestions').hasAttribute('hidden')).toBe(true);
  });

  it('uses the highlighted suggestion on Enter', async () => {
    queueSuggestionResponse(['hello', 'hello world']);

    const origLoc = window.location;
    delete window.location;
    const captured = { href: '' };
    window.location = captured;

    const input = await typeAndFlushSuggestions('hel');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(captured.href).toBe('https://www.google.com/search?q=hello');
    window.location = origLoc;
  });

  it('uses Tab to browse suggestions instead of cycling engines while the panel is open', async () => {
    queueSuggestionResponse(['alpha', 'beta']);

    const input = await typeAndFlushSuggestions('a');
    input.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    expect(document.querySelector('.search-suggestion.is-highlighted')?.textContent).toBe('alpha');
    expect(document.getElementById('engine-icon').src).toMatch(/\/icons\/google\.svg$/);
  });
});
```

- [ ] **Step 4: Add stale-response and current-engine coverage**

Add these tests in the same block:

```js
it('ignores stale suggestion responses', async () => {
  let resolveFirst;
  let resolveSecond;

  fetchMock
    .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

  const input = document.getElementById('search-input');
  input.value = 'a';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await vi.advanceTimersByTimeAsync(200);

  input.value = 'ab';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await vi.advanceTimersByTimeAsync(200);

  resolveSecond({ ok: true, json: async () => ['', ['abacus']] });
  await Promise.resolve();
  resolveFirst({ ok: true, json: async () => ['', ['apple']] });
  await Promise.resolve();

  const items = document.querySelectorAll('.search-suggestion');
  expect(items).toHaveLength(1);
  expect(items[0].textContent).toBe('abacus');
});

it('searches with the selected engine after choosing a suggestion', async () => {
  document.getElementById('engine-icon-btn').click();
  document.querySelector('[data-value="bing"]').click();
  document.getElementById('engine-menu').dispatchEvent(new Event('animationend'));

  queueSuggestionResponse(['weather today']);

  const origLoc = window.location;
  delete window.location;
  const captured = { href: '' };
  window.location = captured;

  const input = await typeAndFlushSuggestions('weather');
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  expect(captured.href).toBe('https://www.bing.com/search?q=weather%20today');
  window.location = origLoc;
});
```

- [ ] **Step 5: Verify the new tests fail for the expected reason**

Run:

```bash
npx vitest run tests/search.test.js
```

Expected:

```text
FAIL
```

The new failures should point to missing suggestions DOM behavior, missing `fetch` usage, or missing keyboard handling. If the suite fails for a typo in the test code, fix the test first.

- [ ] **Step 6: Commit the failing tests**

```bash
git add tests/search.test.js
git commit -m "test(search): add failing coverage for google suggestions"
```

---

### Task 3: Implement suggestion state, fetching, and rendering

**Files:**
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\js\search.js`

- [ ] **Step 1: Add the new DOM references and suggestion state**

At the top of `js/search.js`, add the suggestions elements and constants:

```js
const elSuggestions = document.getElementById('search-suggestions');
const elSuggestionList = document.getElementById('search-suggestion-list');

const GOOGLE_SUGGEST_URL = 'https://suggestqueries.google.com/complete/search?client=chrome&q=';
const SUGGESTION_LIMIT = 6;
const SUGGESTION_DEBOUNCE_MS = 200;

let suggestionItems = [];
let highlightedSuggestionIndex = -1;
let suggestionRequestSeq = 0;
let suggestionDebounceTimer = null;
```

- [ ] **Step 2: Extend cleanup so tests can re-initialize safely**

Update `destroySearch()` so it resets the suggestions state:

```js
export function destroySearch() {
  for (const cleanup of _cleanups) cleanup();
  _cleanups.length = 0;
  if (menuKeyHandler) {
    document.removeEventListener('keydown', menuKeyHandler);
    menuKeyHandler = null;
  }
  if (suggestionDebounceTimer) {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = null;
  }
  suggestionItems = [];
  highlightedSuggestionIndex = -1;
  suggestionRequestSeq = 0;
  elSuggestionList.innerHTML = '';
  elSuggestions.setAttribute('hidden', '');
}
```

- [ ] **Step 3: Add the suggestion helper functions**

Insert these helpers before `initSearch()`:

```js
function hideSuggestions() {
  suggestionItems = [];
  highlightedSuggestionIndex = -1;
  elSuggestionList.innerHTML = '';
  elSuggestions.setAttribute('hidden', '');
}

function renderSuggestions() {
  elSuggestionList.innerHTML = '';

  if (suggestionItems.length === 0) {
    elSuggestions.setAttribute('hidden', '');
    return;
  }

  suggestionItems.forEach((text, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-suggestion';
    if (index === highlightedSuggestionIndex) button.classList.add('is-highlighted');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', index === highlightedSuggestionIndex ? 'true' : 'false');
    button.textContent = text;
    button.addEventListener('click', () => {
      elInput.value = text;
      hideSuggestions();
      search(text);
    });
    elSuggestionList.appendChild(button);
  });

  elSuggestions.removeAttribute('hidden');
}

function moveSuggestionHighlight(direction) {
  if (suggestionItems.length === 0) return;
  highlightedSuggestionIndex = (highlightedSuggestionIndex + direction + suggestionItems.length) % suggestionItems.length;
  renderSuggestions();
}

async function fetchSuggestions(query, requestSeq) {
  try {
    const response = await fetch(GOOGLE_SUGGEST_URL + encodeURIComponent(query));
    if (!response.ok) {
      hideSuggestions();
      return;
    }

    const payload = await response.json();
    const nextItems = Array.isArray(payload?.[1]) ? payload[1].slice(0, SUGGESTION_LIMIT) : [];

    if (requestSeq !== suggestionRequestSeq) return;

    suggestionItems = nextItems;
    highlightedSuggestionIndex = -1;
    renderSuggestions();
  } catch (_) {
    if (requestSeq === suggestionRequestSeq) hideSuggestions();
  }
}

function queueSuggestionsFetch(rawValue) {
  const query = rawValue.trim();

  if (suggestionDebounceTimer) {
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = null;
  }

  if (!query) {
    suggestionRequestSeq += 1;
    hideSuggestions();
    return;
  }

  const requestSeq = ++suggestionRequestSeq;
  suggestionDebounceTimer = setTimeout(() => {
    suggestionDebounceTimer = null;
    fetchSuggestions(query, requestSeq);
  }, SUGGESTION_DEBOUNCE_MS);
}
```

- [ ] **Step 4: Verify the suite is still red, but for fewer reasons**

Run:

```bash
npx vitest run tests/search.test.js
```

Expected:

```text
FAIL
```

At least some failures should now move from “no panel/no fetch” to keyboard-selection behavior that is not wired yet.

---

### Task 4: Wire keyboard behavior and search application

**Files:**
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\js\search.js`

- [ ] **Step 1: Add input-driven fetching**

Inside `initSearch()`, register the new `input` listener:

```js
  _addClean(elInput, 'input', () => {
    queueSuggestionsFetch(elInput.value);
  });
```

- [ ] **Step 2: Make Tab choose between suggestions and engine cycling**

Replace the `Tab` branch inside the existing document `keydown` listener with:

```js
    if (e.key === 'Tab' && document.activeElement === elInput) {
      if (!elSuggestions.hasAttribute('hidden')) {
        e.preventDefault();
        moveSuggestionHighlight(e.shiftKey ? -1 : +1);
        return;
      }

      if (elMenu.hasAttribute('hidden')) {
        e.preventDefault();
        cycleEngine(e.shiftKey ? -1 : +1);
        elIconBtn.classList.add('tab-flash');
        elIconBtn.addEventListener('animationend', () => {
          elIconBtn.classList.remove('tab-flash');
        }, { once: true });
      }
    }
```

- [ ] **Step 3: Give the input keydown handler suggestion-aware behavior**

Replace the existing input `keydown` handler with:

```js
  _addClean(elInput, 'keydown', (e) => {
    if (e.key === 'ArrowDown' && !elSuggestions.hasAttribute('hidden')) {
      e.preventDefault();
      moveSuggestionHighlight(+1);
      return;
    }

    if (e.key === 'ArrowUp' && !elSuggestions.hasAttribute('hidden')) {
      e.preventDefault();
      moveSuggestionHighlight(-1);
      return;
    }

    if (e.key === 'Escape' && !elSuggestions.hasAttribute('hidden')) {
      e.preventDefault();
      hideSuggestions();
      return;
    }

    if (e.key === 'Enter') {
      const query = highlightedSuggestionIndex >= 0
        ? suggestionItems[highlightedSuggestionIndex]
        : elInput.value.trim();

      if (!query) return;

      e.preventDefault();
      elInput.value = query;
      hideSuggestions();
      search(query);
    }
  });
```

- [ ] **Step 4: Hide suggestions when the engine menu opens or engine changes**

In `openMenu()` add:

```js
  hideSuggestions();
```

In the `engines-changed` listener add:

```js
    hideSuggestions();
```

- [ ] **Step 5: Verify the targeted tests pass**

Run:

```bash
npx vitest run tests/search.test.js
```

Expected:

```text
PASS
```

If anything still fails, fix the production code now instead of weakening the tests.

- [ ] **Step 6: Commit the search logic**

```bash
git add js/search.js
git commit -m "feat(search): add google search suggestions"
```

---

### Task 5: Add permissions and styling

**Files:**
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\manifest.json`
- Modify: `C:\Users\Aodsp\MyApps\chrome_extensions\ziqi-tab\css\search.css`

- [ ] **Step 1: Add Google host permissions**

Update `manifest.json` to include:

```json
{
  "manifest_version": 3,
  "name": "Ziqi Tab",
  "version": "1.0.0",
  "description": "极简、暖调素纸风格的浏览器起始页",
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "permissions": ["favicon"],
  "host_permissions": ["https://suggestqueries.google.com/*"],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

- [ ] **Step 2: Add the suggestions panel styles**

In `css/search.css`, make `.search-wrapper` the positioning context and append these rules after the search-bar section:

```css
.search-wrapper {
  position: relative;
  width: 100%;
  max-width: var(--search-width, 520px);
}

.search-suggestions {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.35rem;
  z-index: 15;
}

.search-suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.search-suggestion {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font);
  font-size: 0.95rem;
  text-align: left;
  padding: 0.65rem 0.8rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.search-suggestion:hover,
.search-suggestion.is-highlighted {
  background: var(--surface-hover);
}
```

- [ ] **Step 3: Run the targeted suite again**

Run:

```bash
npx vitest run tests/search.test.js
```

Expected:

```text
PASS
```

Style-only changes should not regress the tests.

- [ ] **Step 4: Commit permissions and styling**

```bash
git add manifest.json css/search.css
git commit -m "style(search): add suggestions dropdown styling"
```

---

### Task 6: Run the full suite and manually verify the extension

**Files:**
- Verify only: existing test suite and extension behavior

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npx vitest run
```

Expected:

```text
PASS
```

All existing suites should remain green.

- [ ] **Step 2: Reload the extension and manually verify**

Manual checklist:

- [ ] Type a non-empty query and confirm suggestions appear after a short delay.
- [ ] Press `ArrowDown` / `ArrowUp` and see the highlighted suggestion move.
- [ ] Press `Tab` / `Shift+Tab` while suggestions are visible and confirm the highlight moves without changing the engine.
- [ ] Close the suggestions list and press `Tab` / `Shift+Tab` again to confirm engine cycling still works.
- [ ] Choose a suggestion while Google is selected and confirm the final URL uses Google search.
- [ ] Switch to Bing or DuckDuckGo, choose a suggestion, and confirm the final URL uses the selected engine instead of Google.
- [ ] Disconnect or fail the suggestions request and confirm plain Enter-to-search still works.

- [ ] **Step 3: Make the final feature commit**

```bash
git add -A
git commit -m "feat(search): add google-powered realtime suggestions"
```

---

## Self-review

### Spec coverage

- Google as the single suggestion source: covered in Tasks 3 and 5.
- Suggestions panel under the search box: covered in Tasks 1 and 5.
- Debounce and stale-response protection: covered in Task 3.
- `ArrowUp` / `ArrowDown` / `Enter` / `Escape`: covered in Task 4 and the Task 2 tests.
- `Tab` / `Shift+Tab` prioritizing suggestions over engine cycling: covered in Task 4 and the Task 2 tests.
- Final search still using the current engine: covered in Task 2 tests and Task 4 behavior.
- Silent degradation on request failure: covered in Task 3 and Task 6.

### Placeholder scan

No `TODO`, `TBD`, or “write tests later” placeholders remain.

### Type consistency

The plan consistently uses:

- `search-suggestions`
- `search-suggestion-list`
- `.search-suggestion`
- `.is-highlighted`
- `queueSuggestionsFetch`
- `fetchSuggestions`
- `hideSuggestions`
- `highlightedSuggestionIndex`
