# Event Operations — manual GitHub → GHCR → VPS deploy

This matches the existing Node 22 / Vite / Express Dockerfile and ships one app container plus PostgreSQL, Redis and MinIO. **No push trigger**. Workflows: **Actions → Manual Deploy** and **Actions → Manual Rollback**. Review before merging; production deployment is not triggered by merging.

## Required GitHub environment secrets
Create environments `staging` and `production` in repo Settings → Environments. Configure independently:
- `DEPLOY_HOST`: hostname/IP of the VPS
- `DEPLOY_USER`: unprivileged SSH user with docker access (Docker group is effectively root)
- `DEPLOY_PORT`: SSH port (usually 22)
- `DEPLOY_SSH_KEY`: private key for the dedicated deploy user, stored **only** in GitHub Secrets
- `DEPLOY_SSH_KNOWN_HOSTS`: verified SSH host-key entry (verify fingerprint independently; never use StrictHostKeyChecking=no)
- `GHCR_USERNAME`: GitHub user with permission to read the package
- `GHCR_READ_TOKEN`: credential with `read:packages` and repository access if needed.

Protect production via required reviewers, restrict allowed branches, and limit who can edit workflow files. CI uses `GITHUB_TOKEN` with `packages:write` only for the build job. For private GHCR packages, grant the deployment account package read access. The image tag is the checked-out Git commit SHA.

## VPS setup (repeat per environment)
Install Docker Engine + Compose plugin and `flock` (`util-linux`). Create a dedicated deploy account with SSH key authentication. Place reverse proxy upstream at `http://127.0.0.1:3000` (change `HOST_PORT` for staging). Use HTTPS at the proxy; do not expose the app or data-service ports directly. Set an appropriate firewall.

```bash
sudo mkdir -p /opt/event-operations/production
sudo chown -R DEPLOY_USER:DEPLOY_USER /opt/event-operations/production
cd /opt/event-operations/production
# Copy deploy/stack.env.example -> stack.env, and app.env.example -> app.env
chmod 600 stack.env app.env
```
Files `compose.yml` and `release.sh` are copied automatically by the deploy workflow. Set `APP_URL`, `JWT_SECRET`, `ADMIN_SECRET_KEY`, database and MinIO credentials to real unique values in the VPS-only files. Set SMS and storage public URLs appropriately. `stack.env` and `app.env` must never be committed. The workflow needs no VPS root password.

**Migration warning:** Existing `docker-compose.prod.yml` is app-only, possibly talking to database/storage already running on your server. This new stack starts its own PostgreSQL/Redis/MinIO with **new volumes**. It will NOT migrate existing data. Before running against a populated production system, back up PostgreSQL, MinIO objects and `./data`, and choose whether to reuse existing services instead. Do not point this at live production blindly.

## Deploy and rollback
On GitHub Actions → Manual Deploy → Run workflow choose environment and optional ref. The build runs `npm ci` and `npm run lint`, builds Dockerfile, pushes GHCR image and SSH-deploys it. `docker compose up -d --wait` checks health before recording success. If health fails, release.sh attempts to bring back the previously successful application image, then reports failure.

For a deliberate rollback, select Actions → Manual Rollback and supply the **full 40-character SHA** of a previously published commit image. This rolls back the application image, **not database schemas or data**.

### Operational details
- PostgreSQL, Redis and MinIO data are in persistent volumes; app uploads remain in `./data`.
- PostgreSQL and Redis are private to the Compose network; application and MinIO bind to loopback only.
- MinIO bucket is created by an initialization job; public download policy is not enabled by default. Set up access through your reverse proxy/application as appropriate.
- Single app replica may briefly interrupt requests during replace. Use blue-green for zero-downtime.
- New major Postgres/Redis/MinIO upgrades, DB migrations, disaster recovery and off-site backups need separate procedures.
- The current repo uses `npm run lint` as TypeScript verification; it has no test script. Add tests when available.
- GitHub expression refs are pinned to stable major action versions for readability; pin reviewed immutable action SHAs for higher security.
