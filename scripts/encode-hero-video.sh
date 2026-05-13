#!/usr/bin/env bash
# =============================================================================
# encode-hero-video.sh — KitchenXpert hero video encoder
# -----------------------------------------------------------------------------
# Takes ONE master video file (capture OBS 1920×1080 @ 60 fps, MP4 or MKV)
# and produces every artefact needed by `HeroVideo.tsx`:
#
#   public/hero/
#   ├── hero-desktop.webm        ─┐
#   ├── hero-desktop.mp4         ─┤  desktop, ~2 500 kbps
#   ├── hero-desktop-low.webm    ─┤
#   ├── hero-desktop-low.mp4     ─┤  desktop low-bandwidth, ~800 kbps
#   ├── hero-mobile.webm         ─┤
#   ├── hero-mobile.mp4          ─┤  portrait 1080×1920, ~800 kbps
#   ├── hero-poster.jpg              first frame, ~50 KB
#   └── hero-poster@2x.jpg           same first frame at 2×, ~120 KB
#
# Usage:
#   bash scripts/encode-hero-video.sh path/to/master.mp4 [path/to/master-mobile.mp4]
#
# If the mobile master is omitted we crop the desktop master to a 9:16
# centred slice — fine for a quick first iteration, but a real
# portrait recapture is what you want for production.
# =============================================================================

set -euo pipefail

# ---------- Tooling sanity ---------------------------------------------------
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "✗ ffmpeg missing. Install:" >&2
  echo "    macOS    : brew install ffmpeg" >&2
  echo "    Ubuntu   : sudo apt install ffmpeg" >&2
  echo "    Windows  : winget install ffmpeg  (or scoop install ffmpeg)" >&2
  exit 1
fi

# ---------- Inputs -----------------------------------------------------------
SRC_DESKTOP="${1:-}"
SRC_MOBILE="${2:-}"
if [ -z "$SRC_DESKTOP" ] || [ ! -f "$SRC_DESKTOP" ]; then
  echo "Usage: $0 master-desktop.mp4 [master-mobile.mp4]" >&2
  exit 1
fi

OUT="$(cd "$(dirname "$0")/.." && pwd)/packages/frontend/public/hero"
mkdir -p "$OUT"
echo "→ Output → $OUT"

# We cap everything at 30 s. If the master is longer, we trim. Shorter is OK.
MAX_DURATION=30

# Common ffmpeg flags
COMMON=(-y -loglevel warning -stats -t "$MAX_DURATION")

# ---------- Desktop — 1920×1080, ~2 500 kbps, 30 fps -------------------------
echo
echo "════ Desktop, high-bandwidth ════"

# H.264 / MP4 (Safari, iOS, fallback). `-movflags +faststart` puts the
# moov atom at the front of the file → first byte playback.
ffmpeg "${COMMON[@]}" -i "$SRC_DESKTOP" \
  -vf "scale=1920:1080:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -preset slow -profile:v high -level 4.1 \
  -b:v 2500k -maxrate 3000k -bufsize 5000k \
  -movflags +faststart -an \
  "$OUT/hero-desktop.mp4"

# VP9 / WebM (Chrome, Firefox — smaller at the same quality).
# Two-pass for predictable bitrate.
ffmpeg "${COMMON[@]}" -i "$SRC_DESKTOP" \
  -vf "scale=1920:1080:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libvpx-vp9 -b:v 2200k -maxrate 2700k -bufsize 4400k \
  -row-mt 1 -tile-columns 2 -threads 8 \
  -deadline good -cpu-used 2 \
  -an \
  "$OUT/hero-desktop.webm"

# ---------- Desktop — 1280×720, ~800 kbps (Network Information API fallback) -
echo
echo "════ Desktop, low-bandwidth (≤ 2 Mbps) ════"

ffmpeg "${COMMON[@]}" -i "$SRC_DESKTOP" \
  -vf "scale=1280:720:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libx264 -preset slow -profile:v high -level 3.1 \
  -b:v 800k -maxrate 1000k -bufsize 1600k \
  -movflags +faststart -an \
  "$OUT/hero-desktop-low.mp4"

ffmpeg "${COMMON[@]}" -i "$SRC_DESKTOP" \
  -vf "scale=1280:720:flags=lanczos,fps=30,format=yuv420p" \
  -c:v libvpx-vp9 -b:v 700k -maxrate 900k -bufsize 1400k \
  -row-mt 1 -tile-columns 2 -threads 8 \
  -deadline good -cpu-used 2 \
  -an \
  "$OUT/hero-desktop-low.webm"

# ---------- Mobile — 1080×1920 portrait, ~800 kbps ---------------------------
echo
echo "════ Mobile portrait (9:16) ════"

if [ -n "$SRC_MOBILE" ] && [ -f "$SRC_MOBILE" ]; then
  MOBILE_SRC_FILTER="scale=1080:1920:flags=lanczos,fps=30,format=yuv420p"
  MOBILE_SRC="$SRC_MOBILE"
else
  echo "  ↪ no mobile master provided — cropping desktop to a centred 9:16 slice"
  # Crop a 9:16 ribbon from the centre of the 16:9 source.
  MOBILE_SRC_FILTER="crop=ih*9/16:ih,scale=1080:1920:flags=lanczos,fps=30,format=yuv420p"
  MOBILE_SRC="$SRC_DESKTOP"
fi

ffmpeg "${COMMON[@]}" -i "$MOBILE_SRC" \
  -vf "$MOBILE_SRC_FILTER" \
  -c:v libx264 -preset slow -profile:v high -level 4.1 \
  -b:v 800k -maxrate 1100k -bufsize 1800k \
  -movflags +faststart -an \
  "$OUT/hero-mobile.mp4"

ffmpeg "${COMMON[@]}" -i "$MOBILE_SRC" \
  -vf "$MOBILE_SRC_FILTER" \
  -c:v libvpx-vp9 -b:v 700k -maxrate 950k -bufsize 1500k \
  -row-mt 1 -tile-columns 2 -threads 8 \
  -deadline good -cpu-used 2 \
  -an \
  "$OUT/hero-mobile.webm"

# ---------- Poster JPEGs — first frame, optimised for LCP --------------------
echo
echo "════ Poster (first frame, JPEG) ════"

# 1× and 2× variants. Quality 80 = good visual fidelity, < 100 KB.
ffmpeg "${COMMON[@]}" -i "$SRC_DESKTOP" \
  -vf "scale=1280:720:flags=lanczos,format=yuvj420p" \
  -frames:v 1 -q:v 4 \
  "$OUT/hero-poster.jpg"

ffmpeg "${COMMON[@]}" -i "$SRC_DESKTOP" \
  -vf "scale=2560:1440:flags=lanczos,format=yuvj420p" \
  -frames:v 1 -q:v 4 \
  "$OUT/hero-poster@2x.jpg"

# ---------- Summary ----------------------------------------------------------
echo
echo "════ ✅ Done ════"
ls -lh "$OUT" | awk '{ printf "  %-32s %s\n", $9, $5 }'
echo
echo "Next step:"
echo "  1. Inspect each file (open in QuickTime / VLC) to confirm 30 s + no audio"
echo "  2. Upload to Scaleway Object Storage with: aws s3 sync $OUT s3://kitchenxpert-prod-uploads/hero/ --acl public-read --cache-control 'public, max-age=31536000, immutable'"
echo "  3. Update HeroVideo.tsx → CDN_BASE if you front the bucket with a CDN"
