# Capabilities

| Capability | Verified code in this repo | Grok Bot X connector (in app) | Optional integrations |
|---|---|---|---|
| Trends (US + worldwide) | Validates/ranks supplied data | Reads trends by WOEID | — |
| Post search + metrics | Validates provenance & metrics | 7-day search with public metrics | — |
| Three evidence-linked drafts | ✅ exactly 3 per topic | Drafting via the skill | — |
| Review/approval state | ✅ `pending_review` state machine | Supported post approval flow | — |
| Publishing / DMs | ❌ none, by design | Only with your explicit approval | — |
| Retries, rate limits, DLQ | ✅ | — | — |
| Scheduled monitoring | Deterministic slots only | App routines (you set them up) | — |
| Native streaming / webhooks | ❌ not faked | Not exposed by the connector at time of writing | Your own server endpoint |
| Images / video | — | Native generation | Canva, Remotion (user-installed) |
| Deep web research | — | Web search | Parallel, Firecrawl (user-installed) |
| Algorithm grounding | Links only | — | [`xai-org/x-algorithm`](https://github.com/xai-org/x-algorithm) |
| Marketing playbooks | Links only | — | [`coreyhaines31/marketingskills`](https://github.com/coreyhaines31/marketingskills) |
| Direct API CLI | — | — | [`xurl`](https://github.com/xdevplatform/xurl) (needs your own X developer app) |
