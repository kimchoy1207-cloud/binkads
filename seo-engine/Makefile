SHELL := /bin/bash
.PHONY: up down logs migrate test lint demo
up:      ; docker compose up -d --build
down:    ; docker compose down -v
logs:    ; docker compose logs -f --tail=200
migrate: ; docker compose exec api alembic upgrade head
test:    ; docker compose exec api pytest -q --cov=packages
lint:    ; docker compose exec api ruff check . && docker compose exec api mypy --strict packages apps
demo:    ; docker compose exec api python -m scripts.demo
