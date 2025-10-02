#!/bin/sh
# Simple icon downloader
# Usage: ./icon.sh ICON_NAME [-f] [-r] [-s] [-size 24|48]

icon="$1"
style="outlined"
fill="0"
size="24"

shift
while [ $# -gt 0 ]; do
  case "$1" in
    -f) fill="1" ;;
    -r) style="rounded" ;;
    -s) style="sharp" ;;
    -size) 
      shift
      if [ "$1" = "24" ] || [ "$1" = "48" ]; then
        size="$1"
      else
        echo "Error: Size must be 24 or 48"
        exit 1
      fi
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
  shift
done

[ -z "$icon" ] && { echo "Usage: $0 ICON [-f] [-r] [-s] [-size 24|48]"; exit 1; }

family="materialsymbols${style}"
fill_dir=$([ "$fill" = "1" ] && echo "fill1" || echo "default")
url="https://fonts.gstatic.com/s/i/short-term/release/${family}/${icon}/${fill_dir}/${size}px.svg"

echo "Getting ${icon} (${style}, fill:${fill}, size:${size}px)"
curl -Lf "$url" -o "../angular-client/src/assets/icons/${icon}.svg" && echo "✓ ${icon}.svg" || echo "✗ Failed"