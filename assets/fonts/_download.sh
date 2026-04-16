#!/usr/bin/env bash
# Phase 4a — download Google-hosted woff2 files for vendoring.
# Keeps the same per-subset split Google uses so browser download is
# range-driven (Latin speakers never fetch Cyrillic, etc).
# Run once; the files are then committed to the repo.
set -euo pipefail

cd "$(dirname "$0")"

declare -a MAP=(
  "6NUQ8FmMKwSEKjnm5-4v-4Jh2d1he-Wv.woff2 alfa-slab-one-vietnamese.woff2"
  "6NUQ8FmMKwSEKjnm5-4v-4Jh2dxhe-Wv.woff2 alfa-slab-one-latin-ext.woff2"
  "6NUQ8FmMKwSEKjnm5-4v-4Jh2dJhew.woff2   alfa-slab-one-latin.woff2"
  "NaPZcZ_fHOhV3IpLRvJCkyo.woff2          cutive-latin-ext.woff2"
  "NaPZcZ_fHOhV3IpLSPJC.woff2             cutive-latin.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2 inter-400-cyrillic-ext.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2 inter-400-cyrillic.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2 inter-400-greek-ext.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2 inter-400-greek.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2 inter-400-vietnamese.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2 inter-400-latin-ext.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2    inter-400-latin.woff2"
)

# Inter 400 and 600 share per-subset URLs EXCEPT Google distinguishes weights
# by path — but the CSS we fetched uses the same woff2 URLs for 400 and 600.
# Re-fetch 600-specific subset hash list explicitly to be safe.
# (Inspection of the CSS output in phase 4 spec revealed 400 and 600
# resolve to the same URL; we still copy to distinct filenames for clarity
# and future-proofing in case Google diverges.)
declare -a INTER600=(
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2 inter-600-cyrillic-ext.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2 inter-600-cyrillic.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2 inter-600-greek-ext.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2 inter-600-greek.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2 inter-600-vietnamese.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2 inter-600-latin-ext.woff2"
  "UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2    inter-600-latin.woff2"
)

UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

fetch_one() {
  local entry="$1" base
  local src="${entry%% *}"
  local dst="${entry##* }"
  # Alfa Slab One / Cutive / Inter live under different path prefixes
  case "$dst" in
    alfa-slab-one-*) base="alfaslabone/v21/$src" ;;
    cutive-*)        base="cutive/v24/$src" ;;
    inter-*)         base="inter/v20/$src" ;;
  esac
  local url="https://fonts.gstatic.com/s/$base"
  curl -s -A "$UA" -o "$dst" "$url" -m 20
  printf "%s -> %s\n" "$(stat -c%s "$dst" 2>/dev/null || echo '?') bytes" "$dst"
}

for entry in "${MAP[@]}" "${INTER600[@]}"; do fetch_one "$entry"; done
