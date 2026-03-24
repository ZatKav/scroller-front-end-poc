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
