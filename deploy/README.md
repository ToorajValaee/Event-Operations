# Event Operations — manually triggered VPS deployments

This matches the actual `Event-Operations` repository: React/Vite frontend bundled with an Express server in a **single Node.js application image**. The existing PostgreSQL, Redis and MinIO containers are **not** created, restarted or modified by the new Compose file.

## Important: existing production
The VPS currently uses `tehroonevents_app` (image `eventoperations-app:latest`) and external Traefik network `traefik-public`, routing `tehroonevents.ir` and `www.tehroonevents.ir` to container port 3000. New convention:
- Compose project `event-operations-production`
- Compose service `event-operations`
- Traefik router and service `event-operations`
- Image `ghcr.io/<owner>/event-operations:<commit-sha>`
- No `container_name`; Compose generates a scoped name

**Do not deploy yet** until the existing dependency Docker network is identified and a cutover plan is agreed. The old and new Traefik routes must not serve the same hostname simultaneously.

### Discover existing backend network
On the VPS run:
```bash
docker network ls
docker inspect tehroonevents_app postgres redis minio-minio-1 --format '{{.Name}}: {{range $name, $settings := .NetworkSettings.Networks}}{{printf "%s " $name}}{{end}}'
docker inspect tehroonevents_app --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```
Set `EVENTOPS_BACKEND_NETWORK` in `stack.env` to a network that contains PostgreSQL, Redis **and** MinIO. If no shared network exists, design an explicit dependency network or attach only the required containers to a new network after reviewing existing applications. Avoid connecting databases to the public-facing Traefik network.

### GitHub environments
Create `staging` and `production` under Settings → Environments, ideally requiring approval for production. Add per-environment secrets:
- `DEPLOY_HOST`: VPS hostname or IP (production supplied: `185.192.113.199`)
- `DEPLOY_PORT`: SSH port (production supplied: `14978`)
- `DEPLOY_USER`: dedicated deploy user (root was supplied; a dedicated account is strongly preferable)
- `DEPLOY_SSH_KEY`: dedicated SSH private key, entered in GitHub Secrets **not in chat**
- `DEPLOY_SSH_KNOWN_HOSTS`: verified host public-key entry for `[185.192.113.199]:14978`
- `GHCR_USERNAME`, `GHCR_READ_TOKEN`: account/credential with package read access.

CI builds the checked-out Git ref, runs `npm ci` and `npm run lint`, publishes commit-SHA-tagged images to GHCR with ephemeral GitHub package-write permission. No push trigger. Production is explicitly invoked using **Actions → Manual Deploy**.

### Server configuration
Install Docker and Docker Compose plugin and `flock`. Create `/opt/event-operations/production` with `stack.env` and `.env.prod` owned by deploy user (mode 600). Files `compose.yml` and `release.sh` are uploaded by the workflow. Never commit secrets. Preserve real production values in the existing server `.env.prod` and copy securely; rotate passwords accidentally disclosed elsewhere.

**IMPORTANT uploads:** The old container uses `./data:/app/data`. Determine the existing host path with `docker inspect`, back it up, and migrate/copy or mount that exact path so no uploads disappear. The example new mount `./data` is not an automatic migration.

### Deployment / rollback
Run **Actions → Manual Deploy**, choose production and the desired branch/tag/SHA. Workflow pulls the app-only image and health-checks `/api/health`. On failure it tries the previous *successfully deployed* image. Manual rollback accepts a full 40-char commit SHA from a previously pushed image. Both operations leave PostgreSQL/Redis/MinIO containers untouched.

The **first deployment** has no previous-image record. Single-container releases can cause a brief interruption. Application image rollback does not roll back database schema or data. Coordinate any DB migrations and take backups.

### Security
- Use a dedicated deploy account rather than root when possible; Docker access remains root-equivalent.
- Rotate any credentials that were pasted into chats or exposed in compose files; keep them exclusively on the VPS.
- Do not expose Postgres, Redis or MinIO publicly; Traefik is the public HTTPS entrypoint.
- The current repo uses `npm run lint` (TypeScript type check); add unit/integration tests.
- Review and pin third-party actions to immutable commit SHAs before high-assurance production use.
