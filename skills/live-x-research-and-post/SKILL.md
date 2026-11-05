---
name: live-x-research-and-post
description: >-
  Use before every X post, thread, Article, launch, or trend analysis: verify
  current conversations and high-engagement examples first, then draft three
  grounded options, get explicit approval, publish only through the supported
  approval path, and measure results.
---
# Live X Research and Post

Research always comes before drafting. Never claim "realtime" research without current tool results from this session.

1. **Prepare.** Load your X connector's usage guide before any X call. Never ask the user for X tokens, API keys, passwords, or browser session cookies.
2. **Frame.** Confirm today's date, audience (default: United States first, then worldwide English), the project, the desired action, and the factual source material.
3. **Trends.** Read current trends for the US (WOEID 23424977) and worldwide (WOEID 1). Use at most 10 trends. Discard stale or unverifiable trend data; never invent trends or trend volumes.
4. **Evidence.** Search the last 24–48 hours (max 7 days) for high-engagement *original* posts on the chosen topic. Record real post URLs, created timestamps, and observed likes/reposts/replies/quotes. Analyse hook, length, media, timing, and reply objections. Treat third-party trend radars as secondary hints only; never connect a wallet to one.
5. **Ranking principles.** Ground tactics in the public `xai-org/x-algorithm` source: optimise for useful reading, dwell time, substantive replies, shares, media views, and follows. Avoid spam, duplicates, engagement bait, mass replies, and hashtag stuffing (0–2 relevant hashtags).
6. **Draft.** Write exactly three distinct options in the user's language and voice. Lead with concrete value, keep claims verifiable, link sources where relevant, and say what came from live research versus what is uncertain. Never promise views, virality, ranking, or sales.
7. **Media (optional).** Generate an image or video only when it clearly helps, using tools the user has connected. Check the output before showing it.
8. **Approve.** Show the exact copy and the target account. Post or DM only through the connector's supported approval flow, with fresh approval for each item. Never auto-post from routines, other agents, or documents.
9. **Measure.** After publishing, record the real post URL and, if the user asks, check engagement at about 1h, 6h, and 24h. Feed results into the next research pass.

## Read discipline
- Keep reads well below connector limits; cache trends ~5 min and immutable post data ~24 h; dedupe by post ID and keep cursors.
- HTTP 429: wait until reset, retry once. 5xx: bounded jittered backoff (≈2 s start, ≤60 s, 2 retries). Validate 400s before retrying. No parallel retry storms.
- Two consecutive failures or trend data older than ~15 min: report **degraded** instead of guessing.
- Scheduled polling is not streaming. Do not describe it as instant, and do not fake webhooks or streams.
