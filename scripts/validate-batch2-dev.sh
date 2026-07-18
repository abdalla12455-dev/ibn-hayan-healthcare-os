#!/usr/bin/env bash
# Bounded live validation for the second canonical batch.
# Starts the API in development mode, checks health and OpenAPI endpoints,
# then terminates the API. Does not use a database or external service.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1
export API_PORT="${API_PORT:-3001}"
export WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:3000}"
export NODE_ENV=development

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
HEALTH_URL="http://127.0.0.1:${API_PORT}/api/v1/health"
OPENAPI_URL="http://127.0.0.1:${API_PORT}/api/docs-json"
API_PID=""
EXIT_CODE=0

cleanup() {
  if [[ -n "$API_PID" ]]; then
    kill -TERM "-$API_PID" 2>/dev/null || true
    wait "$API_PID" 2>/dev/null || true
  fi
  if command -v ss >/dev/null 2>&1; then
    if ss -ltn "sport = :${API_PORT}" 2>/dev/null | grep -q ":${API_PORT}"; then
      echo "WARNING: listener still present on port ${API_PORT}"
      EXIT_CODE=1
    fi
  fi
}
trap cleanup EXIT

echo "===STARTING API (development) ON PORT ${API_PORT}==="
cd "$API_DIR"
setsid pnpm start:prod > /tmp/ibn-hayan-batch2-dev.log 2>&1 &
API_PID=$!
echo "API_PID=$API_PID"

echo "===WAITING FOR HEALTH ENDPOINT==="
HEALTH_OK=0
for i in $(seq 1 60); do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "ERROR: API process exited before becoming ready"
    cat /tmp/ibn-hayan-batch2-dev.log || true
    exit 1
  fi
  HTTP_CODE="$(curl -s -o /tmp/ibn-hayan-batch2-health.json -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$HTTP_CODE" == "200" ]]; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "ERROR: health endpoint did not return 200 within timeout"
  cat /tmp/ibn-hayan-batch2-dev.log || true
  exit 1
fi

echo "===HEALTH RESPONSE==="
cat /tmp/ibn-hayan-batch2-health.json
echo ""

echo "===VERIFYING EXACT HEALTH SHAPE==="
EXPECTED='{"status":"ok","service":"ibn-hayan-api","version":"development"}'
ACTUAL="$(cat /tmp/ibn-hayan-batch2-health.json | tr -d '[:space:]')"
if [[ "$ACTUAL" != "$EXPECTED" ]]; then
  echo "ERROR: health response shape mismatch"
  echo "Expected: $EXPECTED"
  echo "Actual:   $ACTUAL"
  exit 1
fi
echo "Health response OK"

echo "===OPENAPI JSON (HTTP status)==="
OPENAPI_HTTP="$(curl -s -o /tmp/ibn-hayan-batch2-openapi.json -w '%{http_code}' "$OPENAPI_URL" 2>/dev/null || true)"
echo "OpenAPI HTTP code: $OPENAPI_HTTP"
if [[ "$OPENAPI_HTTP" != "200" ]]; then
  echo "ERROR: OpenAPI JSON did not return 200"
  exit 1
fi

echo "===CHECK /api/v1/health IN SPEC==="
if grep -q '/api/v1/health' /tmp/ibn-hayan-batch2-openapi.json; then
  echo "Spec contains /api/v1/health: OK"
else
  echo "ERROR: spec does not contain /api/v1/health"
  exit 1
fi

echo "===DEVELOPMENT VALIDATION PASSED==="
exit $EXIT_CODE
