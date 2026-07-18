#!/usr/bin/env bash
# Live validation script for the Ibn Hayan API health endpoint.
#
# Behaviour:
# 1. Starts the API as a subprocess on port 3001.
# 2. Polls http://127.0.0.1:3001/api/v1/health until it returns 200 or
#    a 30-second timeout fires.
# 3. Verifies the exact JSON response shape.
# 4. Terminates the API process group.
# 5. Confirms no development server remains running on port 3001.
#
# This script is bounded and does NOT start a persistent server. It exits
# with status 0 on success and non-zero on any failure.

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1
export API_PORT="${API_PORT:-3001}"
export WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:3000}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
HEALTH_URL="http://127.0.0.1:${API_PORT}/api/v1/health"
API_PID=""
EXIT_CODE=0

cleanup() {
  if [[ -n "$API_PID" ]]; then
    # Kill the entire process group so child processes (nest start) are
    # also terminated.
    kill -TERM "-$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  # Confirm no listener remains on the port.
  if command -v ss >/dev/null 2>&1; then
    if ss -ltn "sport = :${API_PORT}" 2>/dev/null | grep -q ":${API_PORT}"; then
      echo "WARNING: listener still present on port ${API_PORT} after cleanup"
      EXIT_CODE=1
    fi
  fi
}

trap cleanup EXIT

echo "===STARTING API ON PORT ${API_PORT}==="
cd "$API_DIR"
# Run `nest start` in a new process group so we can kill the whole tree.
setsid pnpm start:prod > /tmp/ibn-hayan-api-validation.log 2>&1 &
API_PID=$!
echo "API_PID=$API_PID"

echo "===WAITING FOR HEALTH ENDPOINT==="
HEALTH_OK=0
for i in $(seq 1 60); do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "ERROR: API process exited before becoming ready"
    cat /tmp/ibn-hayan-api-validation.log || true
    exit 1
  fi
  HTTP_CODE="$(curl -s -o /tmp/ibn-hayan-health-response.json -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$HTTP_CODE" == "200" ]]; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "ERROR: health endpoint did not return 200 within timeout"
  echo "--- API LOG ---"
  cat /tmp/ibn-hayan-api-validation.log || true
  exit 1
fi

echo "===HEALTH RESPONSE==="
cat /tmp/ibn-hayan-health-response.json
echo ""

echo "===VERIFYING EXACT SHAPE==="
EXPECTED='{"status":"ok","service":"ibn-hayan-api","version":"development"}'
ACTUAL="$(cat /tmp/ibn-hayan-health-response.json | tr -d '[:space:]')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "ERROR: response shape mismatch"
  echo "Expected: $EXPECTED"
  echo "Actual:   $ACTUAL"
  exit 1
fi

echo "===VALIDATION PASSED==="
echo "HTTP 200, exact shape confirmed at $HEALTH_URL"

# Cleanup runs via trap.
exit $EXIT_CODE
