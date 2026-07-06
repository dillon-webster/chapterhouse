#!/bin/sh
set -e

# If no AUTH_SECRET was provided, generate one on first boot and persist it in
# the storage volume so sessions survive container recreation. Setting
# AUTH_SECRET in the environment always takes precedence.
if [ -z "$AUTH_SECRET" ]; then
  SECRET_FILE="${STORAGE_DIR:-/data}/.auth-secret"
  if [ ! -f "$SECRET_FILE" ]; then
    mkdir -p "$(dirname "$SECRET_FILE")"
    node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE"
    echo "Generated AUTH_SECRET -> $SECRET_FILE"
  fi
  AUTH_SECRET="$(cat "$SECRET_FILE")"
  export AUTH_SECRET
fi

npx prisma migrate deploy
exec npm run start
