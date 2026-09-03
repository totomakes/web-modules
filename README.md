# Web Modules

A gallery of web effects and components extracted from sites we like, reverse-engineered from the live DOM and rebuilt as plain drop-in HTML / CSS / JS. No framework, no build step.

Live: https://web-modules-kappa.vercel.app

## Modules

| # | Module | From | Files |
|---|--------|------|-------|
| 01 | [Sticker Displace](modules/sticker-displace/) — background warp behind stickers (SVG turbulence + `backdrop-filter`) | agenius.framer.website | `sticker-displace.js`, `sticker-displace.css` |
| 02 | [Expanding Rows](modules/expanding-rows/) — service rows that open with pills + text, `+` → `×` | agenius.framer.website | `expanding-rows.css`, `expanding-rows.js` |
| 03 | [Circle Text](modules/circle-text/) — spinning text on a circle, reacts to scroll velocity | kaix.framer.website | `circle-text.js`, `circle-text.css` |
| 04 | [Stacked Footer](modules/stacked-footer/) — CTA word that replicates upward via `position: sticky` | kaix.framer.website | `stacked-footer.css` |

## Using a module

1. Copy the module's files next to your page and include them (they auto-initialise).
2. Add the markup shown in the header comment of the CSS/JS file.
3. Tune via `data-*` JSON options or CSS custom properties.

## Adding a module

1. Create `modules/<slug>/` with `index.html` (demo), the module's `.css` / `.js`, and a header comment documenting markup + options + where it came from.
2. In the demo page add the three metas (`wm-module`, `wm-files`, `wm-source`) and include `assets/module-page.css` + `assets/module-page.js` for the dock and code drawer.
3. Append an entry to `modules/registry.json` — the gallery renders from it.

## Local

Any static server works, e.g. `npx serve .`
