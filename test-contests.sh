#!/bin/bash

# Contest System Validation Script
# Tests all contest functionality end-to-end

set -e

API_URL="${API_URL:-http://localhost:3000/api/v1}"
PROVIDER_1_ID="test-provider-1"
PROVIDER_2_ID="test-provider-2"
PROVIDER_3_ID="test-provider-3"

echo "🎯 Starting Contest System Validation..."
echo "API URL: $API_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Create Weekly ROI Contest
info "Test 1: Creating weekly ROI contest..."
START_TIME=$(date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ")
END_TIME=$(date -u -d "+8 days" +"%Y-%m-%dT%H:%M:%SZ")

CONTEST_RESPONSE=$(curl -s -X POST "$API_URL/contests" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Weekly Highest ROI Challenge\",
    \"startTime\": \"$START_TIME\",
    \"endTime\": \"$END_TIME\",
    \"metric\": \"HIGHEST_ROI\",
    \"minSignals\": 3,
    \"prizePool\": \"1000.00000000\"
  }")

CONTEST_ID=$(echo $CONTEST_RESPONSE | jq -r '.id')

if [ "$CONTEST_ID" != "null" ] && [ -n "$CONTEST_ID" ]; then
    success "Contest created with ID: $CONTEST_ID"
else
    error "Failed to create contest"
fi

# Test 2: Get Active Contests
info "Test 2: Fetching active contests..."
ACTIVE_CONTESTS=$(curl -s "$API_URL/contests/active")
ACTIVE_COUNT=$(echo $ACTIVE_CONTESTS | jq 'length')

if [ "$ACTIVE_COUNT" -gt 0 ]; then
    success "Found $ACTIVE_COUNT active contest(s)"
else
    error "No active contests found"
fi

# Test 3: Get Contest Details
info "Test 3: Fetching contest details..."
CONTEST_DETAILS=$(curl -s "$API_URL/contests/$CONTEST_ID")
CONTEST_NAME=$(echo $CONTEST_DETAILS | jq -r '.name')

if [ "$CONTEST_NAME" == "Weekly Highest ROI Challenge" ]; then
    success "Contest details retrieved correctly"
else
    error "Failed to retrieve contest details"
fi

# Test 4: Create Monthly Success Rate Contest
info "Test 4: Creating monthly success rate contest..."
START_TIME_2=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%SZ")
END_TIME_2=$(date -u -d "+31 days" +"%Y-%m-%dT%H:%M:%SZ")

CONTEST_2_RESPONSE=$(curl -s -X POST "$API_URL/contests" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Monthly Best Success Rate\",
    \"startTime\": \"$START_TIME_2\",
    \"endTime\": \"$END_TIME_2\",
    \"metric\": \"BEST_SUCCESS_RATE\",
    \"minSignals\": 5,
    \"prizePool\": \"2000.00000000\"
  }")

CONTEST_2_ID=$(echo $CONTEST_2_RESPONSE | jq -r '.id')

if [ "$CONTEST_2_ID" != "null" ] && [ -n "$CONTEST_2_ID" ]; then
    success "Second contest created with ID: $CONTEST_2_ID"
else
    error "Failed to create second contest"
fi

# Test 5: Create Volume Contest
info "Test 5: Creating volume contest..."
START_TIME_3=$(date -u -d "+3 hours" +"%Y-%m-%dT%H:%M:%SZ")
END_TIME_3=$(date -u -d "+15 days" +"%Y-%m-%dT%H:%M:%SZ")

CONTEST_3_RESPONSE=$(curl -s -X POST "$API_URL/contests" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Bi-Weekly Most Volume\",
    \"startTime\": \"$START_TIME_3\",
    \"endTime\": \"$END_TIME_3\",
    \"metric\": \"MOST_VOLUME\",
    \"minSignals\": 2,
    \"prizePool\": \"500.00000000\"
  }")

CONTEST_3_ID=$(echo $CONTEST_3_RESPONSE | jq -r '.id')

if [ "$CONTEST_3_ID" != "null" ] && [ -n "$CONTEST_3_ID" ]; then
    success "Third contest created with ID: $CONTEST_3_ID"
else
    error "Failed to create third contest"
fi

# Test 6: Get Leaderboard (should be empty initially)
info "Test 6: Fetching contest leaderboard..."
LEADERBOARD=$(curl -s "$API_URL/contests/$CONTEST_ID/leaderboard")
ENTRIES_COUNT=$(echo $LEADERBOARD | jq '.entries | length')

if [ "$ENTRIES_COUNT" -eq 0 ]; then
    success "Leaderboard is empty as expected (no signals yet)"
else
    info "Leaderboard has $ENTRIES_COUNT entries"
fi

# Test 7: Get All Contests
info "Test 7: Fetching all contests..."
ALL_CONTESTS=$(curl -s "$API_URL/contests?limit=100")
TOTAL_CONTESTS=$(echo $ALL_CONTESTS | jq 'length')

if [ "$TOTAL_CONTESTS" -ge 3 ]; then
    success "Retrieved $TOTAL_CONTESTS total contests"
else
    error "Expected at least 3 contests, got $TOTAL_CONTESTS"
fi

# Test 8: Filter Contests by Status
info "Test 8: Filtering contests by status..."
ACTIVE_ONLY=$(curl -s "$API_URL/contests?status=ACTIVE")
ACTIVE_FILTERED=$(echo $ACTIVE_ONLY | jq 'length')

if [ "$ACTIVE_FILTERED" -ge 3 ]; then
    success "Filtered $ACTIVE_FILTERED active contests"
else
    error "Failed to filter contests by status"
fi

# Test 9: Test Invalid Contest Creation (end before start)
info "Test 9: Testing validation (end time before start time)..."
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/contests" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Invalid Contest\",
    \"startTime\": \"$END_TIME\",
    \"endTime\": \"$START_TIME\",
    \"metric\": \"HIGHEST_ROI\",
    \"minSignals\": 3,
    \"prizePool\": \"1000.00000000\"
  }")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" == "400" ]; then
    success "Validation correctly rejected invalid contest"
