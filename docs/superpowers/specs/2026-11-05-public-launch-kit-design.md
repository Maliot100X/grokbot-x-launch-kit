# Design: public Grok Bot X launch kit (approved 2026-11-05)

**Goal:** a reusable, MIT-licensed starter that lets any Grok Bot user run research-first X launches.

**Approved scope**
- TypeScript pipeline (trends → ranked evidence → exactly 3 review-gated drafts per topic), atomic JSON state, deterministic slots, bounded retries/DLQ, fail-closed webhook and draft-only chat boundaries. No publish/DM methods.
- Generic `live-x-research-and-post` skill, setup prompt, agent profile.
- Six coordinated navy/cyan SVG panels: hero, research, evidence, drafts/media, approval, monitoring.
- Fictional example snapshot (`docs/examples/snapshot.example.json`) driving an offline demo.
- Upstream references (`xai-org/x-algorithm`, `coreyhaines31/marketingskills`) are linked and optionally cloned at pinned SHAs into an ignored `reference/` folder — never vendored.

**Excluded:** private handles, account data, live-run artifacts, logs, credentials, third-party skill bodies, session scraping, direct API scraping, auto-posting, fake streaming/crypto.

**Plan:** copy pipeline source/tests → strip private strings and change default output to `.data/` → add example CLI + test → docs/prompts/skill → scripts → SVG generator → CI → local verify (tests, typecheck, build, link/SVG/secret scan) → create public repo and push once.
