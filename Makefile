.PHONY: help run test-dashboard-unit test-dashboard-e2e test podman-deploy podman-ci-deploy podman-deploy-ci

help:  ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

run: ## Run the scroller front-end (requires Node.js)
	@echo "Starting scroller-front-end-poc..."
	@cd scroller-front-end-poc && npm run dev

test-dashboard-unit: ## Run dashboard unit tests
	@echo "Running dashboard unit tests..."
	@cd scroller-front-end-poc && npm test

test-dashboard-e2e: ## Run dashboard E2E tests with Playwright
	@echo "Running dashboard E2E tests..."
	@cd scroller-front-end-poc && npm run test:e2e

test: test-dashboard-unit test-dashboard-e2e ## Run all tests
	@echo "All tests completed!"

# --- Podman container targets ---

PODMAN_IMG ?= localhost/scroller-front-end-poc:latest
PODMAN_CONT ?= scroller-front-end-poc-local
PODMAN_PORT ?= 8410
PODMAN_ENV_FILE ?=
REGISTRY_IMAGE ?= host.containers.internal:5000/scroller-front-end-poc:latest
PODMAN_KUBE_MANIFEST ?= podman-scroller-kube.yaml
PODMAN_HEALTHCHECK_URL ?= http://localhost:8410
PODMAN_POD_NAME ?= pod_scroller_front_end

.PHONY: podman-build
podman-build: ## Build the scroller Podman image
	@echo "Building image $(PODMAN_IMG)..."
	podman build -t $(PODMAN_IMG) -f scroller-front-end-poc/Containerfile scroller-front-end-poc

.PHONY: podman-start
podman-start: ## Legacy alias for the supported pod deployment flow
	@echo "podman-start is a compatibility alias; using canonical target: podman-deploy"
	@$(MAKE) podman-deploy

.PHONY: podman-stop
podman-stop: ## Stop and remove the scroller pod deployment
	@echo "Stopping pod deployment $(PODMAN_POD_NAME) if it exists..."
	-podman play kube --down $(PODMAN_KUBE_MANIFEST) >/dev/null 2>&1 || true

.PHONY: podman-restart
podman-restart: ## Restart the scroller pod deployment
	@$(MAKE) podman-stop
	@$(MAKE) podman-start

.PHONY: podman-logs
podman-logs: ## View logs from the scroller pod deployment
	@echo "Viewing logs for pod $(PODMAN_POD_NAME)..."
	podman pod logs -f $(PODMAN_POD_NAME)

.PHONY: podman-shell
podman-shell: ## Open a shell in the first running container inside the pod
	@container_id="$$(podman ps --filter pod=$(PODMAN_POD_NAME) --format '{{.ID}}' | head -n1)"; \
	if [ -z "$$container_id" ]; then \
		echo "No running container found for pod $(PODMAN_POD_NAME)"; \
		exit 1; \
	fi; \
	echo "Opening shell in container $$container_id from pod $(PODMAN_POD_NAME)..."; \
	podman exec -it "$$container_id" /bin/sh

.PHONY: podman-status
podman-status: ## Check the status of the scroller pod deployment
	@echo "Pod status:"
	@podman pod ps --filter name=$(PODMAN_POD_NAME)
	@echo "Container status:"
	@podman ps -a --filter pod=$(PODMAN_POD_NAME)

.PHONY: podman-run
podman-run: podman-build podman-push podman-start ## Build, publish, and deploy via the supported pod flow
	@echo "Image built, published, and deployed via podman-deploy."

.PHONY: podman-rebuild
podman-rebuild: ## Rebuild, publish, and redeploy the pod-backed service
	@$(MAKE) podman-build
	@$(MAKE) podman-push
	@$(MAKE) podman-deploy

.PHONY: podman-clean
podman-clean: ## Stop pod deployment and remove the local image
	@echo "Cleaning up pod deployment and local image..."
	-podman play kube --down $(PODMAN_KUBE_MANIFEST) >/dev/null 2>&1 || true
	-podman rmi $(PODMAN_IMG) >/dev/null 2>&1 || true

.PHONY: podman-push
podman-push: ## Tag and push the scroller image to the local registry
	@echo "Tagging $(PODMAN_IMG) as $(REGISTRY_IMAGE)..."
	podman tag $(PODMAN_IMG) $(REGISTRY_IMAGE)
	@echo "Pushing $(REGISTRY_IMAGE)..."
	podman push --tls-verify=false $(REGISTRY_IMAGE)
	@echo "Pushed $(REGISTRY_IMAGE)"

# --- Kubernetes deployment targets ---

.PHONY: podman-deploy
podman-deploy: ## Canonical deploy: pull registry image, redeploy pod, and verify health
	@tmp_reg_conf="$$(mktemp)"; \
	trap 'rm -f "$$tmp_reg_conf"' EXIT; \
	printf '%s\n' 'unqualified-search-registries = ["docker.io"]' '[[registry]]' 'location = "host.containers.internal:5000"' 'insecure = true' > "$$tmp_reg_conf"; \
	echo "Pulling published image: $(REGISTRY_IMAGE)"; \
	CONTAINERS_REGISTRIES_CONF="$$tmp_reg_conf" podman pull --tls-verify=false $(REGISTRY_IMAGE); \
	echo "Stopping existing pod (if any)..."; \
	CONTAINERS_REGISTRIES_CONF="$$tmp_reg_conf" podman play kube --down $(PODMAN_KUBE_MANIFEST) 2>/dev/null || true; \
	echo "Deploying from $(PODMAN_KUBE_MANIFEST)..."; \
	CONTAINERS_REGISTRIES_CONF="$$tmp_reg_conf" podman play kube --tls-verify=false $(PODMAN_KUBE_MANIFEST)
	@echo "Waiting for health endpoint: $(PODMAN_HEALTHCHECK_URL)"
	@attempts=45; \
	until curl -fsS "$(PODMAN_HEALTHCHECK_URL)" > /dev/null; do \
		attempts=$$((attempts - 1)); \
		if [ $$attempts -le 0 ]; then \
			echo "Deployment health check failed: $(PODMAN_HEALTHCHECK_URL)"; \
			podman pod ps --filter name="$(PODMAN_POD_NAME)" || true; \
			podman ps --filter name="$(PODMAN_POD_NAME)" || true; \
			exit 1; \
		fi; \
		sleep 2; \
	done
	@echo "Deployment healthy at $(PODMAN_HEALTHCHECK_URL)"
	@echo "Supported deployment pod: $(PODMAN_POD_NAME)"

.PHONY: podman-ci-deploy
podman-ci-deploy: podman-deploy ## Compatibility alias to canonical deploy target
	@true

.PHONY: podman-deploy-ci
podman-deploy-ci: podman-deploy ## Compatibility alias to canonical deploy target
	@true
