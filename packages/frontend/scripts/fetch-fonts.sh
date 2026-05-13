#!/usr/bin/env bash
# =============================================================================
# fetch-fonts.sh — Download Inter (variable, latin subset) for self-hosting.
# -----------------------------------------------------------------------------
# Inter is offered self-hostable + open-source under the OFL. The variable
# WOFF2 file is ~20 KB compressed for the latin subset and covers every
# weight/italic the design uses, replacing 6+ HTTP requests Google Fonts
# would otherwise trigger.
#
# Run once after `git clone`:
#     bash packages/frontend/scripts/fetch-fonts.sh
#
# The output `public/fonts/inter-var-latin.woff2` is committed to keep
# the build hermetic (no network dependency at deploy time).
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/public/fonts"
mkdir -p "$DEST"

# rsms/inter v4.0 stable URL — pinned for reproducibility.
URL="https://github.com/rsms/inter/raw/v4.0/docs/font-files/Inter-roman.var.woff2"
OUT="$DEST/inter-var-latin.woff2"

if [ -f "$OUT" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "✓ $OUT already present — set FORCE=1 to redownload"
  exit 0
fi

echo "→ Downloading Inter variable font from rsms/inter v4.0"
curl -fsSL "$URL" -o "$OUT"

bytes=$(wc -c < "$OUT")
if [ "$bytes" -lt 50000 ]; then
  echo "✗ Download too small ($bytes bytes) — likely an HTML error page" >&2
  rm -f "$OUT"
  exit 1
fi

echo "✓ $OUT  ($((bytes / 1024)) KB)"
echo
echo "Next steps:"
echo "  1. Commit the file:  git add public/fonts/inter-var-latin.woff2"
echo "  2. The @font-face declaration is already in src/index.css"
echo "  3. The preload <link> is already in index.html"
