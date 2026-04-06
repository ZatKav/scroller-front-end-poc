# PRO-173-rationalise-scroller-front-end-poc-make-targets-for-deployment

## Ticket Snapshot

- Identifier: PRO-173
- Title: Rationalise scroller-front-end-poc make targets for deployment
- URL: https://linear.app/property-app/issue/PRO-173/rationalise-scroller-front-end-poc-make-targets-for-deployment
- Branch: PRO-173-rationalise-scroller-front-end-poc-make-targets-for-deployment

## Source Requirements

### Description

Rationalise overlapping Podman deploy/start targets so a single canonical deployment command is used. Ensure supported deployment is pod-backed (`pod_scroller_front_end`) on port `8410`, preserve hardened local-registry pull + health-gated redeploy behavior, and align Woodpecker main deployment to the same command path.

### Key Comments and Acceptance Criteria

- `make podman-deploy` must be the canonical manual and CI deployment command.
- Deployment must redeploy pod `pod_scroller_front_end`, not rely on standalone `scroller-front-end-poc-local` as the supported path.
- Hardened local registry handling (`host.containers.internal:5000`, insecure local registry config) and health-gated behavior must be preserved.
- Woodpecker `deploy-main` must deploy via `make podman-deploy` and use host health endpoint `http://host.containers.internal:8410`.
- Deployment failures must exit non-zero with clear failing health/deploy context.

## Architecture Impact

- Consolidated deployment orchestration into one Make target (`podman-deploy`) that now owns image pull, pod redeploy, and health verification.
- Legacy deployment/lifecycle target names were retained as compatibility aliases but routed to the canonical pod-backed flow, reducing drift between operator and CI deployment behaviors.
- CI `deploy-main` now uses the same canonical entrypoint as manual operation, improving parity between environments.

## Functional Changes

- `podman-deploy` now performs hardened registry pull (`--tls-verify=false` with temporary registries config), tears down/redeploys pod manifest, and waits for health.
- `podman-ci-deploy` and `podman-deploy-ci` now alias to `podman-deploy`.
- `podman-start` now aliases to `podman-deploy`; `podman-stop/status/logs/shell/rebuild/run` were aligned with pod-backed expectations.
- CI main deployment command switched from `make podman-deploy-ci` to `make podman-deploy` while preserving host health URL override.
- README now documents `make podman-deploy` as canonical and marks legacy command names as compatibility aliases.

## Validation

- `make help` lists deployment targets with canonical/compatibility descriptions.
- `make -n podman-deploy` confirms canonical target performs pull, pod redeploy, and health check flow.
- `make -n podman-deploy-ci` and `make -n podman-ci-deploy` show delegation to canonical target.
- `python3 -c "import yaml; yaml.safe_load(open('.woodpecker.yml')); yaml.safe_load(open('podman-scroller-kube.yaml'))"` validates YAML parsing.

## Changed Files

- `Makefile`: canonicalized deployment behavior under `podman-deploy`, converted duplicate deploy targets into aliases, and aligned legacy lifecycle helpers to pod-backed flow.
- `.woodpecker.yml`: changed `deploy-main` deployment command to `make podman-deploy`.
- `README.md`: documented canonical deployment command and compatibility alias behavior.
- `documentation/tickets/PRO-173-rationalise-scroller-front-end-poc-make-targets-for-deployment.md`: ticket implementation artifact.
