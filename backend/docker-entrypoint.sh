#!/bin/sh
set -eu

PB_DIR="${PB_DIR:-/pb/pb_data}"
PB_PUBLIC_DIR="${PB_PUBLIC_DIR:-/pb/pb_public}"
PB_HOST="${PB_HOST:-0.0.0.0}"
PB_PORT="${PB_PORT:-8090}"

mkdir -p "$PB_DIR" "$PB_PUBLIC_DIR"

if [ "${1:-}" = "/pb/pocketbase" ] && [ "${2:-}" = "serve" ]; then
  if [ -n "${PB_SUPERUSER_EMAIL:-}" ] || [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
    if [ -z "${PB_SUPERUSER_EMAIL:-}" ] || [ -z "${PB_SUPERUSER_PASSWORD:-}" ]; then
      echo "PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD must both be set." >&2
      exit 1
    fi

    echo "Ensuring PocketBase superuser exists for ${PB_SUPERUSER_EMAIL}"
    /pb/pocketbase superuser upsert "${PB_SUPERUSER_EMAIL}" "${PB_SUPERUSER_PASSWORD}" --dir="$PB_DIR"
  fi

  exec /pb/pocketbase serve --http="${PB_HOST}:${PB_PORT}" --dir="$PB_DIR"
fi

exec "$@"
