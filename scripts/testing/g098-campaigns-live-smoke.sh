#!/usr/bin/env bash
# ==============================================================================
# G-098 — Agency Campaign Detail live-wiring smoke test
#
# Reproduces the manual UAT run against a real running stack: logs in as the
# bootstrap agency admin, finds (or creates) a Campaign Project + Set, then
# exercises every operation this goal wired to the live `campaigns` API and
# asserts the exact shape split that made this card non-trivial:
#
#   CP3 (get project)   -> nested `sets` are SUMMARIES ONLY (no `rules`)
#   CS1 (list sets)      -> paged, items also carry no `rules`
#   CS3 (get set)        -> full Set, `rules` present
#   CS4 (patch set)      -> a rules change persists across a fresh GET
#   CP4 (patch project)  -> a rename persists across a fresh GET
#
# This is the same assertion set `campaigns_api.rs`'s `cp1_cp4_cs1_cs4_happy_path`
# makes against the in-process test harness — this script makes the same
# assertions against a *really running* `cargo run -p api` / docker-compose
# backend, which is what caught the `hubBrandId` vs `brand.id` bug that no
# unit/lint/tsc check could see.
#
# Usage:
#   bash scripts/testing/g098-campaigns-live-smoke.sh            # boots db+gotrue+api, tests, leaves them up
#   bash scripts/testing/g098-campaigns-live-smoke.sh --down     # ...then tears the stack down after
#   bash scripts/testing/g098-campaigns-live-smoke.sh --no-up    # assume the stack is already running
#
# Env overrides:
#   API_BASE            default http://127.0.0.1:8080
#   AGENCY_EMAIL         default admin@sodality.local   (docker-compose AGENCY_BOOTSTRAP_EMAIL)
#   AGENCY_PASSWORD      default secret12                (docker-compose AGENCY_BOOTSTRAP_PASSWORD)
#   BRAND_NAME           default Acme
# ==============================================================================

set -euo pipefail

BOLD="\033[1m"; GREEN="\033[38;5;48m"; CYAN="\033[38;5;45m"; YELLOW="\033[38;5;220m"; RED="\033[38;5;196m"; RESET="\033[0m"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

API_BASE="${API_BASE:-http://127.0.0.1:8080}"
AGENCY_EMAIL="${AGENCY_EMAIL:-admin@sodality.local}"
AGENCY_PASSWORD="${AGENCY_PASSWORD:-secret12}"
BRAND_NAME="${BRAND_NAME:-Acme}"

DO_UP=1
DO_DOWN=0
for arg in "$@"; do
  case "$arg" in
    --no-up) DO_UP=0 ;;
    --down) DO_DOWN=1 ;;
    *) echo -e "${RED}Unknown flag: $arg${RESET}"; exit 1 ;;
  esac
done

pass() { echo -e "  ${GREEN}✓${RESET} $1"; }
fail() { echo -e "  ${RED}✗ $1${RESET}"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}▶ $1${RESET}"; }

cleanup() {
  if [ "$DO_DOWN" -eq 1 ]; then
    echo -e "\n${BOLD}${YELLOW}🧹 Tearing down docker compose stack...${RESET}"
    docker compose down
  fi
}
trap cleanup EXIT

echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}🧪  G-098 CAMPAIGN DETAIL — LIVE WIRING SMOKE TEST${RESET}"
echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════════════════${RESET}"

if [ "$DO_UP" -eq 1 ]; then
  step "Booting db + gotrue + api via docker compose (skip nextjs/krakend — API-only test)"
  docker compose up -d --build db gotrue api

  RETRIES=30
  until curl -sf -o /dev/null "$API_BASE/agency/brands" -H "Authorization: Bearer x" 2>/dev/null || [ $RETRIES -eq 0 ]; do
    sleep 1; RETRIES=$((RETRIES - 1))
  done
fi

step "Logging in as bootstrap agency admin ($AGENCY_EMAIL)"
LOGIN_RES="$(curl -sf -X POST "$API_BASE/agency/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AGENCY_EMAIL\",\"password\":\"$AGENCY_PASSWORD\"}")"
TOKEN="$(echo "$LOGIN_RES" | jq -r '.access_token')"
[ "$TOKEN" != "null" ] && [ -n "$TOKEN" ] || fail "Login failed — no access_token in response: $LOGIN_RES"
pass "Got access token"

