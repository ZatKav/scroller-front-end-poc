.PHONY: help run test-dashboard-unit test-dashboard-e2e test

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
PODMAN_PORT ?= 3020
PODMAN_ENV_FILE ?=

.PHONY: podman-build
podman-build: ## Build the scroller Podman image
	@echo "Building image $(PODMAN_IMG)..."
	podman build -t $(PODMAN_IMG) -f scroller-front-end-poc/Containerfile scroller-front-end-poc

.PHONY: podman-start
podman-start: ## Start the scroller container (detached). Use PODMAN_ENV_FILE=.env for runtime config
	@echo "Starting container $(PODMAN_CONT) on port $(PODMAN_PORT)..."
	-podman rm -f $(PODMAN_CONT) >/dev/null 2>&1 || true
	podman run -d --name $(PODMAN_CONT) -p $(PODMAN_PORT):3000 \
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
podman-push: ## Push the scroller image to a registry
	@echo "Pushing $(PODMAN_IMG)..."
	podman push $(PODMAN_IMG)

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
	@echo "Scroller should be available at: http://localhost:3020"

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
