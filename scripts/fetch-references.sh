#!/usr/bin/env bash
# OPTIONAL: clone official public upstream references into ./reference (git-ignored) at pinned commits.
# Nothing is executed from them. Review licenses in each repo before reusing any content.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p reference
fetch() { # name url sha
  if [ ! -d "reference/$1/.git" ]; then git clone --filter=blob:none "$2" "reference/$1"; fi
  git -C "reference/$1" fetch --quiet origin "$3" && git -C "reference/$1" checkout --quiet --detach "$3"
  echo "reference/$1 @ $(git -C "reference/$1" rev-parse --short HEAD)"
}
fetch x-algorithm    https://github.com/xai-org/x-algorithm.git          021afa44cb5c5b10afa773cb52c0f5087603d478
fetch marketingskills https://github.com/coreyhaines31/marketingskills.git 88c79f6528a9347420e57ceb1fff9a60de651768
