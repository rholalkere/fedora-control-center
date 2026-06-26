.PHONY: install-backend run-backend lint-backend test-backend install-frontend run-frontend docker-build docker-up test lint build

PYTHON = python3
VENV = backend/venv
PIP = $(VENV)/bin/pip
UVICORN = $(VENV)/bin/uvicorn
PYTEST = $(VENV)/bin/pytest

install-backend:
	@echo "Setting up Python virtual environment..."
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r backend/requirements.txt

run-backend:
	@echo "Starting FastAPI backend server..."
	cd backend && PYTHONPATH=. ../$(UVICORN) app.main:app --host 0.0.0.0 --port 8000 --reload

lint-backend:
	@echo "Linting backend code..."
	$(PIP) install flake8 black || true
	$(VENV)/bin/black --check backend/app || true
	$(VENV)/bin/flake8 backend/app --max-line-length=120 || true

test-backend:
	@echo "Running backend test suite..."
	cd backend && PYTHONPATH=. ../$(PYTEST)

install-frontend:
	@echo "Installing frontend node packages..."
	cd frontend && npm install --legacy-peer-deps

run-frontend:
	@echo "Starting Vite frontend server..."
	cd frontend && npm run dev

docker-build:
	@echo "Building Docker images..."
	docker compose build

docker-up:
	@echo "Launching containers..."
	docker compose up

test: test-backend

lint: lint-backend

build: docker-build
