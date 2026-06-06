# Collection Library UI Task

## Scope
- Public collection library cards and detail drawer.
- Room lobby playlist replacement and suggestion collection pickers.
- Desktop and mobile layouts.

## Requirements
- Hide the unavailable-song warning exclamation mark in public collection and room lobby collection surfaces.
- Update the public-collection empty-search copy to remove the RoomsHub mention.
- Show category and language chips beside collection titles, with category first and language after it.
- Collapse overflowing mobile title-line chips into a `+N` summary.
- Remove the mobile public-library overflow action menu.
- Show category and language chips in the expanded collection drawer image corner.
- Add category chips to room lobby replacement and suggestion collection cards.
- Move room lobby collection filtering into the search field filter icon popover, matching the public library toolbar pattern.

## Architecture Notes
- Backend collection fields remain authoritative. The frontend only renders provided category and sub-tag keys.
- Shared chip rendering should be reused rather than duplicating category/language ordering logic.
- Virtualized row heights must remain stable when chips are present.

## Validation Checklist
- `pnpm -C muizofrontend tsc --noEmit`
- `pnpm -C muizofrontend lint`
- `rg -n --pcre2 "[\x{E000}-\x{F8FF}]" src index.html AGENTS.md`
- Desktop and mobile visual checks for public library, detail drawer, replacement drawer, and suggestion picker.