auth_get() { curl -sf "$API_BASE$1" -H "Authorization: Bearer $TOKEN"; }
auth_post() { curl -sf -X POST "$API_BASE$1" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$2"; }
auth_patch() { curl -sf -X PATCH "$API_BASE$1" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$2"; }

step "Finding brand '$BRAND_NAME'"
BRAND_ID="$(auth_get "/agency/brands" | jq -r --arg n "$BRAND_NAME" '.[] | select(.name == $n) | .id' | head -1)"
[ -n "$BRAND_ID" ] || fail "No brand named '$BRAND_NAME' — set BRAND_NAME to an existing seeded brand"
pass "brand_id = $BRAND_ID"

step "Finding a 'ready' Brand Request for $BRAND_NAME"
REQUEST_ID="$(auth_get "/agency/brands/$BRAND_ID/requests" | jq -r '.items[] | select(.status == "ready") | .id' | head -1)"
[ -n "$REQUEST_ID" ] || fail "No 'ready' Brand Request found for this brand. This script does not drive the full New Request -> contract -> payment funnel (ADR-0005) — seed one manually first, or point BRAND_NAME at a brand that already has one."
pass "request_id = $REQUEST_ID (ready)"

step "Finding or creating a Campaign Project for that Request (CP1/CP2)"
PROJECT_ID="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects?page_size=50" | jq -r --arg rid "$REQUEST_ID" '.items[] | select(.request_id == $rid) | .id' | head -1)"
if [ -z "$PROJECT_ID" ]; then
  CREATE_RES="$(auth_post "/agency/brands/$BRAND_ID/campaign-projects" "{\"request_id\":\"$REQUEST_ID\",\"name\":\"G-098 smoke test project\"}")"
  PROJECT_ID="$(echo "$CREATE_RES" | jq -r '.id')"
  pass "Created new project $PROJECT_ID"
else
  pass "Reusing existing project $PROJECT_ID"
fi

step "CP3 — GET project detail: nested 'sets' must be summaries only (no 'rules')"
CP3_RES="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID")"
CP3_SETS_COUNT="$(echo "$CP3_RES" | jq '.sets | length')"
if [ "$CP3_SETS_COUNT" -gt 0 ]; then
  echo "$CP3_RES" | jq -e '.sets[0] | has("rules") | not' >/dev/null || fail "CP3's nested sets[0] unexpectedly has a 'rules' field — the CampaignProject.sets type in lib/api/campaigns.ts should NOT assume this"
  pass "CP3 nested sets carry no 'rules' ($CP3_SETS_COUNT set(s))"
else
  pass "CP3 project has 0 sets so far — will create one below"
fi

step "CS1 — GET paged Set list: items must also carry no 'rules'"
CS1_RES="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID/sets?page=1&page_size=50")"
CS1_COUNT="$(echo "$CS1_RES" | jq '.items | length')"
if [ "$CS1_COUNT" -eq 0 ]; then
  step "No Sets yet — creating one via CS2 to exercise CS3/CS4 below"
  SET_RES="$(auth_post "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID/sets" '{
    "name": "G-098 smoke test set",
    "mode": "managed",
    "rules": {"clip_count": 3, "submit_deadline_days": 14, "duration_days": 30, "commission": 20}
  }')"
  SET_ID="$(echo "$SET_RES" | jq -r '.id')"
  pass "Created set $SET_ID"
  CS1_RES="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID/sets?page=1&page_size=50")"
else
  SET_ID="$(echo "$CS1_RES" | jq -r '.items[0].id')"
fi
echo "$CS1_RES" | jq -e '.items[0] | has("rules") | not' >/dev/null || fail "CS1 list item unexpectedly has a 'rules' field"
pass "CS1 list items carry no 'rules'; using set $SET_ID"

step "CS3 — GET full Set: 'rules' must be present"
CS3_RES="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID/sets/$SET_ID")"
echo "$CS3_RES" | jq -e 'has("rules")' >/dev/null || fail "CS3 response is missing 'rules' — getCampaignSet's assumed shape is wrong"
ORIG_CLIP_COUNT="$(echo "$CS3_RES" | jq -r '.rules.clip_count')"
pass "CS3 returns full rules (clip_count=$ORIG_CLIP_COUNT)"

step "CS4 — PATCH Set rules, then re-GET to confirm it actually persisted"
NEW_CLIP_COUNT=$((ORIG_CLIP_COUNT + 1))
# Managed Sets require the full knob set on any `rules` patch (400 if partial) —
# same constraint the detail page's Save button respects by always sending the
# whole managedForm/broadcastForm object, never a single field.
NEW_RULES="$(echo "$CS3_RES" | jq --argjson c "$NEW_CLIP_COUNT" '.rules + {clip_count: $c}')"
auth_patch "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID/sets/$SET_ID" \
  "{\"rules\": $NEW_RULES}" >/dev/null
RELOADED_CLIP_COUNT="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID/sets/$SET_ID" | jq -r '.rules.clip_count')"
[ "$RELOADED_CLIP_COUNT" = "$NEW_CLIP_COUNT" ] || fail "CS4 patch did not persist: expected $NEW_CLIP_COUNT, got $RELOADED_CLIP_COUNT on re-GET"
pass "CS4 patch persisted across a fresh GET ($ORIG_CLIP_COUNT -> $RELOADED_CLIP_COUNT)"

step "CP4 — PATCH project name, then re-GET to confirm it actually persisted"
NEW_NAME="G-098 smoke test $(date +%s 2>/dev/null || echo static)"
auth_patch "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID" \
  "{\"name\": \"$NEW_NAME\"}" >/dev/null
RELOADED_NAME="$(auth_get "/agency/brands/$BRAND_ID/campaign-projects/$PROJECT_ID" | jq -r '.name')"
[ "$RELOADED_NAME" = "$NEW_NAME" ] || fail "CP4 patch did not persist: expected '$NEW_NAME', got '$RELOADED_NAME' on re-GET"
pass "CP4 patch persisted across a fresh GET"

echo -e "\n${BOLD}${GREEN}════════════════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}✅ G-098 LIVE WIRING SMOKE TEST — ALL CHECKS PASSED${RESET}"
echo -e "${BOLD}${GREEN}════════════════════════════════════════════════════════════════════${RESET}"
echo -e "project=$PROJECT_ID set=$SET_ID"
echo -e "Not covered here (needs a browser + live/fixture TikTok credentials):"
echo -e "  - T2 picker actually binding a Targeted Collaboration"
echo -e "  - CP4's bound-products checkbox list against real T1 product search"
echo -e "  - Visual UI check (copy, layout, dashboard/wizard unaffected)"
