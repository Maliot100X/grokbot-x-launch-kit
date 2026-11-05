# Architecture

```
Grok Bot X connector reads ──► snapshot JSON (manual contract) ──► parseLiveSnapshot (validation)
                                                                        │
FixtureAdapter (synthetic demo) ─────────────────────────────────────► ResearchAdapter
                                                                        │
                              monitoredResearchAdapter (retries, rate limits, DLQ)
                                                                        │
                                  runOnce: rank → makeDrafts (3 per topic) → JsonStore (atomic)
```

| Module | Responsibility |
|---|---|
| `src/adapters.ts` | `ResearchAdapter` interface (trends + examples). |
| `src/snapshot.ts` | Validates connector snapshots: provenance, raw-result matching, snowflake time checks, geography scopes; archives write-once under `.data/reviews/`. |
| `src/ranking.ts` | Engagement + recency scoring. |
| `src/drafts.ts` | Exactly three variants (question/observation/discussion), label sanitising, guardrails, `pending_review`. |
| `src/pipeline.ts` | Idempotent run per deterministic slot. |
| `src/store.ts` | Atomic JSON state (temp file + rename) with review states and audit. |
| `src/monitoring.ts` | Bounded, jittered retries; 429 handling; dead-letter queue; never stores raw error text. |
| `src/schedule.ts` | Deterministic schedule slots (no scheduler is installed). |
| `src/chat.ts` | Draft-only encrypted chat boundary (no send). |
| `src/cli.ts`, `src/live-cli.ts`, `src/example-cli.ts` | Fixture demo, snapshot ingest, fictional example demo. |

There are **no** publish, reply, or DM methods anywhere in the code.
