.PHONY: help run test-dashboard-unit test-dashboard-e2e test podman-deploy-ci

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
podman-start: ## Start the scroller container (detached). Use PODMAN_ENV_FILE=.env for runtime config
	@echo "Starting container $(PODMAN_CONT) on port $(PODMAN_PORT)..."
	-podman rm -f $(PODMAN_CONT) >/dev/null 2>&1 || true
	podman run -d --name $(PODMAN_CONT) -p $(PODMAN_PORT):8410 \
		$(if $(PODMAN_ENV_FILE),--env-file $(PODMAN_ENV_FILE),) \
		$(PODMAN_IMG)

.PHONY: podman-stop
podman-stop: ## Stop and remove the scroller container
	@echo "Stopping container $(PODMAN_CONT)..."
	-podman stop $(PODMAN_CONT) >/dev/null 2>&1 || true
	-podman rm $(PODMAN_CONT) >/dev/null 2>&1 || true

.PHONY: podman-restart
podman-restart: ## Restart the scroller container
	@$(MAKE) podman-stop
	@$(MAKE) podman-start

.PHONY: podman-logs
podman-logs: ## View logs from the scroller container
	@echo "Viewing logs for $(PODMAN_CONT)..."
	podman logs -f $(PODMAN_CONT)

.PHONY: podman-shell
podman-shell: ## Open a shell in the running scroller container
	@echo "Opening shell in $(PODMAN_CONT)..."
	podman exec -it $(PODMAN_CONT) /bin/sh

.PHONY: podman-status
podman-status: ## Check the status of the scroller container
	@echo "Container status:"
	@podman ps -a --filter name=$(PODMAN_CONT)

.PHONY: podman-run
podman-run: podman-build podman-start ## Build and start the scroller container
	@echo "Container built and started!"

.PHONY: podman-rebuild
podman-rebuild: ## Rebuild the image and restart the container
	@$(MAKE) podman-stop
	@$(MAKE) podman-build
	@$(MAKE) podman-start

.PHONY: podman-clean
podman-clean: ## Stop container and remove the image
	@echo "Cleaning up container and image..."
	-podman stop $(PODMAN_CONT) >/dev/null 2>&1 || true
	-podman rm $(PODMAN_CONT) >/dev/null 2>&1 || true
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
podman-deploy: ## Deploy the scroller pod using Kubernetes manifest
	@echo "Deploying scroller pod..."
	@echo "Stopping existing pod if running..."
	-podman play kube --down podman-scroller-kube.yaml 2>/dev/null || true
	@echo "Deploying pod with host port mapping..."
	podman play kube podman-scroller-kube.yaml
	@echo "Scroller pod deployed!"
	@echo "Pod status:"
	@podman pod ls --filter name=pod_scroller_front_end
	@echo ""
	@echo "Scroller should be available at: http://localhost:8410"

.PHONY: podman-ci-deploy
podman-ci-deploy: ## Deploy the scroller pod in CI with failure on deploy errors
	@echo "Deploying scroller pod (CI)..."
	@echo "Stopping existing pod if running..."
	-podman play kube --down podman-scroller-kube.yaml 2>/dev/null || true
	@echo "Deploying pod with registry image..."
	podman play kube podman-scroller-kube.yaml
	@echo "Scroller pod deployed!"
	@echo "Pod status:"
	@podman pod ls --filter name=pod_scroller_front_end

.PHONY: podman-deploy-ci
podman-deploy-ci: ## Pull latest image from registry, redeploy pod, and verify health on port 8410
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
