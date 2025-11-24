#!/bin/bash

# ============================================================================
# CTO Dashboard API v2.0 - Quick Test Script
# ============================================================================

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:5000}"
API_KEY="${API_KEY:-your-api-key-1}"

# Function to print test header
print_header() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}========================================${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    local auth=$5

    echo ""
    echo "Testing: $description"
    echo "  Method: $method"
    echo "  Endpoint: $endpoint"

    if [ "$auth" = "true" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X "$method" \
                -H "x-api-key: $API_KEY" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_URL$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X "$method" \
                -H "x-api-key: $API_KEY" \
                "$API_URL$endpoint")
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_URL$endpoint")
        else
            response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
                -X "$method" \
                "$API_URL$endpoint")
        fi
    fi

    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')

    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        print_success "Status: $http_status"
        echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
    else
        print_error "Status: $http_status"
        echo "$body" | jq -C '.' 2>/dev/null || echo "$body"
    fi
}

# ============================================================================
# START TESTS
# ============================================================================

echo -e "${GREEN}"
cat << "EOF"
   ____ _____ ___    ____            _     _                         _
  / ___|_   _/ _ \  |  _ \  __ _ ___| |__ | |__   ___   __ _ _ __ __| |
 | |     | || | | | | | | |/ _` / __| '_ \| '_ \ / _ \ / _` | '__/ _` |
 | |___  | || |_| | | |_| | (_| \__ \ | | | |_) | (_) | (_| | | | (_| |
  \____| |_| \___/  |____/ \__,_|___/_| |_|_.__/ \___/ \__,_|_|  \__,_|

                    API v2.0 - Quick Test Suite
EOF
echo -e "${NC}"

echo "API URL: $API_URL"
echo "API Key: ${API_KEY:0:10}..."

# ============================================================================
# HEALTH CHECK
# ============================================================================

print_header "Health Check"
test_endpoint "GET" "/health" "Health check" "" "false"

# ============================================================================
# API INFO
# ============================================================================

print_header "API Information"
test_endpoint "GET" "/api" "API info" "" "false"

# ============================================================================
# PROJECTS API
# ============================================================================

print_header "Projects API Tests"

test_endpoint "GET" "/api/projects?limit=5" "List projects" "" "false"

test_endpoint "GET" "/api/projects?status=active&complexity_min=7" \
    "Filter projects by status and complexity" "" "false"

# ============================================================================
# ANALYTICS API
# ============================================================================

print_header "Analytics API Tests"

test_endpoint "GET" "/api/analytics/summary" "Dashboard summary" "" "false"

test_endpoint "GET" "/api/analytics/trends?metric=bugs&period=30d&group_by=week" \
    "Bug trends (30 days, weekly)" "" "false"

test_endpoint "GET" "/api/analytics/risks" "Risk assessment" "" "false"

# ============================================================================
# METRICS API
# ============================================================================

print_header "Metrics API Tests"

test_endpoint "GET" "/api/metrics/daily?days=7" "Daily metrics (7 days)" "" "false"

test_endpoint "GET" "/api/metrics/monthly?months=6" "Monthly metrics (6 months)" "" "false"

# ============================================================================
# PROTECTED ENDPOINTS (requires API key)
# ============================================================================

print_header "Protected Endpoints Tests"

# Test creating a project
PROJECT_DATA='{
  "name": "Test API Project",
  "description": "Created via API test script",
  "status": "active",
  "complexity": 5,
  "client_appeal": 7
}'

test_endpoint "POST" "/api/projects" "Create project (protected)" "$PROJECT_DATA" "true"

# ============================================================================
# AUTHENTICATION TESTS
# ============================================================================

print_header "Authentication Tests"

test_endpoint "POST" "/api/projects" "Create without API key (should fail)" "$PROJECT_DATA" "false"

# ============================================================================
# RATE LIMITING TEST
# ============================================================================

print_header "Rate Limiting Test"

echo ""
echo "Sending 15 requests rapidly to test rate limiter..."
echo "(Rate limit: 10 requests/second)"
echo ""

success_count=0
rate_limited_count=0

for i in {1..15}; do
    response=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/projects?limit=1")
    if [ "$response" -eq 200 ]; then
        ((success_count++))
        echo -n "."
    elif [ "$response" -eq 429 ]; then
        ((rate_limited_count++))
        echo -n "R"
    fi
done

echo ""
echo ""
echo "Results:"
echo "  Successful: $success_count"
echo "  Rate Limited: $rate_limited_count"

if [ $rate_limited_count -gt 0 ]; then
    print_success "Rate limiting is working correctly"
else
    print_error "Rate limiting may not be working (no 429 responses)"
fi

# ============================================================================
# SUMMARY
# ============================================================================

print_header "Test Summary"

echo ""
echo "All basic API tests completed!"
echo ""
echo "Next steps:"
echo "  1. Review the test results above"
echo "  2. Check the complete documentation: ../API_ROUTES_DOCUMENTATION.md"
echo "  3. Import OpenAPI spec into Postman: GET $API_URL/api/docs"
echo "  4. Set up GitHub webhooks for real-time integration"
echo ""
echo "For more details, see:"
echo "  - API Documentation: ../API_ROUTES_DOCUMENTATION.md"
echo "  - Implementation Summary: ../API_IMPLEMENTATION_SUMMARY.md"
echo ""
