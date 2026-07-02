# Bottom Shortcut Buttons Design

Date: 2026-07-02

## Goal

Add two bottom shortcut buttons to the Ziqi Tab new-tab page:

- Extensions: opens `chrome://extensions`
- History: opens `chrome://history`

The buttons should provide quick access to browser management pages without reading or displaying extension or history data inside Ziqi Tab.

## Selected Approach

Use the existing bottom-right `.settings-bar` as the home for these shortcuts. Add the new buttons alongside the existing settings and theme controls, with this visual order:

1. Extensions
2. History
3. Settings
4. Theme

This keeps all page utility controls in one place and avoids adding a second floating control group.

## Scope

In scope:

- Add two accessible controls to `newtab.html`.
- Reuse the existing `.settings-btn` styling.
- Use inline SVG icons consistent with the current settings/theme controls.
- Navigate to the corresponding `chrome://` page on click.
- Add focused tests that verify the controls exist and point to the intended destinations.

Out of scope:

- Reading installed extensions.
- Reading browser history.
- Adding new Chrome extension permissions.
- Building an in-page panel, drawer, or preview.
- Redesigning the bottom toolbar.

## Implementation Shape

The implementation should stay surgical:

- Prefer anchor elements styled with `.settings-btn` if Chrome permits direct `chrome://` navigation from the extension new-tab page.
- If direct anchors do not behave correctly in tests or browser verification, use buttons with a small click handler that assigns `window.location.href`.
- Keep all styling in the existing `css/settings.css` behavior by reusing `.settings-btn`; add CSS only if spacing or anchor reset rules require it.

## Accessibility

Each shortcut must include:

- A `title` for hover affordance.
- An `aria-label` with the Chinese action label.
- `type="button"` if implemented as a button.
- Decorative SVGs marked `aria-hidden="true"` if the accessible label is supplied by the control.

## Testing

Run the existing Vitest suite after implementation.

Add focused coverage for:

- The extensions shortcut is present and targets `chrome://extensions`.
- The history shortcut is present and targets `chrome://history`.
- Existing settings and theme controls remain present.

## Success Criteria

- The bottom-right toolbar shows Extensions, History, Settings, and Theme controls in that order.
- Clicking the new shortcuts opens the intended browser pages.
- No new permissions are added to `manifest.json`.
- The existing test suite passes.
