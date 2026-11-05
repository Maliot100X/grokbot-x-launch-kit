#!/usr/bin/env bash
# Full verification: tests, typecheck, build, demos, SVG XML, local markdown links, sanitation scan.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npm run typecheck
npm run build
node dist/cli.js "$(mktemp -d)/fixture-state.json" >/dev/null
node dist/example-cli.js | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);if(!o.deterministicReplay||o.geographies.some(g=>g.draftCount!==3))process.exit(1);console.log("example: OK (3 drafts per topic, deterministic replay)")})'
node scripts/check-repo.mjs
