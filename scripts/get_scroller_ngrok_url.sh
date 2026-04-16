#!/usr/bin/env bash

set -euo pipefail

SCROLLER_NGROK_PORT="${SCROLLER_NGROK_PORT:-8410}"
SCROLLER_NGROK_API_URL="${SCROLLER_NGROK_API_URL:-http://localhost:4040/api/tunnels}"

TUNNELS_JSON="$(curl -fsS "$SCROLLER_NGROK_API_URL")"

NGROK_URL="$(
  printf '%s' "$TUNNELS_JSON" | SCROLLER_NGROK_PORT="$SCROLLER_NGROK_PORT" node -e '
    const fs = require("fs");

    const port = String(process.env.SCROLLER_NGROK_PORT || "8410");
    const input = fs.readFileSync(0, "utf8");
    let parsed;

    try {
      parsed = JSON.parse(input);
    } catch {
      process.exit(1);
    }

    const tunnels = Array.isArray(parsed.tunnels) ? parsed.tunnels : [];
    const matches = tunnels.find((tunnel) => {
      const publicUrl = String(tunnel?.public_url || "");
      if (!publicUrl.startsWith("https://")) {
        return false;
      }

      const addr = String(tunnel?.config?.addr || "").replace(/\/$/, "");
      return (
        addr === port
        || addr === `localhost:${port}`
        || addr === `127.0.0.1:${port}`
        || addr === `http://localhost:${port}`
        || addr === `http://127.0.0.1:${port}`
        || addr === `https://localhost:${port}`
        || addr === `https://127.0.0.1:${port}`
        || addr.endsWith(`:${port}`)
      );
    });

    if (!matches) {
      process.exit(1);
    }

    process.stdout.write(String(matches.public_url));
  '
)"

[ -n "$NGROK_URL" ] || exit 1
echo "$NGROK_URL"
