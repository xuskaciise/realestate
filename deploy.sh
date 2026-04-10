#!/usr/bin/env bash
# Deploy latest code and rebuild containers. Intended for the production VPS.
# Usage: ./deploy.sh [branch]
# Requires: git, docker compose plugin, .env in project root.
set -euo pipefail

BRANCH="${1:-main}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Create .env from .env.production.example before deploying." >&2
  exit 1
fi

echo ">>> Pulling origin/${BRANCH}"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo ">>> Building images"
docker compose build

echo ">>> Applying stack (recreates changed containers)"
# Brief switchover is normal with a single app replica. For stricter zero-downtime,
# run two app instances behind Nginx upstream with a load-balancing strategy.
docker compose up -d --remove-orphans

echo ">>> Prisma (first deploy or after schema changes)"
echo "    If you use migrations: docker compose exec app prisma migrate deploy"
echo "    If you use db push:    docker compose exec app prisma db push"

echo ">>> Done. Check: docker compose ps && docker compose logs -f --tail=50 app"
