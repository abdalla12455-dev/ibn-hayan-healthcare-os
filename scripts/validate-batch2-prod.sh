#!/usr/bin/env bash
# Production-mode OpenAPI validation for the second canonical batch.
# Starts the API with NODE_ENV=production on a temporary alternate port,
# confirms that health still returns 200 but OpenAPI routes are NOT served,
# then terminates the API. Does not use a database or external service.
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"
export NEXT_TELEMETRY_DISABLED=1
PROD_PORT="${PROD_PORT:-3002}"
export API_PORT="$PROD_PORT"
export WEB_ORIGIN="${WEB_ORIGIN:-http://localhost:3000}"
export NODE_ENV=production

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/apps/api"
HEALTH_URL="http://127.0.0.1:${API_PORT}/api/v1/health"
DOCS_UI_URL="http://127.0.0.1:${API_PORT}/api/docs"
DOCS_JSON_URL="http://127.0.0.1:${API_PORT}/api/docs-json"
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

echo "===STARTING API (production) ON PORT ${API_PORT}==="
cd "$API_DIR"
setsid pnpm start:prod > /tmp/ibn-hayan-batch2-prod.log 2>&1 &
API_PID=$!
echo "API_PID=$API_PID"

echo "===WAITING FOR HEALTH ENDPOINT==="
HEALTH_OK=0
for i in $(seq 1 60); do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "ERROR: API process exited before becoming ready"
    cat /tmp/ibn-hayan-batch2-prod.log || true
    exit 1
  fi
  HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
  if [[ "$HTTP_CODE" == "200" ]]; then
    HEALTH_OK=1
    break
  fi
  sleep 0.5
done

if [[ "$HEALTH_OK" -ne 1 ]]; then
  echo "ERROR: health endpoint did not return 200 within timeout"
  cat /tmp/ibn-hayan-batch2-prod.log || true
  exit 1
fi
echo "Health endpoint returned 200 in production: OK"

echo "===CHECKING /api/docs IS NOT SERVED IN PRODUCTION==="
DOCS_UI_HTTP="$(curl -s -o /dev/null -w '%{http_code}' "$DOCS_UI_URL" 2>/dev/null || true)"
echo "Swagger UI HTTP code: $DOCS_UI_HTTP"
if [[ "$DOCS_UI_HTTP" == "200" ]]; then
  echo "ERROR: Swagger UI should not return 200 in production"
  exit 1
fi
echo "Swagger UI not served in production: OK (HTTP $DOCS_UI_HTTP)"

echo "===CHECKING /api/docs-json IS NOT SERVED IN PRODUCTION==="
DOCS_JSON_HTTP="$(curl -s -o /dev/null -w '%{http_code}' "$DOCS_JSON_URL" 2>/dev/null || true)"
echo "OpenAPI JSON HTTP code: $DOCS_JSON_HTTP"
if [[ "$DOCS_JSON_HTTP" == "200" ]]; then
  echo "ERROR: OpenAPI JSON should not return 200 in production"
  exit 1
fi
echo "OpenAPI JSON not served in production: OK (HTTP $DOCS_JSON_HTTP)"

echo "===PRODUCTION VALIDATION PASSED==="
exit $EXIT_CODE
