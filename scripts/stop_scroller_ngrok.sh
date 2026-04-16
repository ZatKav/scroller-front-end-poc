#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCROLLER_NGROK_PORT="${SCROLLER_NGROK_PORT:-8410}"
SCROLLER_NGROK_API_URL="${SCROLLER_NGROK_API_URL:-http://localhost:4040/api/tunnels}"
SCROLLER_NGROK_LOG_FILE="${SCROLLER_NGROK_LOG_FILE:-/tmp/scroller-ngrok.log}"
SCROLLER_NGROK_PID_FILE="${SCROLLER_NGROK_PID_FILE:-/tmp/scroller-ngrok.pid}"
URL_SCRIPT="$REPO_ROOT/scripts/get_scroller_ngrok_url.sh"

STOPPED=0

is_positive_pid() {
  case "$1" in
    ""|*[!0-9]*)
      return 1
      ;;
    *)
      [ "$1" -gt 0 ]
      ;;
  esac
}

pid_matches_scroller_ngrok() {
  local pid="$1"
  local command_line

  is_positive_pid "$pid" || return 1
  command_line="$(ps -p "$pid" -o command= 2>/dev/null || true)"
  [ -n "$command_line" ] || return 1

  case "$command_line" in
    *ngrok*" http "*"$SCROLLER_NGROK_PORT"*|*ngrok*" http localhost:$SCROLLER_NGROK_PORT"*|*ngrok*" http 127.0.0.1:$SCROLLER_NGROK_PORT"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

if [ -f "$SCROLLER_NGROK_PID_FILE" ]; then
  NGROK_PID="$(cat "$SCROLLER_NGROK_PID_FILE" 2>/dev/null || true)"
  if pid_matches_scroller_ngrok "$NGROK_PID" && kill -0 "$NGROK_PID" >/dev/null 2>&1; then
    echo "Stopping scroller ngrok process $NGROK_PID..."
    kill "$NGROK_PID"
    STOPPED=1
  elif [ -n "$NGROK_PID" ]; then
    echo "Ignoring stale scroller ngrok PID file for PID $NGROK_PID."
  fi
  rm -f "$SCROLLER_NGROK_PID_FILE"
fi

if [ "$STOPPED" -eq 0 ]; then
  MATCHING_PIDS="$(pgrep -f "ngrok http ${SCROLLER_NGROK_PORT}" 2>/dev/null || true)"
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
