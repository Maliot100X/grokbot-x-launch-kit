# Evidence and provenance

**What was verified for this release (fresh checkout of this repo):** `npm test` → 44/44 passing; `npm run typecheck` and `npm run build` succeed; `npm run example` yields 3 drafts per topic for 2 geographies and identical draft IDs on replay; `scripts/check-repo.mjs` passes.

**History:** the pipeline originated in a private project where it was exercised against real connector reads (worldwide + US) producing 3 pending-review drafts per geography. Those live artifacts are **not** published here; all data in this repo is fictional and labelled as such.

**Honest limits:** snapshot ingest is manual — the pipeline does not fetch from X autonomously. Engagement is evidence of attention, not of truth, and nothing here guarantees reach.
