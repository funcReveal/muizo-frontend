# Repository Guidelines

## Project Structure & Module Organization
This is a Vite + React + TypeScript app with a feature-based layout.
- `src/app`: App shell, providers, routing.
- `src/features`: Feature modules (UI + model per feature).
- `src/shared`: Shared UI, hooks, types, and styles.
- `src/assets`: Static app assets.
- `public`: Static files served as-is.

## Build, Test, and Development Commands
Use `pnpm` as the package manager.
- `pnpm dev`: Start the Vite dev server.
- `pnpm build`: Type-check with `tsc -b` and create a production build.
- `pnpm build-nocheck`: Build without TypeScript checks.
- `pnpm tsc --noEmit`: Fast TypeScript check without building bundles.
- `pnpm lint`: Run ESLint on the codebase.
- `pnpm preview`: Preview the production build locally.
- `pnpm vitest`: Run unit tests when test files are present.

### Validation Workflow
- Use `pnpm build` only when you need full production-build verification.

## Coding Style & Naming Conventions
- Indentation: 2 spaces.
- Quotes: double quotes (match existing files).
- Semicolons: required.
- File naming: `PascalCase` for React components (e.g., `HeaderSection.tsx`), `camelCase` for utility modules.
- Linting: ESLint with TypeScript + React Hooks rules (`eslint.config.js`).
- Styling: Tailwind CSS for utility classes and MUI for component primitives. Prefer consistent tokens/variants within a feature.

## Testing Guidelines
Testing libraries (`vitest`, `@testing-library/react`) are installed, but no test scripts or suites are currently defined. If adding tests, use:
- Naming: `*.test.ts(x)` or `*.spec.ts(x)`.
- Suggested command: `pnpm vitest`.
- Keep tests close to features under `src/features/<Feature>/__tests__`.

## App Architecture Notes
- This repository is the frontend app only. Backend/worker changes should be handled in their own repositories unless explicitly requested.
- Confirm API target before changes (frontend direct-to-worker vs backend-proxied endpoint).
- For socket-related changes, limit connection logic to routes that actually need realtime behavior.
- Overlay layering: `CollectionDetailDrawer` uses z-index 1500; any dialog/sheet opened from inside it must use a higher z-index (e.g., `CollectionReportSheet` uses 1600).

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit-style prefixes:
`feat:`, `fix:`, `refactor:`, plus occasional merges. Keep messages short and scoped (e.g., `feat: add room playlist badges`).

PRs should include:
- A clear summary of the change and rationale.
- Linked issue/task if available.
- Screenshots or GIFs for UI changes (especially in `src/features`).

## Configuration & Environment
Environment variables live in `.env`. Avoid committing secrets; document any new required keys in `README.md`.

## Content, Encoding, and Localization
- Keep all source files UTF-8 encoded.
- Preserve Traditional Chinese UI copy unless explicitly asked to rewrite it.
- Avoid bulk rewrites that risk introducing garbled text.
- For any change touching Chinese copy, run encoding-garble scan before finishing:
  `rg -n --pcre2 "[\x{E000}-\x{F8FF}]" src index.html AGENTS.md`

## SEO Maintenance
- When public-facing pages change, verify page metadata in `index.html`.
- Keep `public/robots.txt` and `public/sitemap.xml` aligned with current public routes.
- Do not include private/edit/invite-style routes in sitemap entries.
