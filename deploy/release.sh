#!/usr/bin/env bash
set -Eeuo pipefail
IMAGE="${1:?Usage: release.sh IMAGE ENVIRONMENT}"
ENVIRONMENT="${2:?Missing environment}"
case "$ENVIRONMENT" in staging|production) ;; *) echo "Invalid environment" >&2; exit 1;; esac
[[ "$IMAGE" =~ ^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_.-]+:[0-9a-f]{40}$ ]] || { echo "Invalid image reference" >&2; exit 1; }

ROOT="/opt/event-operations/$ENVIRONMENT"
cd "$ROOT"
[[ -f stack.env && -f .env.prod && -f compose.yml ]] || { echo "Missing stack.env, .env.prod, or compose.yml" >&2; exit 1; }
mkdir -p data
chmod 700 data
exec 9> .deploy.lock
flock -n 9 || { echo "Another deployment is running" >&2; exit 1; }
export DEPLOY_ENV="$ENVIRONMENT"
export APP_IMAGE="$IMAGE"
PREVIOUS=""
[[ -f current-image ]] && PREVIOUS="$(cat current-image)"
compose() { docker compose --env-file stack.env -f compose.yml "$@"; }

if [[ "$ENVIRONMENT" == "production" ]] && docker ps --format '{{.Names}}' | grep -Fxq tehroonevents_app; then
  echo "CUTOVER BLOCKED: legacy tehroonevents_app is running. Schedule a cutover and stop it only after a tested image and rollback plan are ready." >&2
  exit 1
fi

echo "Deploying $IMAGE"
compose config --quiet
compose pull event-operations
if compose up -d --no-deps --wait --wait-timeout 180 event-operations; then
  printf '%s\n' "$IMAGE" > current-image
  [[ -z "$PREVIOUS" ]] || printf '%s\n' "$PREVIOUS" > previous-image
  echo "Healthy deployment: $IMAGE"
else
  echo "Deployment failed health checks" >&2
  if [[ -n "$PREVIOUS" && "$PREVIOUS" != "$IMAGE" ]]; then
    echo "Attempting app rollback to $PREVIOUS" >&2
    export APP_IMAGE="$PREVIOUS"
    compose pull event-operations
    compose up -d --no-deps --wait --wait-timeout 180 event-operations || echo "ROLLBACK FAILED: manual intervention required" >&2
  else
    echo "No previous successful image recorded; manual intervention required" >&2
  fi
  exit 1
fi
