# PRO-129: Push image to registry and deploy latest to host machine when running merge to main

## Summary

Updated the `scroller-front-end-poc` CI pipeline to mirror the pattern established in `scroller-customer-interactions-db`. On a successful push to `main`, the pipeline now builds the Podman image via `make podman-build`, tags and pushes it to the local registry (`host.containers.internal:5000`) via `make podman-push`, and deploys the latest image to the host machine via a new `make podman-deploy-ci` target. The `build-and-push` step was refactored to use `make` targets with the `ci-logs` capture pattern while keeping the host Podman socket mounted so CI targets the host engine. A new `deploy-main` step was added after `build-and-push`, and its health check now verifies the host-exposed port via `host.containers.internal`.

## Changes

- `Makefile`: Updated `podman-push` to tag the local image to the registry and push with `--tls-verify=false`. Added registry variables (`REGISTRY_IMAGE`, `PODMAN_KUBE_MANIFEST`, `PODMAN_HEALTHCHECK_URL`, `PODMAN_POD_NAME`). Added new `podman-deploy-ci` target that pulls the latest image from the registry, tears down any existing pod, redeploys via the kube manifest, and health-checks on port 3020.
- `.woodpecker.yml`: Refactored `build-and-push` step to use `make podman-build` + `make podman-push` with `privileged: true`, the `ci-logs` capture pattern, and the host Podman socket mounted at `/var/run/docker.sock`. Added `deploy-main` after `build-and-push` using `make podman-deploy-ci`, the same host Podman socket wiring, and `PODMAN_HEALTHCHECK_URL=http://host.containers.internal:3020` so CI verifies the host machine rather than the ephemeral step container.

## Tests

- Ran: `make test-dashboard-unit` in `scroller-front-end-poc`
- Result: Pass (5 suites / 28 tests). No automated tests exercise the CI deployment path itself, so the host-targeted socket + health-check wiring was validated by review.

## Documentation updated

- `documentation/tickets/PRO-129-ci-build-push-deploy-main.md`: this file

## Open questions

- None
