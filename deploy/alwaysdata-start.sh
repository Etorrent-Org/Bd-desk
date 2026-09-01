#!/usr/bin/env sh
set -eu

# UI/QA preview launcher for the free alwaysdata account.
# This instance intentionally uses synthetic fixture data only.
export NODE_ENV="${NODE_ENV:-development}"
export HOST="${HOST:-${IP:-0.0.0.0}}"
export PORT="${PORT:-3096}"
export BD_DESK_DB="${BD_DESK_DB:-$HOME/data/bd-desk-preview.db}"
export BD_DESK_SEED_CSV="${BD_DESK_SEED_CSV:-$HOME/www/bd-desk/tests/fixtures/bdgest-sample.csv}"

mkdir -p "$(dirname "$BD_DESK_DB")"
exec node "$HOME/www/bd-desk/src/server.js"
