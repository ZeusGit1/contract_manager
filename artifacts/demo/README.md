# Contract Manager — Demo bundle

Two files used to demo Contract Manager to leadership outside the firm's Azure / Entra footprint. Synthetic data only — no real client, vendor, or matter content.

## What's here

- **`Contract-Manager-Demo.html`** — single-file standalone demo of the prototype. Embedded synthetic data (vendors, contracts, reviewers, notes, activity), all CSS and JS inline, no network calls. Open in any modern browser; double-click works. Includes hash-based routing across every prototype screen.
- **`build-guide.js`** — Node script that generates the accompanying Word user guide using the `docx` package. Output is styled to the McDermott design system (Georgia headings, navy palette, pale-blue note callouts).

## Regenerating the user guide

```bash
cd artifacts/demo
node build-guide.js
```

Produces `Contract-Manager-Demo-Guide.docx` in the same folder. Requires the `docx` npm package (`npm install docx` in any scratch directory and copy `node_modules` into place, or install globally).

## Notes for the next person opening this

- The HTML is a **prototype rendering**, not a production build. It does not reflect the live application on `dev` — it intentionally shows the demo cuts of the design. See `artifacts/docs/design/` for the design-system source of truth and `web/src/features/contracts/` for the production implementation.
- If you change the demo data inside the HTML, keep it synthetic. No real vendor names, no real matter numbers.
- If the demo and the production app drift apart, look at the gap audit in the conversation that produced this bundle, or ask the analyst to spec the next group of ports.
