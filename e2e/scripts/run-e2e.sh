#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
E2E_DIR="$ROOT/e2e"

export API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:8000}"
export WEB_BASE_URL="${WEB_BASE_URL:-http://127.0.0.1:3000}"
export TABLE_BASE_URL="${TABLE_BASE_URL:-http://127.0.0.1:5173}"
export E2E_USERNAME="${E2E_USERNAME:-e2e_tester}"
export E2E_PASSWORD="${E2E_PASSWORD:-E2eTest123!}"

echo "==> API health: $API_BASE_URL/healthz"
curl -sf "$API_BASE_URL/healthz" >/dev/null || {
  echo "API 未就绪。请先启动 todo-server-go (HTTP_ADDR=:8000)"
  exit 1
}

cd "$E2E_DIR"
npm install --silent
npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium

npx playwright test "$@"
echo "==> HTML 报告: $E2E_DIR/playwright-report/index.html"
echo "==> JSON 结果: $E2E_DIR/test-results/results.json"
