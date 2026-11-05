# Implementation plan: Signal Observatory brand + README v2

1. Generate profile mark, banner, and six scenes with the hero as reference image (native generator). Inspect each; reject garbled text or style drift.
2. Store originals in `docs/brand/originals` and `docs/assets/scenes`; build derived sizes with `scripts/derive-brand.py`; visually check X header crop.
3. Write `BRAND.md`, `docs/brand/README.md`, `docs/brand/prompts.md`, `docs/media-workflows.md`.
4. Guard `scripts/gen-assets.mjs` to write SVG only; extend `scripts/check-repo.mjs` with raster header parsing, expected dimensions, 400 KB budget, and `src`/`href` link checks.
5. Rewrite README (reality banner, five-minute start, prompt, commands, evidence object, replay demo, mermaid architecture, tests, failure recovery, capability comparison, plugins, limits, FAQ).
6. Verify: `npm test && npm run typecheck && npm run build && bash scripts/verify.sh`; private-term scan; one normal commit; one push to `main`. Tags unchanged.
