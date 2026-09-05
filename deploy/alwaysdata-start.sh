#!/usr/bin/env sh
set -eu

# UI/QA preview launcher. The edition is selected by BD_DESK_EDITION or its
# private data-file, so the same deployment can run Free or Licensed MVP.
# This instance intentionally uses synthetic fixture data only.
export NODE_ENV="${NODE_ENV:-development}"
export HOST="${HOST:-${IP:-0.0.0.0}}"
export PORT="${PORT:-3096}"
export BD_DESK_DB="${BD_DESK_DB:-$HOME/data/bd-desk-preview.db}"
export BD_DESK_SEED_CSV="${BD_DESK_SEED_CSV:-$HOME/www/bd-desk/tests/fixtures/bdgest-sample.csv}"
EDITION_FILE="${BD_DESK_EDITION_FILE:-$HOME/data/bd-desk-edition}"
if [ -z "${BD_DESK_EDITION:-}" ] && [ -s "$EDITION_FILE" ]; then
  BD_DESK_EDITION="$(cat "$EDITION_FILE")"
fi
export BD_DESK_EDITION="${BD_DESK_EDITION:-free}"
case "$BD_DESK_EDITION" in
  free|licensed) ;;
  *) echo 'BD_DESK_EDITION must be free or licensed' >&2; exit 1 ;;
esac
LICENSE_SECRET_FILE="${BD_DESK_LICENSE_SECRET_FILE:-$HOME/data/bd-desk-license-secret}"
if [ -z "${BD_DESK_LICENSE_SECRET:-}" ] && [ -s "$LICENSE_SECRET_FILE" ]; then
  BD_DESK_LICENSE_SECRET="$(cat "$LICENSE_SECRET_FILE")"
  export BD_DESK_LICENSE_SECRET
fi
WEBHOOK_SECRET_FILE="${WEBHOOK_SIGNING_SECRET_FILE:-$HOME/data/bd-desk-webhook-secret}"
if [ -z "${WEBHOOK_SIGNING_SECRET:-}" ] && [ -s "$WEBHOOK_SECRET_FILE" ]; then
  WEBHOOK_SIGNING_SECRET="$(cat "$WEBHOOK_SECRET_FILE")"
  export WEBHOOK_SIGNING_SECRET
fi

mkdir -p "$(dirname "$BD_DESK_DB")"
exec node "$HOME/www/bd-desk/src/server.js"
