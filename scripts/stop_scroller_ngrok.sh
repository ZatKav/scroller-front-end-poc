#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCROLLER_NGROK_PORT="${SCROLLER_NGROK_PORT:-8410}"
SCROLLER_NGROK_API_URL="${SCROLLER_NGROK_API_URL:-http://localhost:4040/api/tunnels}"
SCROLLER_NGROK_LOG_FILE="${SCROLLER_NGROK_LOG_FILE:-/tmp/scroller-ngrok.log}"
SCROLLER_NGROK_PID_FILE="${SCROLLER_NGROK_PID_FILE:-/tmp/scroller-ngrok.pid}"
URL_SCRIPT="$REPO_ROOT/scripts/get_scroller_ngrok_url.sh"

STOPPED=0

if [ -f "$SCROLLER_NGROK_PID_FILE" ]; then
  NGROK_PID="$(cat "$SCROLLER_NGROK_PID_FILE" 2>/dev/null || true)"
  if [ -n "$NGROK_PID" ] && kill -0 "$NGROK_PID" >/dev/null 2>&1; then
    echo "Stopping scroller ngrok process $NGROK_PID..."
    kill "$NGROK_PID"
    STOPPED=1
  fi
  rm -f "$SCROLLER_NGROK_PID_FILE"
fi

if [ "$STOPPED" -eq 0 ]; then
  MATCHING_PIDS="$(pgrep -f "ngrok http ${SCROLLER_NGROK_PORT}" || true)"
  if [ -n "$MATCHING_PIDS" ]; then
    echo "Stopping ngrok process(es) on port $SCROLLER_NGROK_PORT..."
    echo "$MATCHING_PIDS" | xargs kill
    STOPPED=1
  fi
fi

sleep 1

if SCROLLER_NGROK_PORT="$SCROLLER_NGROK_PORT" SCROLLER_NGROK_API_URL="$SCROLLER_NGROK_API_URL" bash "$URL_SCRIPT" >/dev/null 2>&1; then
  echo "Warning: a tunnel for port $SCROLLER_NGROK_PORT is still active."
  echo "Check ngrok dashboard: http://localhost:4040"
  exit 1
fi

if [ "$STOPPED" -eq 1 ]; then
  echo "Scroller ngrok tunnel stopped."
else
  echo "No scroller ngrok tunnel process was running."
fi

if [ -f "$SCROLLER_NGROK_LOG_FILE" ]; then
  rm -f "$SCROLLER_NGROK_LOG_FILE"
fi
