#!/usr/bin/env bash
# Local setup: installs pinned npm dev dependencies from package-lock.json, builds, and runs tests.
# It does not download anything else, needs no credentials, and never posts to X.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Node.js 22+ is required: https://nodejs.org" >&2; exit 1; }
major=$(node -p 'process.versions.node.split(".")[0]')
[ "$major" -ge 22 ] || { echo "Node.js 22+ required (found $(node -v))" >&2; exit 1; }
echo "Review what will be installed: npm ls --all (after install) / package-lock.json"
npm ci
npm run typecheck
npm test
cat <<'MSG'

Setup complete.
Next steps (manual, inside the Grok Bot app):
  1. Add the skill from skills/live-x-research-and-post/SKILL.md (see docs/setup.md).
  2. Paste prompts/grok-bot-setup.md into your Grok Bot.
  3. Try the offline demo:  npm run example
MSG
