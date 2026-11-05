# Security model

- No credentials are stored, requested, or needed by this code. `.env`, keys, `.data/`, and live artifacts are git-ignored.
- No direct calls to the X API and no browser session scraping. Data enters only via a snapshot you supply.
- No publish/DM methods exist. Drafts are `pending_review` and require human approval in the Grok Bot app.
- Snapshot validation rejects fixtures/mocks, missing metrics, timestamp/ID mismatches, and unretained raw results; it cannot prove data came from X.
- Untrusted post text is never interpolated into drafts (topic labels are sanitised).
- Errors are recorded without raw exception text to avoid leaking secrets.
- Webhook boundary is fail-closed; there is no streaming or crypto implementation, by design.
- `scripts/check-repo.mjs` scans for common token patterns; set `PRIVATE_TERMS=a,b` to also scan for your own handles before publishing a fork.
