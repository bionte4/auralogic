#!/bin/sh
set -eu

mkdir -p /app/storage/attachments

# The repository ships schema.prisma without a migrations folder.
# `db push` creates or updates tables without dropping data.
echo "Applying Prisma schema..."
npx prisma db push --skip-generate

exec node dist/main.js
