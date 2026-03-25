# PRO-105: Create default makefile targets

## Summary
Added standard podman container lifecycle targets and Kubernetes deployment manifest to the scroller-front-end-poc Makefile, mirroring the pattern established in finder-evaluation-dashboard. Container env vars are injected via `--env-file` rather than hardcoded, since the scroller app's runtime config is not yet finalised.

## Changes
- `Makefile`: Added podman variables (`PODMAN_IMG`, `PODMAN_CONT`, `PODMAN_PORT`, `PODMAN_ENV_FILE`) and container lifecycle targets (`podman-build`, `podman-start`, `podman-stop`, `podman-restart`, `podman-logs`, `podman-shell`, `podman-status`), composite targets (`podman-run`, `podman-rebuild`, `podman-clean`, `podman-push`), and deployment targets (`podman-deploy`, `podman-ci-deploy`). Existing targets unchanged.
- `podman-scroller-kube.yaml`: New Kubernetes manifest following the structure of `podman-evaluation-kube.yaml` — Pod spec with `restartPolicy: Always`, image from local registry, `hostPort: 3020`, `containerPort: 3000`, readiness/liveness probes, and a Service. No hardcoded env vars.

## Tests
- Ran: `make help` in `scroller-front-end-poc`
- Result: All new podman and deploy targets appear with descriptions

## Documentation updated
- `documentation/tickets/PRO-105-create-default-makefile-targets.md`: This ticket snapshot

## Open questions
- Runtime config env vars for the scroller app are not yet defined — a follow-up ticket should wire these into the kube manifest or env file
