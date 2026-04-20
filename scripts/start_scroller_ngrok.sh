#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

SCROLLER_NGROK_PORT="${SCROLLER_NGROK_PORT:-8410}"
SCROLLER_NGROK_HEALTHCHECK_URL="${SCROLLER_NGROK_HEALTHCHECK_URL:-http://localhost:${SCROLLER_NGROK_PORT}/login}"
SCROLLER_NGROK_WEB_ADDR="${SCROLLER_NGROK_WEB_ADDR:-127.0.0.1:4041}"
SCROLLER_NGROK_API_URL="${SCROLLER_NGROK_API_URL:-http://${SCROLLER_NGROK_WEB_ADDR}/api/tunnels}"
SCROLLER_NGROK_URL="${SCROLLER_NGROK_URL:-}"
SCROLLER_NGROK_LOG_FILE="${SCROLLER_NGROK_LOG_FILE:-/tmp/scroller-ngrok.log}"
SCROLLER_NGROK_PID_FILE="${SCROLLER_NGROK_PID_FILE:-/tmp/scroller-ngrok.pid}"
SCROLLER_NGROK_DEFAULT_CONFIG="${SCROLLER_NGROK_DEFAULT_CONFIG:-$HOME/Library/Application Support/ngrok/ngrok.yml}"
SCROLLER_NGROK_AGENT_CONFIG_FILE="${SCROLLER_NGROK_AGENT_CONFIG_FILE:-/tmp/scroller-ngrok-agent.yml}"
URL_SCRIPT="$REPO_ROOT/scripts/get_scroller_ngrok_url.sh"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "Error: ngrok is not installed."
  echo "Install it and retry: https://ngrok.com/download"
  exit 1
fi

if ! curl -fsS "$SCROLLER_NGROK_HEALTHCHECK_URL" >/dev/null; then
  echo "Error: scroller app is not reachable at $SCROLLER_NGROK_HEALTHCHECK_URL"
  echo "Start the app first (for example: make run)."
  exit 1
fi

if [ -f "$SCROLLER_NGROK_PID_FILE" ]; then
  EXISTING_PID="$(cat "$SCROLLER_NGROK_PID_FILE" 2>/dev/null || true)"
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    if NGROK_URL="$(SCROLLER_NGROK_PORT="$SCROLLER_NGROK_PORT" SCROLLER_NGROK_API_URL="$SCROLLER_NGROK_API_URL" bash "$URL_SCRIPT" 2>/dev/null)"; then
      echo "Scroller ngrok tunnel is already running."
      echo "Public URL: $NGROK_URL"
      exit 0
    fi
  else
    rm -f "$SCROLLER_NGROK_PID_FILE"
  fi
fi

if NGROK_URL="$(SCROLLER_NGROK_PORT="$SCROLLER_NGROK_PORT" SCROLLER_NGROK_API_URL="$SCROLLER_NGROK_API_URL" bash "$URL_SCRIPT" 2>/dev/null)"; then
  echo "An ngrok tunnel for port $SCROLLER_NGROK_PORT is already active."
  echo "Public URL: $NGROK_URL"
  exit 0
fi

echo "Starting ngrok tunnel to scroller on port $SCROLLER_NGROK_PORT..."
mkdir -p "$(dirname "$SCROLLER_NGROK_AGENT_CONFIG_FILE")"
printf '%s\n' \
  'version: "3"' \
  'agent:' \
  "  web_addr: $SCROLLER_NGROK_WEB_ADDR" \
  >"$SCROLLER_NGROK_AGENT_CONFIG_FILE"

NGROK_ARGS=(http "$SCROLLER_NGROK_PORT" --log=stdout)
if [ -f "$SCROLLER_NGROK_DEFAULT_CONFIG" ]; then
  NGROK_ARGS+=(--config "$SCROLLER_NGROK_DEFAULT_CONFIG")
fi
NGROK_ARGS+=(--config "$SCROLLER_NGROK_AGENT_CONFIG_FILE")
if [ -n "$SCROLLER_NGROK_URL" ]; then
  NGROK_ARGS+=(--url "$SCROLLER_NGROK_URL")
else
  echo "No SCROLLER_NGROK_URL set; ngrok will use the account default endpoint."
  echo "If Woodpecker already uses that endpoint, set SCROLLER_NGROK_URL to a second reserved ngrok URL."
fi

ngrok "${NGROK_ARGS[@]}" >"$SCROLLER_NGROK_LOG_FILE" 2>&1 &
NGROK_PID="$!"
echo "$NGROK_PID" >"$SCROLLER_NGROK_PID_FILE"

ATTEMPTS=20
while [ "$ATTEMPTS" -gt 0 ]; do
  if NGROK_URL="$(SCROLLER_NGROK_PORT="$SCROLLER_NGROK_PORT" SCROLLER_NGROK_API_URL="$SCROLLER_NGROK_API_URL" bash "$URL_SCRIPT" 2>/dev/null)"; then
    echo "Scroller ngrok tunnel started."
    echo "Public URL: $NGROK_URL"
    echo "ngrok dashboard: http://$SCROLLER_NGROK_WEB_ADDR"
    exit 0
  fi

  ATTEMPTS=$((ATTEMPTS - 1))
  sleep 1
done

echo "Error: failed to read a public ngrok URL from $SCROLLER_NGROK_API_URL"
if grep -q "ERR_NGROK_334" "$SCROLLER_NGROK_LOG_FILE" 2>/dev/null; then
  echo "The configured ngrok endpoint is already online."
  echo "Set SCROLLER_NGROK_URL to a different reserved ngrok URL for the scroller front end."
fi
echo "Check ngrok logs: tail -f $SCROLLER_NGROK_LOG_FILE"
kill "$NGROK_PID" >/dev/null 2>&1 || true
rm -f "$SCROLLER_NGROK_PID_FILE"
exit 1
