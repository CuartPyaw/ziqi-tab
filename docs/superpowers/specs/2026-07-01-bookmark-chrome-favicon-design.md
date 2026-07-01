# Bookmark Chrome Favicon Design

## Goal

Use Chrome's built-in favicon lookup for bookmark link icons, replacing the current `origin + /favicon.svg` source.

## Current Context

- Bookmark links render in `js/bookmarks.js`.
- The current in-progress bookmark icon helper derives `https://site.example/favicon.svg` from the bookmark URL origin.
- That does not match Chrome's bookmark bar behavior because many sites publish favicons through `.ico`, `.png`, HTML `<link rel="icon">`, web app manifests, or Chrome's favicon cache.
- Failed bookmark icon images already fall back to the first letter via `fallbackLetter()`.
- Quick links still use `js/links.js` and are outside this change.

## Chosen Approach

Update bookmark rendering only.

For bookmark link nodes:

- Build the icon URL with Chrome MV3's extension favicon endpoint:

  ```js
  chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(node.url)}&size=32`)
  ```

- Add the `favicon` permission to `manifest.json` alongside the existing `bookmarks` permission.
- If the bookmark URL is missing or cannot be parsed, show the first-letter fallback immediately.
- If the favicon image fails to load, replace it with the first-letter fallback.
- Do not use `/favicon.svg` and do not fall back to Simple Icons for bookmarks.

This follows Chrome's documented extension favicon mechanism and keeps the behavior close to the browser's own bookmark bar icon resolution without adding cross-origin page fetching.

## Non-Goals

- No layout or CSS changes.
- No change to folder rendering, bookmark navigation, click animation, or bookmark refresh events.
- No change to quick link icons or custom quick link behavior.
- No manual probing of `/favicon.svg`, `/favicon.ico`, HTML `<link rel="icon">`, or web app manifest icons.
- No third-party favicon service.

## Error Handling

- Invalid or missing bookmark URLs render the first-letter fallback immediately.
- A valid `_favicon` image URL still uses the existing `img.onerror` fallback path.
- If `chrome.runtime.getURL` is unavailable in a test or non-extension-like environment, the helper treats the icon as unavailable and renders the first-letter fallback.

## Testing

- Update bookmark icon tests to assert `_favicon` URLs include the encoded bookmark URL and `size=32`.
- Assert bookmark icons no longer use `/favicon.svg` or `cdn.simpleicons.org`.
- Keep the failed image load fallback test.
- Add or update a test for missing `chrome.runtime.getURL` falling back to a first letter.
- Assert theme changes do not rewrite bookmark favicon URLs.
- Run `npm test -- tests/bookmarks.test.js`.
- Run `npm test`.
