# Muizo Design Context

## Visual Thesis

Muizo should feel like a polished music-control surface in a dim room: dark, focused, tactile, and lightly illuminated by album-light colors. The interface can use liquid glass details on entry and modal surfaces, but routine product UI should remain readable and restrained.

## Theme

Dark theme is the default. The assumed scene is a player or host using Muizo during a voice call, stream, or room session where music, timing, and rankings need to stay legible on a monitor or phone.

## Color System

Use the existing app variables as the product base:

- Background: `--mc-bg`, near-black.
- Surface: `--mc-surface`, `--mc-surface-strong`, warm dark neutrals.
- Text: `--mc-text`, warm off-white.
- Muted text: `--mc-text-muted`, warm desaturated beige-gray.
- Primary accent: `--mc-accent`, amber.
- Secondary accent: `--mc-accent-2`, gold.

For newer landing/auth surfaces, OKLCH colors are preferred:

- Cyan/teal accent for account and focus states: `oklch(77% 0.145 162)` or nearby.
- Gold accent for music highlights: `oklch(80% 0.145 82)`.
- Dark blue-green tinted neutrals for liquid glass surfaces.

Accent color should signal action, focus, selected state, and important rhythm. Do not use multiple saturated accents in the same component unless each has a clear role.

## Material System

### Solid Product Surfaces

Use for rooms, tables, settings, collection management, and dense controls.

- Dark opaque backgrounds.
- Thin borders using existing `--mc-border` or low-alpha slate.
- Minimal shadow; shadow should separate layers, not decorate them.

### Liquid Glass Surfaces

Use sparingly for:

- Landing auth panel.
- Auth modal.
- Important entry or onboarding panels.
- Small proof chips or control pills when they sit over atmospheric backgrounds.

Expected properties:

- Semi-transparent dark background.
- Fine translucent border.
- Subtle `backdrop-filter: blur(...) saturate(...)`.
- Inner top highlight.
- One soft refracted highlight or liquid blob, not several decorative blobs.

Avoid applying glass material to large routine dashboards, tables, long lists, and gameplay-critical panels.

## Typography

- Primary UI font: `"OpenHuninn", "Noto Sans TC", sans-serif`.
- Product labels should be compact and readable.
- Use weight and spacing for hierarchy before adding color.
- Keep UI copy short. Body text should stay under 65-75ch where possible.
- Avoid display-font behavior in controls, labels, scores, and form inputs.

## Layout Rules

- First screen should present the usable product entry, not a generic marketing hero.
- Landing layout can use a hero/auth split, but auth is the real conversion surface.
- Forms should be complete in place: Email, password, mode switch, submit, reset, and Google alternative should be visible without extra pre-choice cards.
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
