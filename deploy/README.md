# Event Operations — GitHub builds, manual VPS deployment

Production is a single Node.js / Express + React/Vite image. Existing VPS containers PostgreSQL, Redis, MinIO and Traefik are **not** created, restarted, or deleted by this deployment.

## Architecture

1. On GitHub, manually run **Actions → Manual Build and Publish** from `main`.
2. GitHub-hosted `ubuntu-latest` checks out the code, runs `npm ci` and `npm run lint`, builds the Docker image, and publishes **two tags** pointing to the same build:
   - `ghcr.io/toorajvalaee/event-operations:latest` (moves on the next successful publication)
   - `ghcr.io/toorajvalaee/event-operations:<full Git SHA>` (specific version; don't overwrite these tags)
3. GitHub **does not access the VPS**, and there are **no self-hosted Actions runners or deploy/rollback jobs**.
4. Whenever **you** decide, SSH into the VPS and run `./release.sh`. It pulls `:latest`, extracts the exact registry digest from the pull response, checks whether that digest is already deployed, and updates only the application via Docker Compose.
5. The VPS keeps the last successfully deployed digest for a rollback. Publishing `:latest` **never automatically deploys**.

The only code that deploys is the `release.sh` installed on the VPS. Script upgrades are separate, deliberate maintenance actions.

## Setup once on the VPS

Directory: `/opt/event-operations/production`; user: `deploy`. Keep `stack.env` (may be empty) and `.env.prod` with real secrets, both mode `600`. `deploy/compose.yml` uses the external `traefik-public` Docker network and exposes `tehroonevents.ir` / `www.tehroonevents.ir` through Traefik. Do not commit `.env.prod`.

From a **trusted Windows clone** of the merged `main` branch, copy the reviewed scripts over your working personal SSH connection:

```powershell
scp -i "$HOME\.ssh\eventops_deploy" -P 14978 deploy/compose.yml deploy/release.sh deploy@185.192.113.199:/opt/event-operations/production/
```

Then on VPS (as `deploy`):

```bash
cd /opt/event-operations/production
chmod 750 release.sh
chmod 640 compose.yml
chmod 600 .env.prod stack.env
docker compose version
docker network inspect traefik-public --format '{{.Name}}'
```

Log into GHCR **once** as the `deploy` user if the registry package isn't publicly pullable:

```bash
read -rsp 'GHCR read-only token: ' GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u ToorajValaee --password-stdin
unset GHCR_TOKEN
```

Use a token limited to `read:packages`. Docker normally retains this login in the user's Docker configuration; protect that file and consider using a credential helper. Your already-successful VPS image pull indicates that registry access works.

**GitHub Secrets** `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_SSH_KNOWN_HOSTS`, `GHCR_USERNAME`, and `GHCR_READ_TOKEN` are not used by the new build-only workflow. Remove any no-longer-needed deployment secrets after reviewing other workflows.

## Daily commands on VPS

```bash
cd /opt/event-operations/production

./release.sh            # deploy most recently published :latest image
./release.sh <full-sha> # deploy a specific published 40-character lowercase Git commit SHA
./release.sh rollback   # restore the previous healthy deployment
cat current-image       # currently recorded immutable image digest
cat previous-image      # previous successfully deployed image digest (if any)
```

The `release.sh` refuses overlapping invocations, validates the selected image, deploys by **digest** rather than a moving `:latest` tag, waits for `/api/health`, and records state only after a successful health check. It detects already deployed healthy versions and does nothing. On failure, it attempts to restore the previously successful image. Rollback swaps the current/previous images after success so it can be reversed.

**Note:** `latest` means newest **successfully published** image, not newest version validated on production. Only invoke the script when you're ready to deploy.

## FIRST deployment: legacy container cutover

Currently the legacy `tehroonevents_app` (image `eventoperations-app:latest`) handles the live Traefik hostnames. The replacement Compose app uses the same hostnames. For safety `release.sh` will **refuse to deploy while the legacy container is running**. This is intentional.

Before stopping it:
- Verify the image is published and pullable, Docker network exists, Compose config and `.env.prod` refer to the existing PostgreSQL, Redis and MinIO service endpoints.
- Take backups of PostgreSQL, MinIO, live app configuration and any uploaded files. The legacy container previously had **no Docker mounts**; `/app/data` appeared empty on inspection but other writable directories were not audited.
- Make sure nobody or another orchestrator automatically restarts `tehroonevents_app`.
- Keep a working SSH session and plan a maintenance window (single-app cutover can cause downtime).

Only when ready:

```bash
docker update --restart=no tehroonevents_app
docker stop tehroonevents_app
cd /opt/event-operations/production
./release.sh
```

If this **first** release fails, there is no previous GHCR deployment yet for automatic rollback. First stop the replacement app to avoid conflicting routes, then restart legacy:

```bash
docker ps -aq --filter label=com.docker.compose.project=event-operations-production --filter label=com.docker.compose.service=event-operations | xargs -r docker stop
docker start tehroonevents_app
docker update --restart=unless-stopped tehroonevents_app
```

After any successful deployment verify `docker ps`, application logs, `https://tehroonevents.ir/api/health`, login, object storage and database connectivity. Application rollback does not undo database migrations, and changing `JWT_SECRET` can invalidate existing sessions.

## Security and boundaries

- GitHub-hosted Actions builds only; there are no inbound SSH connections from GitHub and no self-hosted VPS runner.
- Deployment is **manual on the VPS**; `deploy` can access Docker and therefore has root-equivalent privileges. Secure its SSH credentials and GHCR read token.
- Only publish `:latest` from trusted `main`. Protect `main` and the workflow files; a compromised publishing workflow or image would affect the next manual release.
- New Compose attaches only to existing `traefik-public`. Consider adding a private shared back-end network for app-to-PostgreSQL/Redis/MinIO access later. Do not publicly expose service ports.
- Pin GitHub marketplace actions to immutable SHAs for higher assurance. Currently the build checks types; add automated tests when available.
