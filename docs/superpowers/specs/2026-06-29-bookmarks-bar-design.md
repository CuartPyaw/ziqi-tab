# Bookmarks Bar View Design

## Goal

Add a read-only browser bookmarks bar view to Ziqi Tab. The new view sits beside the existing quick links experience and lets users switch between local quick links and their browser's native bookmarks bar from the new tab page.

## Decisions

- Read the browser's native bookmarks bar through the Chrome Extensions `bookmarks` API.
- Add the `bookmarks` permission to `manifest.json`.
- Keep browser bookmarks read-only in Ziqi Tab.
- Show first-level bookmarks and folders from the bookmarks bar.
- Open folders as an in-place folder view with a back control and current folder title.
- Add a settings control for the default content view.
- Keep quick links editable and browser bookmarks non-editable.

## Architecture

### HTML

`newtab.html` gets a lightweight segmented control below the search box and above the content grid:

- `快捷网址`
- `书签栏`

The main content area contains two sibling panels:

- Quick links panel, backed by the existing `links-grid`.
- Bookmarks panel, backed by a new bookmarks grid and folder header.

Only one panel is visible at a time.

### JavaScript

`links.js` remains focused on local quick links:

- Load, save, render, edit, delete, and reorder `ziqi-links`.
- Keep existing click navigation behavior.
- Keep existing theme icon refresh behavior.

Add `js/bookmarks.js`:

- Read bookmarks with `chrome.bookmarks.getTree()`.
- Locate the browser bookmarks bar root.
- Render bookmark nodes and folder nodes.
- Maintain a folder path stack for nested folder navigation.
- Render a folder header when inside a folder.
- Refresh the current view when bookmark events fire.
- Handle unavailable API, empty bookmarks, and read failures with empty states.

Update `app.js`:

- Import and initialize `initBookmarks()`.
- Initialize the shared content-view switcher after quick links and bookmarks are ready.

Update `settings.js`:

- Add a default view setting backed by `localStorage`.
- Store values as `links` or `bookmarks`.
- Dispatch an event when the default view changes so the page can apply it without reload if needed.

### Manifest

Add:

```json
"permissions": ["bookmarks"]
```

This permission is required for reading the browser bookmarks tree.

## Data Flow

### Local Storage

Add one key:

| Key | Purpose | Values |
| --- | --- | --- |
| `ziqi-default-view` | Default content panel shown on new tab load | `"links"` or `"bookmarks"` |

The switcher itself does not rewrite the default setting. It only changes the current visible view. The default is changed from settings.

### Bookmarks

Bookmarks are not copied into `localStorage`.

On each new tab load, `bookmarks.js` reads the current browser bookmarks tree. If Chrome bookmark events fire while the page is open, the module refreshes from the browser API and keeps the user in the closest available current folder.

## UI Behavior

### Content Switcher

- The switcher appears below the search box.
- It uses restrained styling that matches the existing warm paper UI.
- The active option is visually distinct.
- Clicking `快捷网址` shows the quick links panel.
- Clicking `书签栏` shows the bookmarks panel.

### Bookmarks Bar View

At the bookmarks bar root:

- Bookmark nodes with `url` render as link cards.
- Folder nodes without `url` render as folder cards.
- Folder titles use the bookmark title, with a fallback label of `未命名文件夹`.
- Bookmark titles use the bookmark title, with a fallback derived from the URL host.

Inside a folder:

- The grid is replaced with the folder's child nodes.
- A compact header appears above the grid.
- The header contains a back button and the current folder name.
- Clicking back returns to the parent folder.

### Navigation

Bookmark link clicks follow the existing quick-link navigation pattern:

- Plain left-click triggers the pulse animation and top progress bar before navigating.
- Ctrl/Cmd-click, Shift-click, and middle-click use the browser default behavior.
- Folder cards do not navigate.

## Icons

Bookmark link cards use the same icon strategy as quick links:

- Derive a Simple Icons slug from the URL host when possible.
- Use a GitHub color override for dark mode when needed.
- Fall back to a first-letter badge when an icon URL cannot be derived or loaded.

Folder cards use a simple folder icon rendered in CSS/HTML, not an external asset.

## Error And Empty States

The bookmarks view handles these cases without affecting quick links:

- `chrome.bookmarks` is unavailable: show `仅在扩展模式下可读取书签栏`.
- Bookmarks API returns no bookmarks bar or no children: show `书签栏暂无书签`.
- Reading bookmarks fails: show `无法读取书签栏`.
- A configured default view of `bookmarks` with unavailable API still shows the bookmarks empty state and does not rewrite `ziqi-default-view`.

## Settings

Add a `显示` settings tab.

It contains a `默认内容` control with two options:

- `快捷网址`
- `书签栏`

Saving settings persists the selected value to `ziqi-default-view`.

## Testing

Add Vitest/jsdom coverage for:

- Default view loading from `ziqi-default-view`.
- Switching between quick links and bookmarks panels.
- Saving the default view setting.
- Rendering bookmark links and folder cards from mocked `chrome.bookmarks.getTree()`.
- Entering a folder and returning to the parent folder.
- API unavailable empty state.
- Empty bookmarks bar empty state.
- Read failure empty state.
- Bookmark link click behavior for plain left-click and modified clicks.

Tests should mock only the browser API surface needed by the bookmarks module.

## Out Of Scope

- Creating, editing, deleting, or moving browser bookmarks.
- Importing browser bookmarks into `ziqi-links`.
- Searching bookmarks.
- Folder breadcrumbs beyond a single back control and current folder title.
- Configurable icon providers.
