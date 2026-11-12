#!/bin/sh
set -eu

if [ -n "${DB_PASSWORD_FILE:-}" ]; then
  DB_PASSWORD=$(cat "$DB_PASSWORD_FILE")
  export DB_PASSWORD
fi
if [ -n "${CURSOR_SECRET_FILE:-}" ]; then
  CURSOR_SECRET=$(cat "$CURSOR_SECRET_FILE")
  export CURSOR_SECRET
fi
if [ -n "${DB_ADMIN_PASSWORD_FILE:-}" ]; then
  DB_ADMIN_PASSWORD=$(cat "$DB_ADMIN_PASSWORD_FILE")
  export DB_ADMIN_PASSWORD
fi

exec "$@"
