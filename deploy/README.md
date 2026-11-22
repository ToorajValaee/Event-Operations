# Event Operations — manually triggered VPS deployments

This matches the actual `Event-Operations` repository: React/Vite frontend bundled with an Express server in a **single Node.js application image**. The existing PostgreSQL, Redis and MinIO containers are **not** created, restarted or modified by the new Compose file.

## Important: existing production
The VPS currently uses `tehroonevents_app` (image `eventoperations-app:latest`) and external Traefik network `traefik-public`, routing `tehroonevents.ir` and `www.tehroonevents.ir` to container port 3000. New convention:
- Compose project `event-operations-production`
- Compose service `event-operations`
- Traefik router and service `event-operations`
- Image `ghcr.io/<owner>/event-operations:<commit-sha>`
- No `container_name`; Compose generates a scoped name

**Do not deploy yet** until any files inside the unmounted existing container are backed up and a cutover plan is agreed. The old and new Traefik routes must not serve the same hostname simultaneously.

### Confirmed Docker network topology
The existing containers report:
- `tehroonevents_app`: `tehrooneventsir_default`, `traefik-public`
- `postgres`: `postgres_default`, `traefik-public`
- `redis`: `redis_default`, `traefik-public`
- `minio-minio-1`: `minio_default`, `traefik-public`

**Only `traefik-public` is currently common to all four**. The new app joins that existing network to preserve the current database, Redis, and MinIO DNS connectivity. No extra backend network or new database stack is created.

Security follow-up: move PostgreSQL, Redis and MinIO connectivity to a separate shared internal application network when practical. The current Traefik network is shared by numerous unrelated containers; make sure dependency ports are not publicly published.

The inspection of `.Mounts` for `tehroonevents_app` returned **empty**, meaning no Docker bind mounts or volumes are present. The follow-up check on 2026-11-22 showed `/app/data` contains only `.` and `..` (4 KiB): no files in that directory to migrate. Other writable paths are not yet audited. To recheck before cutover:
```bash
docker exec tehroonevents_app sh -c 'ls -lah /app/data 2>/dev/null; du -sh /app/data 2>/dev/null'
```
If files are added before cutover, create the new persistent directory and copy them **before** switching traffic:
```bash
mkdir -p /opt/event-operations/production/data
docker cp tehroonevents_app:/app/data/. /opt/event-operations/production/data/
```
Check for other writable application directories and preserve relevant uploads as well. Never remove the old container before verifying the copied data.

### GitHub environments
Create `production` under Settings → Environments, ideally requiring approval. Staging is intentionally disabled until it has a separate hostname, VPS configuration and credentials. Add per-environment secrets:
- `DEPLOY_HOST`: VPS hostname or IP (production supplied: `185.192.113.199`)
- `DEPLOY_PORT`: SSH port (production supplied: `14978`)
- `DEPLOY_USER`: dedicated deploy user (root was supplied; a dedicated account is strongly preferable)
- `DEPLOY_SSH_KEY`: dedicated SSH private key, entered in GitHub Secrets **not in chat**
- `DEPLOY_SSH_KNOWN_HOSTS`: verified host public-key entry for `[185.192.113.199]:14978`
- `GHCR_USERNAME`, `GHCR_READ_TOKEN`: account/credential with package read access.

CI builds the checked-out Git ref, runs `npm ci` and `npm run lint`, publishes commit-SHA-tagged images to GHCR with ephemeral GitHub package-write permission. No push trigger. Production is explicitly invoked using **Actions → Manual Deploy**. **First choose `build_only: true` (the default)** to validate checkout/build/registry publication without any VPS SSH or Compose changes. Choose `build_only: false` only for the planned cutover.

### Server configuration
Install Docker and Docker Compose plugin and `flock`. Create `/opt/event-operations/production` with `stack.env` and `.env.prod` owned by deploy user (mode 600). Files `compose.yml` and `release.sh` are uploaded by the workflow. Never commit secrets. Preserve real production values in the existing server `.env.prod` and copy securely; rotate passwords accidentally disclosed elsewhere.

**IMPORTANT uploads:** The existing production container has **no mounts**. Any existing files in `/app/data` live in the container writable layer. Before the first deploy, inspect and copy those files to `/opt/event-operations/production/data`, verify permissions and ownership, and confirm no other directories require migration. The new Compose bind-mounts this directory to `/app/data`.

### First-deployment preflight (no production changes)
1. Merge this PR only after reviewing it. Manual GitHub Actions workflows must exist on the default branch to show a **Run workflow** button.
2. Run **Actions → Manual Deploy** with `build_only: true` and `ref_to_deploy: main`; verify `build` succeeds and `deploy` is skipped. Check the commit-SHA image in GHCR. If build fails, do not proceed.
3. Confirm the deploy account can run `docker ps` and `docker compose version`. Verify `/opt/event-operations/production` is writable, that `.env.prod` contains the real application credentials copied securely from the existing deployment, and that `stack.env` exists (`chmod 600` both).
4. Snapshot/back up PostgreSQL, object storage and the existing container configuration before cutover. Confirm `/app/data` is still empty, and audit other writable paths.
5. Record old container state with `docker inspect tehroonevents_app`, and determine how its container will be managed; any external orchestrator may restart it after a manual stop.
6. Test `docker login ghcr.io` (using a read-only credential). Do not expose tokens in terminal history.

### First production cutover (requires a maintenance window)
Existing container `tehroonevents_app` advertises the SAME production hostnames. The release script **refuses to start** if this container is running so that Traefik cannot race between the old and new routers. Stop and disable auto-restart for the legacy container only after confirming a healthy build and explicit rollback plan:
```bash
docker update --restart=no tehroonevents_app
docker stop tehroonevents_app
```
Then manually trigger the workflow with `build_only: false`. Expect a brief downtime. If the first deployment fails, check logs and manually restore the legacy container:
```bash
docker start tehroonevents_app
docker update --restart=unless-stopped tehroonevents_app
```
**Important:** An old Compose management process or external UI may recreate/restart the legacy container, so verify your server's actual source of orchestration before cutover. Never remove it before validating the replacement. Also consider using a temporary non-production hostname and testing the image behind Traefik before the cutover.

### Deployment / rollback
Run **Actions → Manual Deploy**, choose production and the desired branch/tag/SHA. Workflow pulls the app-only image and health-checks `/api/health`. On failure it tries the previous *successfully deployed* image. Manual rollback accepts a full 40-char commit SHA from a previously pushed image. Both operations leave PostgreSQL/Redis/MinIO containers untouched.

The **first deployment** has no previous-image record. Single-container releases can cause a brief interruption. Application image rollback does not roll back database schema or data. Coordinate any DB migrations and take backups.

### Security
- Use a dedicated deploy account rather than root when possible; Docker access remains root-equivalent.
- Rotate any credentials that were pasted into chats or exposed in compose files; keep them exclusively on the VPS.
- Do not expose Postgres, Redis or MinIO publicly; Traefik is the public HTTPS entrypoint.
- The current repo uses `npm run lint` (TypeScript type check); add unit/integration tests.
- Review and pin third-party actions to immutable commit SHAs before high-assurance production use.
