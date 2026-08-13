#!/bin/bash
# Run this script from the /frontend directory to start the full dev stack.
# Usage: bash start-dev.sh

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$FRONTEND_DIR")/backend"

echo "=== vman3 dev startup ==="
echo "Backend : $BACKEND_DIR"
echo "Frontend: $FRONTEND_DIR"
echo ""

# 1. Docker containers (ArangoDB, Redis, Celery worker, Flower)
echo "[1/3] Starting Docker containers..."

# docker-compose.dev.yml declares vman3-net as an external network - Compose
# expects it to already exist and won't create it. On a machine where it's
# never been created (fresh install, new Docker environment, CI runner),
# `docker compose up` fails to start anything that needs it (ArangoDB
# included) but doesn't stop the script, so this used to fail silently and
# only surface later as "can't log in" with no obvious cause.
if ! docker network inspect vman3-net >/dev/null 2>&1; then
    echo "Docker network 'vman3-net' not found — creating it..."
    docker network create vman3-net
fi

(cd "$BACKEND_DIR" && docker compose -f docker-compose.dev.yml up -d)
echo "Docker containers running."
echo ""

# Verify .venv has a usable interpreter.
# Check bin/python, not bin/activate: activate is a plain text file while
# python is a symlink, so a partially-restored venv can keep activate and
# lose the interpreter. That combination passed the old check and then let
# uvicorn die with its error scrolling past unnoticed.
VENV_PY="$BACKEND_DIR/.venv/bin/python"
if [ ! -x "$VENV_PY" ]; then
    echo "ERROR: No usable Python at $VENV_PY"
    if [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
        echo "  .venv exists but its interpreter is missing. Repair it with:"
        echo "    python3.11 -m venv \"$BACKEND_DIR/.venv\""
        echo "  (this recreates bin/ and leaves site-packages intact)"
    else
        echo "  Create it with:"
        echo "    cd \"$BACKEND_DIR\" && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
    fi
    exit 1
fi

# 2. Kill any stale process on port 8080 before starting
echo "[2/3] Checking port 8080..."
STALE_PIDS=$(lsof -ti :8080 2>/dev/null)
if [ -n "$STALE_PIDS" ]; then
    echo "Found stale process(es) on :8080 (PIDs: $STALE_PIDS) — killing..."
    echo "$STALE_PIDS" | xargs kill -9 2>/dev/null
    sleep 1
    echo "Port 8080 cleared."
fi

# Start uvicorn backend in background
echo "Starting backend (uvicorn on :8080)..."
(cd "$BACKEND_DIR" && "$VENV_PY" -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload) &
UVICORN_PID=$!
echo "Backend PID: $UVICORN_PID — waiting for it to initialize..."
sleep 3
echo ""

# Stop uvicorn cleanly on exit (kill by port to catch reload-spawned children too)
cleanup() {
    echo ""
    echo "Stopping backend..."
    # Kill by port to catch all uvicorn worker processes, not just the main PID
    lsof -ti :8080 2>/dev/null | xargs kill -9 2>/dev/null
    wait "$UVICORN_PID" 2>/dev/null
    echo "Done. Docker containers are still running — stop them with:"
    echo "  docker compose -f $BACKEND_DIR/docker-compose.dev.yml down"
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Angular dev server (foreground — Ctrl+C stops everything)
echo "[3/3] Starting Angular dev server on :4200..."

# Same problem as port 8080 above: a previous run that didn't exit cleanly
# (closed terminal, killed shell, crashed) leaves ng serve bound to :4200,
# and `npm start` then just prompts to use a different port instead of
# reusing this one.
STALE_PIDS=$(lsof -ti :4200 2>/dev/null)
if [ -n "$STALE_PIDS" ]; then
    echo "Found stale process(es) on :4200 (PIDs: $STALE_PIDS) — killing..."
    echo "$STALE_PIDS" | xargs kill -9 2>/dev/null
    sleep 1
    echo "Port 4200 cleared."
fi

echo "Open http://localhost:4200 in your browser."
echo "Press Ctrl+C to stop all services."
echo ""
cd "$FRONTEND_DIR" && npm start
