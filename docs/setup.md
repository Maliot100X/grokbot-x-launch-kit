# Setup

## 1. Local (any computer with Node.js 22+)
```sh
git clone https://github.com/Maliot100X/grokbot-x-launch-kit.git
cd grokbot-x-launch-kit
bash scripts/setup.sh      # npm ci + typecheck + tests
npm run example            # offline demo on fictional data
bash scripts/verify.sh     # full checks
```
Inspect-first installer (pinned tag; read before running):
```sh
curl -fsSLo install.sh https://raw.githubusercontent.com/Maliot100X/grokbot-x-launch-kit/v1.0.0/scripts/install.sh
less install.sh
bash install.sh
```

## 2. In your Grok Bot
1. Make sure the built-in **X** connector is connected (the app shows a sign-in card if not — you complete it yourself).
2. Add the skill: send your bot the contents of [`skills/live-x-research-and-post/SKILL.md`](../skills/live-x-research-and-post/SKILL.md) and ask it to *save this as a skill named live-x-research-and-post*. The bot saves it with its own skill tool; you do not need to find a menu.
3. Paste [`prompts/grok-bot-setup.md`](../prompts/grok-bot-setup.md) as a message.
4. Optional plugins (images, video, research): ask your bot to *search plugins for Canva / Remotion / Parallel*, then install and sign in from the card it shows **yourself**. Installation and any paid plan are always your decision.

## 3. Feeding real data
Ask your bot to produce a snapshot per [`docs/snapshot-format.md`](snapshot-format.md), then `npm run live:snapshot -- snapshot.json`. Output lands in the git-ignored `.data/reviews/`.

## 4. Optional references
`bash scripts/fetch-references.sh` clones the official upstream repos at pinned commits into the git-ignored `reference/` folder for reading.

## 5. Enabling CI on your fork
A ready GitHub Actions workflow lives at [`docs/ci/ci.yml`](ci/ci.yml) (Node LTS, `npm ci`, `scripts/verify.sh`). Copy it to `.github/workflows/ci.yml` to enable it; pushing workflow files requires a token with the `workflow` scope.
