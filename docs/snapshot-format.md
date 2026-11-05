# Manual snapshot contract, version 1

No snapshot data is bundled here. Parent must supply real supported-tool results and exact request/retrieval provenance. Do not convert fixture data into live records by changing its mode. Tests construct explicitly documented in-memory test doubles and write only to temporary directories; those are not live research.

## Command

```sh
npm run live:snapshot -- /absolute/path/to/parent-produced-snapshot.json
# Or after build:
node dist/live-cli.js /absolute/path/to/parent-produced-snapshot.json
```

Run from the repository root. The CLI writes ONLY `.data/reviews/live-<contentHash>-snapshot.json` and `.data/reviews/live-<contentHash>-<woeid>-state.json`. It has no live connector calls and never falls back to fixture data. Input file max 20 MiB.

## JSON shape (field descriptions, not runnable evidence)

Top-level fields:

- `schemaVersion`: number `1`.
- `mode`: literal `"live"`.
- `snapshotId`: nonempty parent capture identifier, without fixture/synthetic/mock/placeholder markers.
- `capturedAt`: actual ISO timestamp with timezone after all retrievals; not later than execution clock.
- `rawResults`: array of `{id, sourceTool, result}`. `id` uniquely identifies a retained raw result. `result` is the exact JSON value returned by the supported tool (plain JSON or MCP `content[].text` JSON wrappers). No request authorization headers, credentials, key material or tokens. Do not replace raw results with reconstructed normalized records.
- `geographies`: exactly two records: `{woeid:1, geography:"worldwide", topics:[...]}` and `{woeid:23424977, geography:"United States", topics:[...]}`.

Each `topics` item:

```
{
  trend: {
    name: <exact trend_name from source>,
    url: <actual https://x.com/search?q=... URL>,
    sourceId?: <actual source trend ID, only if tool supplied one>,
    provenance: <trend provenance below>
  },
  posts: [<searched source posts below>]
}
```

`sourceId` must not be invented. Trend tools commonly have no source ID; the adapter generates a clearly local hash of geography + search URL as its pipeline topic ID. A source ID, if provided, must match `id` in the referenced raw trend object. Preserve any additional source trend volume/metadata inside the original raw result; it is not invented or used for ranking.

Each post:

```
{
  id: <actual numeric X post ID string>,
  url: <actual source https://x.com/<handle-or-i>/status/<id> URL>,
  text: <exact source post text>,
  createdAt: <source created_at timestamp with timezone>,
  metrics: {likes: <like_count>, reposts: <retweet_count>, replies: <reply_count>, quotes: <quote_count>},
  provenance: <post provenance below>
}
```

All four metrics must exist and be nonnegative safe integers. Do not silently fill missing metrics with zero. Missing `created_at`, text, source IDs, raw source metrics or timestamps must be fixed by supported field-request reads by the parent, not fabricated. The adapter supports modern 15–20 digit numeric X snowflake IDs only, bounded to unsigned 64-bit; decoded snowflake time must match source creation time within 60 seconds. This check rejects format/time mismatches and known fixture IDs, **not all possible fabrications**. Older/legacy non-snowflake post IDs are deliberately unsupported.

Every trend/post `provenance` record:

```
{
  origin: "parent-supported-connector",
  retrievedAt: <actual tool completion ISO timestamp with timezone>,
  woeid: <1 or 23424977>,
  geography: <"worldwide" or "United States">,
  query: <exact search query, or exact serialized trends request>,
  sourceTool: <"x.get_trends_by_woeid" for trends; "x.search_posts_all" for searched posts>,
  rawResultId: <matching rawResults[].id>,
  parameters?: <original non-secret request argument object, including start_time and requested fields>
}
```

`parameters` should preserve the actual weekly `start_time`/query/fields to audit scope; the pipeline cannot infer omitted request parameters from response bodies. `query` is required and cannot be empty. WOEID on searched posts is **the trend-selection geography**, not a claim about post author location or a geo-restricted X search. A post may legitimately appear in both geographies with separate provenance. Geography may never be silently inferred from an author profile.

The parser cross-checks the normalized trend name/URL with a matching raw `trend_name` (or `name`) and `url`; posts must match referenced raw `id`, `text`, `created_at` (or `createdAt`), and `public_metrics.{like_count,retweet_count,reply_count,quote_count}`. If raw post `url` exists it must exactly equal the supplied source URL. Raw outputs with other shapes need a reviewed versioned normalizer, not invented source records. Raw result IDs/tool names must match provenance. Explicit synthetic flags and fixture provenance reject. This validates internal consistency, **not cryptographic origin**; a forged but internally consistent JSON can pass. Parent capture integrity is a trust prerequisite.

## Weekly selection and output

Live-snapshot ingestion defaults to **168 hours**, approved for the parent's last-seven-day searches. Fixture/general `runOnce` default remains **48 hours**. Both the trend's retrieval age and post creation age must be within the chosen bound; all post creation timestamps must be <= their retrieval, retrieval <= capture <= execution. `maxAgeHours` is library-configurable only up to 168 (CLI uses 168); a stricter window can reject the older US results. Original timestamps and engagement never get refreshed or rewritten to make a post eligible.

For each geography, rank eligible topics using the documented sum of top-three evidence scores. Select **one** highest-ranked topic, generate exactly **three** question/observation/discussion drafts. Therefore exactly **six** drafts total for the required two-geography input. If either geography lacks eligible evidence, validation fails before writing any snapshot/state. Candidate count does not multiply drafts. Templates never copy post claims or text; hashtags are rendered as plain topic words, links and mentions in labels are stripped. All drafts remain `pending_review` with source `connector`, original topic/evidence provenance, source URLs, timestamps, metrics and ranking scores.

Archive is a SHA-256-addressed serialization of the complete validated snapshot (raw JSON values preserved; not original transport bytes). Each geography has a separate state file. Slot includes content hash, geography and age window. Repeated input/window replays the same drafts while the snapshot still meets the execution-time freshness checks. Different JSON order or changed content can change content hash; deduplication is capture-based, not semantic dedup across captures. Each snapshot contains its own fixed evidence set; searches are not refreshed by this program. Age windows can change selected topic; use a new capture for materially changed selection policy.

Writes are atomic for each draft-state file under the local store's lock, **not a cross-geography transaction**. Both scopes are preflighted before archiving, but an I/O failure after the first scope can leave a partial batch. Re-run identical input/window to replay the first and finish the second. Never edit or remove a live state to manufacture a successful run. Archives use exclusive writes and reject existing mismatched content. See README for stale-lock and power-loss limits.

## How a Grok Bot user produces a snapshot

The pipeline does **not** call X itself. Ask your Grok Bot to run its supported X connector reads (trends for WOEID 1 and 23424977, then a 7-day English search per selected trend with `created_at` and `public_metrics`), and save the exact tool results plus provenance in this shape. Then run `npm run live:snapshot -- /path/to/snapshot.json`. See [`docs/examples/snapshot.example.json`](examples/snapshot.example.json) for a complete **fictional** example (`npm run example`).
