#!/bin/sh
# Lager app-ikonene for hjemskjermen (assets/ikon-512.png, -192.png og -180.png) fra assets/ikon.svg.
# Kjøres for hånd når ikonet er endret:  sh scripts/lag-ikon.sh
# Bruker forhåndsvisningen i macOS (qlmanage) til å tegne SVG-en, og sips til å skalere ned.
# Ikonet (valgt av Kenny 2026-11-16) er vinkelhake og blyant på merkeblått, uten tekst, fordi
# tekst blir uleselig i ikonstørrelse.
set -e
rot=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d)
qlmanage -t -s 512 -o "$tmp" "$rot/assets/ikon.svg" >/dev/null
for s in 512 192 180; do
  sips -z "$s" "$s" "$tmp/ikon.svg.png" --out "$rot/assets/ikon-$s.png" >/dev/null
done
rm -rf "$tmp"
echo "Laget assets/ikon-512.png, ikon-192.png og ikon-180.png"
