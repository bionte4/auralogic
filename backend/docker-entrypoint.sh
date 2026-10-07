#!/bin/sh
set -eu

mkdir -p /app/storage/attachments

# Postgres cannot cast enum → text during prisma db push without USING.
# Convert the legacy Track enum first (idempotent), then sync the rest.
if [ -f /app/prisma/sql/pre-push-track-to-text.sql ]; then
  echo "Preparing Track column for text storage..."
  npx prisma db execute --file /app/prisma/sql/pre-push-track-to-text.sql --schema /app/prisma/schema.prisma \
    || echo "Track prep skipped (already text, or SQL tool unavailable)."
fi

# The repository ships schema.prisma without a migrations folder.
# `db push` creates or updates tables without dropping data.
echo "Applying Prisma schema..."
npx prisma db push --skip-generate

exec node dist/main.js
