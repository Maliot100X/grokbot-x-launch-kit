#!/usr/bin/env bash
# Inspect-first installer. Recommended use (never pipe to bash blindly):
#   curl -fsSLo install.sh https://raw.githubusercontent.com/Maliot100X/grokbot-x-launch-kit/v1.0.0/scripts/install.sh
#   less install.sh          # read it
#   bash install.sh
# Clones the kit at a pinned tag, shows the commit for you to check, then runs scripts/setup.sh.
set -euo pipefail
REF="${REF:-v1.0.0}"; DIR="${DIR:-grokbot-x-launch-kit}"
git clone --depth 1 --branch "$REF" https://github.com/Maliot100X/grokbot-x-launch-kit.git "$DIR"
echo "Cloned $REF at commit $(git -C "$DIR" rev-parse HEAD)"
read -r -p "Inspect $DIR now if you like. Run scripts/setup.sh (npm ci + tests)? [y/N] " ok
[ "${ok:-n}" = y ] && bash "$DIR/scripts/setup.sh" || echo "Skipped. Run: bash $DIR/scripts/setup.sh"
