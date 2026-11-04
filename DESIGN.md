# Muizo Design Context

## Visual Thesis

Muizo should feel like a polished music-control surface in a dim room: dark, focused, tactile, and lightly illuminated by album-light colors. Solid warm surfaces, controlled amber accents and precise state changes carry the interface. Layering comes from surface contrast and spacing rather than glass or gradients.

## Theme

Dark theme is the default. The assumed scene is a player or host using Muizo during a voice call, stream, or room session where music, timing, and rankings need to stay legible on a monitor or phone.

## Color System

Use the existing app variables as the product base:

- Background: `--mc-bg` (`#141512`), warm graphite.
- Surface: `--mc-surface` (`#20221d`), raised surface: `--mc-surface-strong` (`#2c2f28`).
- Text: `--mc-text` (`#f3f4ee`), secondary text: `--mc-text-muted` (`#b9beb1`).
- Primary accent: `--mc-accent` (`#ffb000`), hover: `--mc-accent-hover` (`#ffc233`), pressed: `--mc-accent-pressed` (`#e69700`).
- Text on primary fills: `--mc-accent-ink` (`#251900`).
- Selected backgrounds: `--mc-accent-soft`, selected edges: `--mc-accent-border`.
- Gold highlight: `--mc-accent-2` (`#f5c542`).

Primary actions use a solid, saturated amber fill with dark text. Dropdown selection uses background and text color without a checkmark. Header account controls use solid neutral surfaces without gradients.

Navigation and tabs use the soft amber background with amber foreground. Inactive states remain neutral. Do not substitute pale amber or gray-brown for interactive primary states. Keep the MUI palette in `src/app/providers.tsx` aligned with these shared CSS tokens. MUI secondary teal is for secondary roles; status colors retain their semantic meanings.

For newer landing/auth surfaces, OKLCH colors are preferred:

- Teal may support account-specific secondary roles; general focus and primary actions use the shared amber tokens.
- Gold accent for music highlights: `oklch(80% 0.145 82)`.
- Dark blue-green tinted neutrals for liquid glass surfaces.

Accent color should signal action, focus, selected state, and important rhythm. Do not use multiple saturated accents in the same component unless each has a clear role.

## Material System

### Solid Product Surfaces

Use for rooms, tables, settings, collection management, and dense controls.

- Dark opaque backgrounds.
- Thin borders using existing `--mc-border` or low-alpha slate.
- Minimal shadow; shadow should separate layers, not decorate them.

### Overlays and entry surfaces

Use the same opaque warm surfaces for login, sheets and dialogs. Reserve shadow for overlays. Do not add glass, corner spotlights or gradients to routine cards. Preview artwork must use the same semantic colors as the real interface.

## Typography

- Primary UI font: `"OpenHuninn", "Noto Sans TC", sans-serif`.
- Product labels should be compact and readable.
- Use weight and spacing for hierarchy before adding color.
- Keep UI copy short. Body text should stay under 65-75ch where possible.
- Avoid display-font behavior in controls, labels, scores, and form inputs.

## Layout Rules

- First screen should present the usable product entry, not a generic marketing hero.
- Landing layout can use a hero/auth split, but auth is the real conversion surface.
- Desktop forms stay complete in place. Mobile landing starts with two login choices; Email expands in place and preserves input when collapsed. Signed-in mobile entry prioritizes Start Play, with collection creation as a secondary action.
- Cards are allowed when the card is the interaction, such as the auth panel. Avoid repeated identical card grids.
- Mobile layouts must avoid horizontal overflow and keep tap targets at least 44px high.

## Auth UI Rules

- Header login should open a full auth modal, not start Google directly.
- Landing auth panel and header auth modal must share the same auth component logic.
- Email login and registration are first-class paths.
- Google login is an alternative path and is still important for YouTube playlist access.
- Error and success messages should be inline and close to the form.
- Password reset should remain available from login mode.
- Email verification resend should remain available after successful registration.

## Motion

- Use 150-250ms transitions for hover, focus, and modal reveal states.
- Motion should communicate state and affordance.
- Avoid bounce, elastic motion, long page-load choreography, and decorative looping animation.
- Respect reduced motion preferences when adding new animations.

## Accessibility

- Every interactive icon-only control needs an accessible label.
- Focus states must be visible on dark and glass surfaces.
- Text over glass must maintain contrast. If contrast is questionable, increase opacity or reduce blur/transparency.
- Do not rely on color alone for error, success, locked, or selected states.

## Anti-Patterns

- Gradient text.
- Thick side-stripe borders on cards or callouts.
- Decorative glass everywhere.
- Purple SaaS gradients.
- Guest-first auth messaging.
- Header login that bypasses Email auth.
- Large marketing claims that do not help users start or operate a room.

## Validation Checklist

- `pnpm tsc --noEmit` for type safety.
- Run ESLint on changed files.
- For changes touching Traditional Chinese copy, run:
  `rg -n --pcre2 "[\x{E000}-\x{F8FF}]" src index.html AGENTS.md`
- For landing/auth changes, verify desktop and 390px mobile width in browser.
- Confirm no horizontal overflow on mobile.

## Shared language, implemented

`src/shared/styles/designTokens.css` owns reusable role tokens; `index.css` owns the base palette. MUI theme defaults in `src/app/providers.tsx` follow the same vocabulary.

| Role | Rule |
| --- | --- |
| Page / panel / raised | `--mc-bg` / `--mc-surface` / `--mc-surface-strong` |
| Main action / selection | Solid amber / amber tint and a single thin edge |
| Correct / incorrect | `--mc-success-*` / `--mc-danger-*`, plus text or icons |
| Panel / card / control / chip radius | 20 / 16 / 12 / 8 px |
| Controls | At least 44 px tap height; primary controls normally 48 px |
| Type | OpenHuninn, 12 px metadata, 14 px body, 16–18 px options, 20–24 px headings |
| Numeric data | Tabular figures, stable alignment |
| Focus | One thin accent border on fields; keyboard outline on buttons |
| Motion | 160 ms interaction, 220 ms reveal, ease-out; no card Y translation |

Game answer states use a neutral raised surface, amber selection, green correct answer and red incorrect selection. Preserve realtime rules, keyboard controls, rank movement, combo events and customization; the material layer does not change these behaviors. `gameSurface.css` is imported after legacy game styles so material rules have a single migration boundary.

Homepage previews use the same CSS variables for their SVG fills and strokes. On mobile, only the visible current card loops; offscreen cards stop. Reduced motion always takes precedence. Desktop preview motion remains hover-triggered.
