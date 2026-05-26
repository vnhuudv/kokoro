#!/usr/bin/env bash
# Smoke test — Nominication module
# Tests all 5 endpoints end-to-end against a running api-gateway.
# Run locally:  bash tests/smoke/nominication.sh
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
echo "Nominication smoke test — $BASE"
echo "Tenant: $TENANT"
echo "────────────────────────────────────"

# 1. Health check
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/nominication/health")
check "GET /api/nominication/health" "$status" "200"

# 2. Create session
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE/api/nominication/sessions?tenantId=$TENANT&slackUserId=U123TEST" \
  -H "Content-Type: application/json" \
  -d '{"channelId":"C-SMOKE-TEST","triggerType":"manual","venue":"CI smoke run"}')
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
check "POST /api/nominication/sessions" "$status" "201"

SESSION_ID=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null || echo "")

if [[ -z "$SESSION_ID" ]]; then
  echo "  FAIL  Could not parse session ID from response — skipping dependent tests"
  ((FAIL++)) || true
else
  echo "        Session ID: $SESSION_ID"

  # 3. Get session
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "$BASE/api/nominication/sessions/$SESSION_ID?tenantId=$TENANT")
  check "GET /api/nominication/sessions/:id" "$status" "200"

  # 4. Mark attendance
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$BASE/api/nominication/sessions/$SESSION_ID/attend?tenantId=$TENANT" \
    -H "Content-Type: application/json" \
    -d '{"slackUserId":"U123TEST"}')
  check "POST /api/nominication/sessions/:id/attend" "$status" "201"
fi

# 5. Get pending nudges
status=$(curl -s -o /dev/null -w "%{http_code}" \
  "$BASE/api/nominication/nudges/pending?tenantId=$TENANT")
check "GET /api/nominication/nudges/pending" "$status" "200"

echo "────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
echo ""

[[ $FAIL -eq 0 ]]
