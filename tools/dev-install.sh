#!/bin/sh
# Copies the mod into the Herdr app folder for trying it out, without docking it into your layout
# (place: "none"): open it with  herdr-app do tab.new '{"name":"pw","mod":"pokemon-workers","props":{"demo":true}}'
set -e
APP="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$APP/mods/pokemon-workers"
cp -R "$HERE/mods/pokemon-workers" "$APP/mods/pokemon-workers"
sed -i.bak 's/"place": *"[a-z]*"/"place": "none"/' "$APP/mods/pokemon-workers/mod.json" && rm -f "$APP/mods/pokemon-workers/mod.json.bak"
herdr-app check "$APP/mods/pokemon-workers"
