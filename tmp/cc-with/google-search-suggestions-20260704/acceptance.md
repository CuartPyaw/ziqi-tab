# Acceptance Criteria

- The extension requests suggestions from Google only.
- The selected search engine still controls the final navigation URL.
- A suggestions panel appears below the search box for non-empty input.
- The panel shows at most 6 suggestions.
- Blank input hides the suggestions panel and does not call `fetch`.
- Requests are debounced by 200ms.
- Older suggestion responses cannot overwrite newer results.
- `ArrowDown` / `ArrowUp` move the highlighted suggestion.
- `Tab` / `Shift+Tab` move the highlight while suggestions are visible.
- `Tab` / `Shift+Tab` still cycle search engines when suggestions are hidden.
- `Enter` with a highlighted suggestion searches that suggestion.
- `Enter` without a highlighted suggestion searches the raw input.
- `Escape` closes the suggestions panel.
- Clicking a suggestion searches immediately.
- Request failures hide suggestions without breaking ordinary Enter-to-search.
- `tests/search.test.js` includes coverage for the new behavior with mocked `fetch`.
- `npx vitest run tests/search.test.js` passes.
- `npx vitest run` passes.
