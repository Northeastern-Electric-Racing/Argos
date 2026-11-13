#!/bin/sh
# Fetches the offline map: OpenStreetMap vector tiles from the newest Protomaps build, down to street level
# (zoom 14), for a 20-mile circle around each venue in map-venues.txt. CI runs it before building the client image.
# Usage: ./fetch-basemap.sh  (writes ../angular-client/src/assets/map/basemap.pmtiles)
set -eu
cd "$(dirname "$0")"

pmtiles_version=1.31.2
radius_m=32187
out=../angular-client/src/assets/map/basemap.pmtiles
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

arch=$(uname -m)
[ "$arch" = aarch64 ] && arch=arm64
release=https://github.com/protomaps/go-pmtiles/releases/download/v$pmtiles_version
case "$(uname -s)" in
  Linux) curl -sfL "$release/go-pmtiles_${pmtiles_version}_Linux_$arch.tar.gz" | tar xz -C "$work" pmtiles ;;
  Darwin)
    curl -sfL -o "$work/pmtiles.zip" "$release/go-pmtiles-${pmtiles_version}_Darwin_$arch.zip"
    unzip -q "$work/pmtiles.zip" pmtiles -d "$work"
    ;;
  *) echo "Run this on Linux, macOS or WSL" >&2; exit 1 ;;
esac

# Daily builds are deleted after about a week, so take the newest
build=$(curl -sf https://build-metadata.protomaps.dev/builds.json | grep -o '"key":"[0-9]*\.pmtiles"' | tail -1 | cut -d'"' -f4)

awk -v radius_m="$radius_m" '
  BEGIN { pi = atan2(0, -1); printf "{\"type\":\"MultiPolygon\",\"coordinates\":[" }
  /^-?[0-9]/ {
    printf "%s[[", (venues++ ? "," : "")
    for (step = 0; step <= 64; step++) {
      angle = 2 * pi * step / 64
      lon = $2 + radius_m * sin(angle) / (111320 * cos($1 * pi / 180))
      lat = $1 + radius_m * cos(angle) / 111320
      printf "%s[%.6f,%.6f]", (step ? "," : ""), lon, lat
    }
    printf "]]"
  }
  END { print "]}" }
' map-venues.txt > "$work/region.geojson"

mkdir -p "$(dirname "$out")"
"$work/pmtiles" extract "https://build.protomaps.com/$build" "$out" --region="$work/region.geojson" --maxzoom=14
