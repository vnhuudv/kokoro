#!/usr/bin/env bash
# Smoke test — Makoto transparency & knowledge sharing module
# Tests all endpoints end-to-end against a running api-gateway.
# Run locally:  bash tests/smoke/makoto.sh
# Run in CI:    executed automatically by .github/workflows/ci.yml

set -euo pipefail

BASE="${API_GATEWAY_URL:-http://localhost:3000}"
TENANT="${SLACK_TENANT_ID:-a0000000-0000-0000-0000-000000000001}"
USER="U-SMOKE-TEST"
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
echo "Makoto smoke test — $BASE"
echo "Tenant: $TENANT"
echo "────────────────────────────────────"

# 1. Health check
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/makoto/health")
check "GET /api/makoto/health" "$status" "200"

# 2. Create article post
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE/api/makoto/posts?tenantId=$TENANT&userId=$USER" \
  -H "Content-Type: application/json" \
  -d '{"title":"Working across cultures","body":"Here are five things I learned last month...","postType":"article"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -1)
check "POST /api/makoto/posts (article)" "$status" "201"
POST_ID=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
if [[ -z "$POST_ID" ]]; then
  echo "  FAIL  Could not parse post ID — aborting remaining tests"
  exit 1
fi
echo "        post_id=$POST_ID"

# 3. Create official post with metric refs
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "$BASE/api/makoto/posts?tenantId=$TENANT&userId=$USER" \
  -H "Content-Type: application/json" \
  -d '{"title":"Q2 Progress Report","body":"We have made great progress...","postType":"official","metricRefs":["en_score","carbon"]}')
check "POST /api/makoto/posts (official)" "$status" "201"

# 4. Get single post
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/makoto/posts/$POST_ID?tenantId=$TENANT")
check "GET /api/makoto/posts/:id" "$status" "200"

# 5. Add top-level comment
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE/api/makoto/posts/$POST_ID/comments?tenantId=$TENANT&userId=$USER" \
  -H "Content-Type: application/json" \
  -d '{"body":"Great insight, thanks for sharing!"}')
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -1)
check "POST /api/makoto/posts/:id/comments (top-level)" "$status" "201"
COMMENT_ID=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

# 6. Add reply to comment
if [[ -n "$COMMENT_ID" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$BASE/api/makoto/posts/$POST_ID/comments?tenantId=$TENANT&userId=U-REPLIER" \
    -H "Content-Type: application/json" \
    -d "{\"body\":\"Agreed!\",\"parentId\":\"$COMMENT_ID\"}")
  check "POST /api/makoto/posts/:id/comments (reply)" "$status" "201"
fi

# 7. Get comments (should include top-level + reply nested)
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/makoto/posts/$POST_ID/comments?tenantId=$TENANT")
check "GET /api/makoto/posts/:id/comments" "$status" "200"

# 8. Toggle reaction — like
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE/api/makoto/posts/$POST_ID/reactions?tenantId=$TENANT&userId=$USER" \
  -H "Content-Type: application/json")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -1)
check "POST /api/makoto/posts/:id/reactions (like)" "$status" "201"
LIKED=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['liked'])" 2>/dev/null || echo "")
echo "        liked=$LIKED"

# 9. Toggle reaction — unlike
response=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE/api/makoto/posts/$POST_ID/reactions?tenantId=$TENANT&userId=$USER" \
  -H "Content-Type: application/json")
body=$(echo "$response" | sed '$d')
status=$(echo "$response" | tail -1)
check "POST /api/makoto/posts/:id/reactions (unlike toggle)" "$status" "201"
LIKED2=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin)['liked'])" 2>/dev/null || echo "")
echo "        liked=$LIKED2"

# 10. Delete comment
if [[ -n "$COMMENT_ID" ]]; then
  status=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE \
    "$BASE/api/makoto/comments/$COMMENT_ID?tenantId=$TENANT&userId=$USER")
  check "DELETE /api/makoto/comments/:id (own comment)" "$status" "204"
fi

# 11. List feed
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/makoto/posts?tenantId=$TENANT")
check "GET /api/makoto/posts (feed)" "$status" "200"

echo ""
echo "────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
echo ""

[[ $FAIL -eq 0 ]]
