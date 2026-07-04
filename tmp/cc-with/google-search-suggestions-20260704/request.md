# Request

Implement Google-powered real-time search suggestions for the new-tab search box.

Use Google as the single suggestion source regardless of which search engine is selected. When the user accepts a suggestion, the final search must still go through the currently selected engine (`Google`, `Bing`, `DuckDuckGo`, or a custom engine).

Honor these interaction rules:

- Show suggestions for non-empty input only.
- Debounce requests by 200ms.
- Ignore stale responses from earlier requests.
- Show at most 6 suggestions.
- `ArrowDown` / `ArrowUp` move the highlighted suggestion.
- `Tab` / `Shift+Tab` browse suggestions while the suggestions panel is open.
- When the suggestions panel is closed, keep the existing `Tab` / `Shift+Tab` engine-cycling behavior.
- `Enter` chooses the highlighted suggestion if one exists, otherwise searches the raw input.
- `Escape` closes the suggestions panel.
- Clicking a suggestion should search immediately.
- Request failures should fail silently and must not break normal Enter-to-search behavior.

Keep the change minimal and consistent with the existing code style. Do not introduce a background script or unnecessary abstractions.
