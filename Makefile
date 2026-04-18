# ScrollLater Makefile
# Common commands for development, testing, and deployment

.PHONY: help install dev build start lint typecheck test test-watch test-coverage test-e2e test-e2e-ui test-all clean deploy

# Default target
help:
	@echo "ScrollLater - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make build        - Build for production"
	@echo "  make start        - Start production server"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint         - Run ESLint"
	@echo "  make typecheck    - Run TypeScript type checking"
	@echo "  make format       - Format code with Prettier (if available)"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run unit tests once"
	@echo "  make test-watch   - Run unit tests in watch mode"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo "  make test-e2e     - Run Playwright E2E tests"
	@echo "  make test-e2e-ui  - Run Playwright E2E tests with UI"
	@echo "  make test-all     - Run all tests (unit + E2E)"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Remove build artifacts and node_modules"
	@echo "  make ci           - Run full CI pipeline locally"
	@echo ""

# Development
install:
	cd scrolllater-frontend && npm ci

dev:
	cd scrolllater-frontend && npm run dev

build:
	cd scrolllater-frontend && npm run build

start:
	cd scrolllater-frontend && npm run start

# Code Quality
lint:
	cd scrolllater-frontend && npm run lint

typecheck:
	cd scrolllater-frontend && npm run typecheck

format:
	cd scrolllater-frontend && npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css}"

# Testing
test:
	cd scrolllater-frontend && npm run test

test-watch:
	cd scrolllater-frontend && npm run test:watch

test-coverage:
	cd scrolllater-frontend && npm run test:coverage

test-e2e:
	cd scrolllater-frontend && npm run test:e2e

test-e2e-ui:
	cd scrolllater-frontend && npm run test:e2e:ui

test-all: test test-e2e

# CI Pipeline (run locally)
ci: lint typecheck test-coverage build
	@echo "CI pipeline completed successfully!"

# Utilities
clean:
	rm -rf scrolllater-frontend/.next
	rm -rf scrolllater-frontend/node_modules
	rm -rf scrolllater-frontend/coverage
	rm -rf scrolllater-frontend/playwright-report
	rm -rf scrolllater-frontend/test-results
	@echo "Cleaned build artifacts and dependencies"

# Install Playwright browsers
install-playwright:
	cd scrolllater-frontend && npx playwright install --with-deps

# Open test coverage report
coverage-report:
	open scrolllater-frontend/coverage/index.html || xdg-open scrolllater-frontend/coverage/index.html

# Open Playwright report
e2e-report:
	cd scrolllater-frontend && npx playwright show-report
