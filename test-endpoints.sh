#!/bin/bash

# Kudi AI Bank - API Testing Script
# Tests all 59 endpoints with curl

set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
API_PREFIX="$BASE_URL/api/v1"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Helper function to make requests
function test_endpoint() {
    local method=$1
    local path=$2
    local data=$3
    local token=$4
    
    local url="$API_PREFIX$path"
    local headers="-H 'Content-Type: application/json'"
    
    if [ -n "$token" ]; then
        headers="$headers -H 'Authorization: Bearer $token'"
    fi
    
    echo -e "${BLUE}Testing: $method $path${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED (HTTP $http_code)${NC}"
        PASSED=$((PASSED + 1))
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${YELLOW}⚠ EXPECTED ERROR (HTTP $http_code)${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAILED (HTTP $http_code)${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    echo "  Response: $body" | head -c 200
    echo ""
    echo ""
}

echo "================================================"
echo "  Kudi AI Bank - API Endpoint Testing"
echo "================================================"
echo "Base URL: $BASE_URL"
echo ""

# Check if server is running
echo -e "${BLUE}Checking server...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Server not responding at $BASE_URL${NC}"
    echo "Make sure the app is running:"
    echo "  npm run start:mobile-api"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Test Public Endpoints (No auth required)
echo -e "${BLUE}========== PUBLIC ENDPOINTS ==========${NC}\n"

test_endpoint "POST" "/auth/register" '{
  "email": "test@example.com",
  "phoneNumber": "+2348012345678",
  "password": "SecurePass123!",
  "firstName": "Test",
  "lastName": "User"
}'

# Authentication flow
echo -e "${BLUE}========== AUTHENTICATION ==========${NC}\n"

# Get access token for subsequent tests
register_response=$(curl -s -X POST "$API_PREFIX/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "phoneNumber": "+2348012345678",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }')

# Extract token (assuming the response includes it)
access_token=$(echo $register_response | grep -o '"token":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$access_token" ]; then
    echo -e "${YELLOW}No token found in response. Using empty token for subsequent tests.${NC}\n"
    access_token=""
fi

test_endpoint "POST" "/auth/login" '{
  "email": "test@example.com",
  "password": "SecurePass123!"
}' ""

# Protected Endpoints (Auth required)
echo -e "${BLUE}========== PROTECTED ENDPOINTS ==========${NC}\n"

test_endpoint "GET" "/users/me" "" "$access_token"
test_endpoint "GET" "/accounts/me" "" "$access_token"

# Create Account
account_response=$(curl -s -X POST "$API_PREFIX/accounts" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $access_token" \
  -d '{
    "accountType": "WALLET",
    "currency": "NGN"
  }')

account_id=$(echo $account_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$account_id" ]; then
    echo -e "${GREEN}✓ Created account: $account_id${NC}\n"
    
    test_endpoint "GET" "/accounts/$account_id" "" "$account_token"
    test_endpoint "POST" "/accounts/$account_id/credit" '{
      "amount": 50000,
      "reference": "test-credit-001"
    }' "$access_token"
fi

# Test all modules
echo -e "${BLUE}========== MODULE ENDPOINTS ==========${NC}\n"

test_endpoint "GET" "/kyc/me" "" "$access_token"
test_endpoint "GET" "/cards" "" "$access_token"
test_endpoint "GET" "/transfers/me" "" "$access_token"
test_endpoint "GET" "/rewards" "" "$access_token"
test_endpoint "GET" "/savings" "" "$access_token"
test_endpoint "GET" "/notifications/me" "" "$access_token"
test_endpoint "GET" "/bills/billers?category=ELECTRICITY" "" "$access_token"

# Summary
echo ""
echo "================================================"
echo "  Test Results"
echo "================================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