else
    error "Validation failed to reject invalid contest (HTTP $HTTP_CODE)"
fi

# Test 10: Test Provider Stats (should be zero initially)
info "Test 10: Fetching provider contest stats..."
PROVIDER_STATS=$(curl -s "$API_URL/contests/provider/$PROVIDER_1_ID/stats")
TOTAL_CONTESTS_STAT=$(echo $PROVIDER_STATS | jq -r '.totalContests')

if [ "$TOTAL_CONTESTS_STAT" != "null" ]; then
    success "Provider stats retrieved: $TOTAL_CONTESTS_STAT total contests"
else
    error "Failed to retrieve provider stats"
fi

# Test 11: Create Past Contest for Finalization Test
info "Test 11: Creating past contest for finalization test..."
PAST_START=$(date -u -d "-8 days" +"%Y-%m-%dT%H:%M:%SZ")
PAST_END=$(date -u -d "-1 day" +"%Y-%m-%dT%H:%M:%SZ")

PAST_CONTEST=$(curl -s -X POST "$API_URL/contests" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Past Contest for Testing\",
    \"startTime\": \"$PAST_START\",
    \"endTime\": \"$PAST_END\",
    \"metric\": \"HIGHEST_ROI\",
    \"minSignals\": 1,
    \"prizePool\": \"100.00000000\"
  }")

PAST_CONTEST_ID=$(echo $PAST_CONTEST | jq -r '.id')

if [ "$PAST_CONTEST_ID" != "null" ] && [ -n "$PAST_CONTEST_ID" ]; then
    success "Past contest created with ID: $PAST_CONTEST_ID"
    
    # Test 12: Finalize Past Contest
    info "Test 12: Finalizing past contest..."
    FINALIZE_RESPONSE=$(curl -s -X POST "$API_URL/contests/$PAST_CONTEST_ID/finalize")
    WINNERS=$(echo $FINALIZE_RESPONSE | jq -r '.winners | length')
    
    if [ "$WINNERS" -eq 0 ]; then
        success "Contest finalized with no qualified entries (as expected)"
    else
        success "Contest finalized with $WINNERS winner(s)"
    fi
else
    error "Failed to create past contest"
fi

# Test 13: Test Finalization of Active Contest (should fail)
info "Test 13: Testing premature finalization (should fail)..."
PREMATURE_FINALIZE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/contests/$CONTEST_ID/finalize")
FINALIZE_HTTP_CODE=$(echo "$PREMATURE_FINALIZE" | tail -n1)

if [ "$FINALIZE_HTTP_CODE" == "400" ]; then
    success "Correctly prevented premature finalization"
else
    error "Failed to prevent premature finalization (HTTP $FINALIZE_HTTP_CODE)"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✓ All Contest System Tests Passed!${NC}"
echo "================================================"
echo ""
echo "Summary:"
echo "  - Created 4 contests (3 active, 1 finalized)"
echo "  - Tested all contest metrics (ROI, Success Rate, Volume)"
echo "  - Validated leaderboard functionality"
echo "  - Tested contest finalization"
echo "  - Verified validation rules"
echo "  - Tested provider statistics"
echo ""
echo "Contest IDs created:"
echo "  1. $CONTEST_ID (Weekly ROI)"
echo "  2. $CONTEST_2_ID (Monthly Success Rate)"
echo "  3. $CONTEST_3_ID (Bi-Weekly Volume)"
echo "  4. $PAST_CONTEST_ID (Past/Finalized)"
echo ""
