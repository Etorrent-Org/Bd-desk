#!/usr/bin/env sh
set -eu
APP_DIR="${BD_DESK_DIR:-$HOME/www/bd-desk}"
cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main
printf '%s\n' "BD Desk preview updated: $(git rev-parse --short HEAD)"
