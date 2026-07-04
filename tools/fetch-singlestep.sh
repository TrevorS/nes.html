#!/usr/bin/env bash
# Fetch SingleStepTests JSON files for specific opcodes (hex, lowercase).
# Usage: ./fetch-singlestep.sh a9 ad 69 ...   (or: all)
# Uses sparse git clone since raw.githubusercontent may be blocked.
set -euo pipefail
DEST="$(cd "$(dirname "$0")/../tests/singlestep" && pwd)"
TMP=$(mktemp -d)
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/SingleStepTests/65x02 "$TMP/sst"
cd "$TMP/sst"
git sparse-checkout init --no-cone
if [ "${1:-}" = "all" ]; then
  git sparse-checkout set '6502/v1/*.json'
else
  args=(); for op in "$@"; do args+=("6502/v1/$op.json"); done
  git sparse-checkout set "${args[@]}"
fi
git checkout
cp 6502/v1/*.json "$DEST/"
rm -rf "$TMP"
echo "Done -> $DEST"
