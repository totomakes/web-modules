# Web Modules

A gallery of web effects and components extracted from sites we like, reverse-engineered from the live DOM and rebuilt as plain drop-in HTML / CSS / JS. No framework, no build step.

Live: https://web-modules-kappa.vercel.app

## Modules

| # | Module | From | Files |
|---|--------|------|-------|
| 01 | [Sticker Displace](modules/sticker-displace/) — living background warp behind stickers (animated SVG turbulence + `backdrop-filter`), slider panel that rewrites the markup | agenius.framer.website | `sticker-displace.js`, `sticker-displace.css` |
| 02 | [Expanding Rows](modules/expanding-rows/) — service rows that open with pills + text, `+` → `×` | agenius.framer.website | `expanding-rows.css`, `expanding-rows.js` |
| 03 | [Circle Text](modules/circle-text/) — spinning text on a circle, reacts to scroll velocity | kaix.framer.website | `circle-text.js`, `circle-text.css` |
| 04 | [Stacked Footer](modules/stacked-footer/) — CTA word that replicates upward via `position: sticky` | kaix.framer.website | `stacked-footer.css` |
| 05 | [Grain Field](modules/grain-field/) — animated film-grain layer that boils over any section (canvas noise, no asset) | oberon.framer.website | `grain-field.js`, `grain-field.css` |
| 06 | [Beacon Hero](modules/beacon-hero/) — blueprint grid, per-character headline reveal, nodes deploying on dotted connectors | oberon.framer.website | `beacon-hero.js`, `beacon-hero.css` |
| 07 | [Orbit Stack](modules/orbit-stack/) — integrations diagram: chips on drifting rings, hover to isolate a path | oberon.framer.website | `orbit-stack.js`, `orbit-stack.css` |
| 08 | [FAQ Rail](modules/faq-rail/) — notched tab rail whose category advances as you scroll, so the FAQ keeps going | makro.framer.website | `faq-rail.js`, `faq-rail.css` |
| 09 | [Unfold Hero](modules/unfold-hero/) — 3D-tilted dashboard with scattered cards that flatten on scroll | makro.framer.website | `unfold-hero.js`, `unfold-hero.css` |

## Using a module

1. Copy the module's files next to your page and include them (they auto-initialise).
2. Add the markup shown in the header comment of the CSS/JS file.
3. Tune via `data-*` JSON options or CSS custom properties. Demo pages with a slider panel (`assets/controls.js`) keep the snippet and the URL hash in sync, so a tuned preset is copy-able and shareable.

## Adding a module

1. Create `modules/<slug>/` with `index.html` (demo), the module's `.css` / `.js`, and a header comment documenting markup + options + where it came from.
2. In the demo page add the three metas (`wm-module`, `wm-files`, `wm-source`) and include `assets/module-page.css` + `assets/module-page.js` for the dock and code drawer.
3. Append an entry to `modules/registry.json` — the gallery renders from it.

## Local

Any static server works, e.g. `npx serve .`
