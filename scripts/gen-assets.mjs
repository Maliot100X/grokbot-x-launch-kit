// Generates the six coordinated README panels (navy/cyan). Illustrative example data only.
import { writeFileSync, mkdirSync } from 'node:fs';
const W=1200,H=420;const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const card=(x,y,w,h,title,lines,accent='#22d3ee')=>`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#0f1d3a" stroke="#1e3a6b"/><rect x="${x}" y="${y}" width="6" height="${h}" rx="3" fill="${accent}"/><text x="${x+22}" y="${y+34}" font-size="18" font-weight="700" fill="#e2f3ff">${esc(title)}</text>${lines.map((l,i)=>`<text x="${x+22}" y="${y+64+i*26}" font-size="15" fill="#9fb7d9">${esc(l)}</text>`).join('')}</g>`;
const frame=(id,kicker,title,body,desc)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t-${id} d-${id}" font-family="Inter,Segoe UI,Helvetica,Arial,sans-serif">
<title id="t-${id}">${esc(title)}</title><desc id="d-${id}">${esc(desc)}</desc>
<defs><linearGradient id="bg-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050b1f"/><stop offset="1" stop-color="#0b1f45"/></linearGradient>
<linearGradient id="ac-${id}" x1="0" x2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#3b82f6"/></linearGradient></defs>
<rect width="${W}" height="${H}" rx="22" fill="url(#bg-${id})"/>
<circle cx="1110" cy="60" r="140" fill="#22d3ee" opacity="0.06"/><circle cx="80" cy="400" r="120" fill="#3b82f6" opacity="0.07"/>
<text x="48" y="58" font-size="14" letter-spacing="3" fill="#22d3ee" font-weight="700">${esc(kicker)}</text>
<text x="48" y="96" font-size="32" font-weight="800" fill="#f1f8ff">${esc(title)}</text>
<rect x="48" y="112" width="120" height="4" rx="2" fill="url(#ac-${id})"/>
${body}
<text x="${W-48}" y="${H-20}" font-size="12" text-anchor="end" fill="#5d7aa6">Illustrative example data — not live X metrics</text></svg>
`;
const panels={
 hero:['GROKBOT · X LAUNCH KIT','Research first. Draft second. Post only with approval.',
  card(48,150,350,210,'1 · Live research',['Trends: worldwide + United States','High-engagement examples','Real URLs, timestamps, metrics'])+
  card(425,150,350,210,'2 · Three drafts',['Question · Observation · Discussion','Evidence-linked, pending review','No virality guarantees'],'#3b82f6')+
  card(802,150,350,210,'3 · You approve',['No auto-posts or auto-DMs','Supported approval flow only','Measure 1h · 6h · 24h'],'#38bdf8'),
  'Three-step flow: live research, three evidence-linked drafts, human approval before any post.'],
 research:['STEP 1','Live research: trends and examples',
  card(48,150,520,210,'Trends by geography',['● United States (WOEID 23424977)   Example Topic Beta','● Worldwide (WOEID 1)                   Example Topic Alpha','Max 10 trends · cache 5 min · bounded retries'])+
  card(600,150,552,210,'Top examples (7-day search)',['Post A   ♥ 1,200   ↻ 180   💬 95','Post B   ♥ 640     ↻ 70    💬 40','Post C   ♥ 210     ↻ 25    💬 30'],'#3b82f6'),
  'Panel showing example trends for the US and worldwide and ranked example posts with engagement metrics.'],
 evidence:['STEP 2','Evidence with provenance',
  card(48,150,1104,210,'Every claim traces back to a retained raw tool result',['sourceTool: x.search_posts_all   rawResultId: search-23424977   retrievedAt: 2026-01-15T18:00:00Z','url: https://x.com/example_user/status/…   createdAt validated against snowflake ID (±60s)','Missing metrics are rejected — never filled with zero. Fixtures and mocks are refused as live input.']),
  'Panel showing provenance fields attached to each evidence post.'],
 drafts:['STEP 3','Three review-gated drafts + optional media',
  card(48,150,350,210,'Question',['“What is your biggest open','question about Example','Topic Beta?”'])+
  card(425,150,350,210,'Observation',['“Explore Example Topic Beta','through the linked examples.”','status: pending_review'],'#3b82f6')+
  card(802,150,350,210,'Discussion + media',['“What should builders','investigate next?”','Optional image via Canva / native'],'#38bdf8'),
  'Panel showing three draft variants, each pending review, with optional media.'],
 approval:['STEP 4','Human approval gate',
  card(48,150,520,210,'Allowed',['✓ Show exact copy + target account','✓ Fresh approval for each post or DM','✓ Publish via supported connector flow'])+
  card(600,150,552,210,'Never',['✗ Auto-posting from routines or agents','✗ Session scraping or pasted tokens','✗ Mass replies, hashtag stuffing, bait'],'#f472b6'),
  'Panel contrasting allowed approval steps with forbidden automation.'],
 monitoring:['STEP 5','Honest monitoring',
  card(48,150,520,210,'Scheduled polling (supported)',['Deterministic slots · idempotent replay','429 → wait for reset, one retry','5xx → jittered backoff, dead-letter queue'])+
  card(600,150,552,210,'Not faked',['Native streaming: not available in connector','Webhooks: fail-closed until you own an endpoint','Encrypted chat: draft-only boundary'],'#3b82f6'),
  'Panel describing supported scheduled polling and capabilities that are deliberately not faked.'],
};
mkdirSync('docs/assets',{recursive:true});
for(const [id,[k,t,b,d]] of Object.entries(panels)) writeFileSync(`docs/assets/${id}.svg`,frame(id,k,t,b,d));
