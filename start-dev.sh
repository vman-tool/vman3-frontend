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
(cd "$BACKEND_DIR" && docker compose -f docker-compose.dev.yml up -d)
echo "Docker containers running."
echo ""

# Verify .venv exists
VENV_ACTIVATE="$BACKEND_DIR/.venv/bin/activate"
if [ ! -f "$VENV_ACTIVATE" ]; then
    echo "ERROR: No .venv found at $BACKEND_DIR/.venv"
    echo "Create it with: cd $BACKEND_DIR && python -m venv .venv && pip install -r requirements.txt"
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
(cd "$BACKEND_DIR" && source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload) &
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
echo "Open http://localhost:4200 in your browser."
echo "Press Ctrl+C to stop all services."
echo ""
cd "$FRONTEND_DIR" && npm start
