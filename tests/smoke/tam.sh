#!/usr/bin/env bash
# Smoke test — Tâm social impact module
# Tests all 9 endpoints end-to-end against a running api-gateway.
# Run locally:  bash tests/smoke/tam.sh
# Run in CI:    executed automatically by .github/workflows/ci.yml

set -euo pipefail

BASE="${API_GATEWAY_URL:-http://localhost:3000}"
TENANT="${SLACK_TENANT_ID:-a0000000-0000-0000-0000-000000000001}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local status="$2"
  local expected="$3"
  if [[ "$status" == "$expected" ]]; then
    echo "  PASS  $label (HTTP $status)"
    ((PASS++)) || true
  else
    echo "  FAIL  $label — expected HTTP $expected, got HTTP $status"
    ((FAIL++)) || true
  fi
}

echo ""
echo "Tâm smoke test — $BASE"
echo "Tenant: $TENANT"
echo "────────────────────────────────────"

# 1. Health check
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/tam/health")
check "GET /api/tam/health" "$status" "200"

# 2. Create social impact post
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE/api/tam/posts?tenantId=$TENANT&userId=U-SMOKE-TEST" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ocean Cleanup Drive","description":"Help remove plastic from Da Nang beaches","category":"climate","externalUrl":"https://example.org/donate"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -n 1)
check "POST /api/tam/posts" "$status" "201"

POST_ID=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

if [[ -z "$POST_ID" ]]; then
  echo "  FAIL  Could not parse post ID from response — skipping dependent tests"
  ((FAIL += 3)) || true
else
  echo "        Post ID: $POST_ID"

  # 3. Get post by ID
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE/api/tam/posts/$POST_ID?tenantId=$TENANT")
  check "GET /api/tam/posts/:id" "$status" "200"

  # 4. Log action on post
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$BASE/api/tam/posts/$POST_ID/actions?tenantId=$TENANT&userId=U-SMOKE-TEST" \
    -H "Content-Type: application/json" \
    -d '{"actionType":"donation","externalUrlClicked":true,"amountLogged":20,"note":"Happy to help"}')
  check "POST /api/tam/posts/:id/actions" "$status" "201"

  # 5. List actions for post
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE/api/tam/posts/$POST_ID/actions?tenantId=$TENANT")
  check "GET /api/tam/posts/:id/actions" "$status" "200"
fi

# 6. List all posts
status=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/tam/posts?tenantId=$TENANT")
check "GET /api/tam/posts" "$status" "200"

# 7. Get leaderboard
status=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/tam/leaderboard?tenantId=$TENANT")
check "GET /api/tam/leaderboard" "$status" "200"

# 8. Get user badges
status=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/tam/users/U-SMOKE-TEST/badges?tenantId=$TENANT")
check "GET /api/tam/users/:userId/badges" "$status" "200"

# 9. Get user points
status=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/tam/users/U-SMOKE-TEST/points?tenantId=$TENANT")
check "GET /api/tam/users/:userId/points" "$status" "200"

echo "────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
echo ""

[[ $FAIL -eq 0 ]]
