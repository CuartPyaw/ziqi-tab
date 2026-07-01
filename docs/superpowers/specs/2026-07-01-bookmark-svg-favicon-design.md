# Bookmark SVG Favicon Design

## Goal

Use each bookmarked site's own SVG favicon for bookmark link icons, and stop using Simple Icons as the bookmark icon source.

## Current Context

- Bookmark links render in `js/bookmarks.js`.
- `renderBookmarkItem()` currently calls `iconUrl(node)` from `js/links.js`, which builds a Simple Icons CDN URL from the bookmark domain.
- Failed bookmark icons currently fall back to the first letter via `fallbackLetter()`.
- Quick links still use `js/links.js` icon behavior and are outside this change.

## Chosen Approach

Update bookmark rendering only.

For bookmark link nodes:

- Derive the icon URL from the bookmark URL origin as `https://site.example/favicon.svg`.
- If the bookmark URL cannot be parsed, show the first-letter fallback immediately.
- If the SVG favicon image fails to load, replace it with the first-letter fallback.
- Do not fall back to Simple Icons for bookmarks.

This keeps the implementation small, avoids extra permissions or cross-origin page parsing, and matches the requested "website SVG icon" behavior.

## Non-Goals

- No HTML fetching to discover alternate `<link rel="icon">` declarations.
- No Google favicon, browser favicon cache, or third-party favicon service.
- No change to quick link icons or the custom quick link icon URL field.
- No change to bookmark layout, folder rendering, navigation, or theme switching behavior beyond removing Simple Icons refresh work for bookmark links.

## Testing

- Add or update bookmark tests to assert SVG favicon URLs are derived from bookmark origins.
- Assert invalid bookmark URLs and failed icon loads fall back to first letters.
- Assert bookmark icon rendering no longer uses Simple Icons.
- Run `npm test`.
