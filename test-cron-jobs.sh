#!/bin/bash

###############################################################################
# Cron Job Testing Script - CTO Dashboard v2.0
#
# Tests all three cron jobs (daily, hourly, weekly) by making authenticated
# HTTP requests to the endpoints.
#
# Usage:
#   ./test-cron-jobs.sh [daily|hourly|weekly|all]
#
# Examples:
#   ./test-cron-jobs.sh all       # Test all jobs
#   ./test-cron-jobs.sh daily     # Test daily job only
#   ./test-cron-jobs.sh hourly    # Test hourly job only
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.local"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  echo -e "${BLUE}Loading environment from $ENV_FILE${NC}"
  export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
else
  echo -e "${RED}Error: .env.local file not found${NC}"
  exit 1
fi

# Check for CRON_SECRET
if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}Error: CRON_SECRET not set in .env.local${NC}"
  exit 1
fi

# Determine base URL
if [ -z "$BASE_URL" ]; then
  BASE_URL="http://localhost:3000"
  echo -e "${YELLOW}BASE_URL not set, using default: $BASE_URL${NC}"
fi

###############################################################################
# Helper Functions
###############################################################################

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo ""
}

test_cron_job() {
  local job_name=$1
  local endpoint=$2

  print_header "Testing $job_name Cron Job"

  echo -e "${YELLOW}Endpoint:${NC} $BASE_URL$endpoint"
  echo -e "${YELLOW}Method:${NC} POST"
  echo ""

  # Make the request
  echo -e "${BLUE}Sending request...${NC}"

  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL$endpoint" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -H "Content-Type: application/json")

  # Extract status code
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  echo ""
  echo -e "${YELLOW}HTTP Status:${NC} $http_code"
  echo ""

  # Check status code
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓ Job executed successfully${NC}"
    echo ""
    echo -e "${YELLOW}Response:${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""

    # Extract job details
    job_id=$(echo "$body" | jq -r '.jobId' 2>/dev/null)
    success=$(echo "$body" | jq -r '.success' 2>/dev/null)
    duration=$(echo "$body" | jq -r '.result.duration' 2>/dev/null)

    if [ "$success" = "true" ]; then
      echo -e "${GREEN}✓ Job completed successfully${NC}"
      if [ "$duration" != "null" ]; then
        duration_sec=$(echo "scale=2; $duration / 1000" | bc)
        echo -e "${GREEN}  Duration: ${duration_sec}s${NC}"
      fi
      if [ "$job_id" != "null" ]; then
        echo -e "${GREEN}  Job ID: $job_id${NC}"
      fi
    else
      echo -e "${RED}✗ Job reported failure${NC}"
    fi

    return 0
  elif [ "$http_code" = "401" ]; then
    echo -e "${RED}✗ Authentication failed (401 Unauthorized)${NC}"
    echo -e "${RED}  Check your CRON_SECRET in .env.local${NC}"
    return 1
  elif [ "$http_code" = "405" ]; then
    echo -e "${RED}✗ Method not allowed (405)${NC}"
    echo -e "${RED}  The endpoint might not exist or doesn't accept POST${NC}"
    return 1
  elif [ "$http_code" = "500" ]; then
    echo -e "${RED}✗ Internal server error (500)${NC}"
    echo ""
    echo -e "${YELLOW}Error response:${NC}"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
  else
    echo -e "${RED}✗ Unexpected status code: $http_code${NC}"
    echo ""
    echo -e "${YELLOW}Response:${NC}"
    echo "$body"
    return 1
  fi
}

check_job_status() {
  local job_id=$1

  echo ""
  echo -e "${BLUE}Checking job status in database...${NC}"

  # TODO: Add database query to check job_history table
  # This would require a separate database query script
  echo -e "${YELLOW}To check job status, run:${NC}"
  echo "  SELECT * FROM job_history WHERE id = '$job_id';"
}

###############################################################################
# Main Script
###############################################################################

main() {
  local test_type=${1:-all}
  local failed=0

  print_header "CTO Dashboard Cron Job Testing"

  echo -e "${YELLOW}Configuration:${NC}"
  echo -e "  Base URL: $BASE_URL"
  echo -e "  CRON_SECRET: ${CRON_SECRET:0:8}... (hidden)"
  echo ""

  # Check if server is running
  echo -e "${BLUE}Checking server availability...${NC}"
  if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Could not reach server at $BASE_URL${NC}"
    echo -e "${YELLOW}  Make sure your server is running${NC}"
    echo ""
  fi

  # Run tests based on argument
  case $test_type in
    daily)
      test_cron_job "Daily" "/api/cron/daily" || failed=$((failed + 1))
      ;;
    hourly)
      test_cron_job "Hourly" "/api/cron/hourly" || failed=$((failed + 1))
      ;;
    weekly)
      test_cron_job "Weekly" "/api/cron/weekly" || failed=$((failed + 1))
      ;;
    all)
      test_cron_job "Daily" "/api/cron/daily" || failed=$((failed + 1))
      sleep 2
      test_cron_job "Hourly" "/api/cron/hourly" || failed=$((failed + 1))
      sleep 2
      test_cron_job "Weekly" "/api/cron/weekly" || failed=$((failed + 1))
      ;;
    *)
      echo -e "${RED}Error: Invalid argument '$test_type'${NC}"
      echo ""
      echo "Usage: $0 [daily|hourly|weekly|all]"
      exit 1
      ;;
  esac

  # Summary
  print_header "Test Summary"

  if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. Check the Vercel dashboard to verify cron schedules"
    echo "  2. Monitor job execution in production"
    echo "  3. Set up email alerts for failures"
    echo ""
    exit 0
  else
    echo -e "${RED}✗ $failed test(s) failed${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Check server logs for error messages"
    echo "  2. Verify DATABASE_URL is correctly set"
    echo "  3. Ensure Prisma migrations are up to date"
    echo "  4. Check CRON_SECRET matches in .env.local"
    echo ""
    exit 1
  fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
  echo -e "${RED}Error: curl is required but not installed${NC}"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq is not installed, response formatting will be limited${NC}"
  echo -e "${YELLOW}Install with: brew install jq (macOS) or apt-get install jq (Linux)${NC}"
  echo ""
fi

# Run main function
main "$@"
