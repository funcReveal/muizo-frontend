# Frontend architecture

## Ownership

- `src/app` composes providers, route guards and layouts. Routes should load the page they need directly, so an index that re-exports several pages does not accidentally join their loading boundaries.
- `src/features/<Feature>` owns feature UI, state and behavior. Keep reusable state or hooks in `model`, and page-specific presentation in `ui` or the relevant page directory.
- `src/shared` contains UI primitives and infrastructure used across unrelated features. `src/domain` contains product concepts that are independent of a particular feature UI.
- `src/pages` currently contains compatibility wrappers for some routes. Do not create another wrapper unless it adds a real composition boundary; migrate or remove existing wrappers only after checking their consumers.

Cross-feature imports should use a feature's public entry point when available. If a shared operation currently lives under another feature's `ui/components`, move the reusable behavior into its `model` before sharing it. Avoid moving code to `shared` just to eliminate a single dependency.

## Styles

- Product-wide tokens, fonts and resets belong in `src/shared/styles`. Feature and component styles live beside the UI that owns them and are imported by that UI or its feature entry.
- Scope selectors to the owning feature or component. Keep base styles, states and responsive overrides together; avoid relying on unrelated route CSS or import order.
- `RoomSession/ui/roomSessionStyles.css` is a legacy stylesheet shared by several screens. Treat it as a migration source, not a place for new feature styles. Move a coherent group at a time, check all users of its selectors, and verify the desktop and mobile states before removing the original rules.
- Settings effect previews are lazy-loaded; the scoreboard preview still owns a temporary dependency on the legacy room stylesheet. Keep that import with the preview until its shared scoreboard styles can be extracted and compared against the game.
- Do not mix a mechanical CSS split with a visual redesign. Preserve cascade order and shared selectors until their consumers have been identified. Check lazy routes and navigation in both directions because a loaded stylesheet can remain active after navigation.
- Tailwind utilities, MUI primitives and CSS variables are established parts of the project. Use each consistently within a component; global overrides and `!important` should be limited to genuine interoperability needs.

## Validation

Run targeted tests and ESLint for changed modules. For changes to CSS ownership or routing, run a production build and verify the affected routes at desktop and mobile widths, including navigation between them. Check keyboard focus, overlays and reduced motion when relevant. CSS changes can be visually wrong even when component tests pass.
