#!/usr/bin/env sh
set -eu

# UI/QA preview launcher for the free alwaysdata account.
# This instance intentionally uses synthetic fixture data only.
export NODE_ENV="${NODE_ENV:-development}"
export HOST="${HOST:-${IP:-0.0.0.0}}"
export PORT="${PORT:-3096}"
export BD_DESK_DB="${BD_DESK_DB:-$HOME/data/bd-desk-preview.db}"
export BD_DESK_SEED_CSV="${BD_DESK_SEED_CSV:-$HOME/www/bd-desk/tests/fixtures/bdgest-sample.csv}"
LICENSE_SECRET_FILE="${BD_DESK_LICENSE_SECRET_FILE:-$HOME/data/bd-desk-license-secret}"
if [ -z "${BD_DESK_LICENSE_SECRET:-}" ] && [ -s "$LICENSE_SECRET_FILE" ]; then
  BD_DESK_LICENSE_SECRET="$(cat "$LICENSE_SECRET_FILE")"
  export BD_DESK_LICENSE_SECRET
fi

mkdir -p "$(dirname "$BD_DESK_DB")"
exec node "$HOME/www/bd-desk/src/server.js"
