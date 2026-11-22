#!/usr/bin/env bash
set -Eeuo pipefail

# Usage: ./release.sh [40-character-commit-sha | rollback]
# Without arguments, deploy the latest SUCCESSFULLY PUBLISHED image from GHCR,
# pinned to its digest. The VPS is changed ONLY when this script is run.
REPO="ghcr.io/toorajvalaee/event-operations"
ROOT="/opt/event-operations/production"
cd "$ROOT"
[[ $# -le 1 ]] || { echo "Usage: ./release.sh [commit-sha|rollback]" >&2; exit 2; }
[[ -f stack.env && -f .env.prod && -f compose.yml ]] || {
  echo "Missing stack.env, .env.prod or compose.yml in $ROOT" >&2
  exit 1
}

exec 9> .deploy.lock
flock -n 9 || { echo "Another release is in progress" >&2; exit 1; }
export DEPLOY_ENV=production
compose() { docker compose --env-file stack.env -f compose.yml "$@"; }

CURRENT=""
PREVIOUS=""
[[ ! -f current-image ]] || CURRENT="$(cat current-image)"
[[ ! -f previous-image ]] || PREVIOUS="$(cat previous-image)"
# Reject modified state files instead of interpreting arbitrary image references.
valid_digest() { [[ "$1" =~ ^ghcr\.io/toorajvalaee/event-operations@sha256:[0-9a-f]{64}$ ]]; }
[[ -z "$CURRENT" ]] || valid_digest "$CURRENT" || { echo "Invalid current-image record" >&2; exit 1; }
[[ -z "$PREVIOUS" ]] || valid_digest "$PREVIOUS" || { echo "Invalid previous-image record" >&2; exit 1; }

if [[ "${1:-}" == rollback ]]; then
  [[ -n "$PREVIOUS" ]] || { echo "No previously successful deployment to roll back to" >&2; exit 1; }
  TARGET="$PREVIOUS"
  echo "Rolling back to $TARGET"
else
  if [[ $# -eq 0 ]]; then
    TAG="$REPO:latest"
  else
    [[ "$1" =~ ^[0-9a-f]{40}$ ]] || {
      echo "Expected a 40-character lowercase Git commit SHA, or rollback" >&2
      exit 2
    }
    TAG="$REPO:$1"
  fi

  echo "Checking published image $TAG"
  # Docker prints the registry's authoritative manifest/index digest for this
  # *specific pull*. Do not pick an arbitrary RepoDigest from a reused local
  # image ID: that could refer to another tag or earlier publication.
  PULL_OUTPUT="$(docker pull "$TAG")"
  printf '%s\n' "$PULL_OUTPUT"
  DIGEST=""
  while IFS= read -r line; do
    if [[ "$line" =~ ^Digest:[[:space:]]sha256:([0-9a-f]{64})[[:space:]]*$ ]]; then
      DIGEST="${BASH_REMATCH[1]}"
    fi
  done <<< "$PULL_OUTPUT"
  [[ -n "$DIGEST" ]] || {
    echo "Could not resolve published GHCR digest for $TAG from pull output" >&2
    exit 1
  }
  TARGET="$REPO@sha256:$DIGEST"
fi

if [[ -n "$CURRENT" && "$CURRENT" == "$TARGET" ]]; then
  export APP_IMAGE="$TARGET"
  ID="$(compose ps -q event-operations)"
  if [[ -n "$ID" ]] && [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$ID")" == healthy ]]; then
    echo "Already running healthy image $TARGET; no deployment needed."
    exit 0
  fi
  echo "Recorded image is not healthy/running; will recover it."
fi

# Existing legacy container uses the SAME Traefik hostname. Never start a
# competing router during first cutover.
if docker ps --format '{{.Names}}' | grep -Fxq tehroonevents_app; then
  echo "CUTOVER BLOCKED: legacy tehroonevents_app is running." >&2
  echo "Back up first; stop legacy only during a scheduled maintenance window." >&2
  exit 1
fi

export APP_IMAGE="$TARGET"
compose config --quiet
mkdir -p data
chmod 700 data
echo "Deploying $TARGET"
compose pull event-operations

if compose up -d --no-deps --wait --wait-timeout 180 event-operations; then
  if [[ -n "$CURRENT" && "$CURRENT" != "$TARGET" ]]; then
    printf '%s\n' "$CURRENT" > previous-image.tmp
    mv -f previous-image.tmp previous-image
  fi
  printf '%s\n' "$TARGET" > current-image.tmp
  mv -f current-image.tmp current-image
  echo "Deployment healthy: $TARGET"
else
  echo "Deployment failed health checks." >&2
  if [[ -n "$CURRENT" && "$CURRENT" != "$TARGET" ]]; then
    echo "Trying to restore last successful image: $CURRENT" >&2
    export APP_IMAGE="$CURRENT"
    if ! compose pull event-operations || ! compose up -d --no-deps --wait --wait-timeout 180 event-operations; then
      echo "AUTOMATIC ROLLBACK FAILED; restore manually." >&2
    fi
  else
    echo "No distinct prior successful image; manual intervention required." >&2
  fi
  exit 1
fi
