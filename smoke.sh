#!/bin/bash
# Smoke test script for efizion-factory-api
# Tests health endpoint and critical endpoints

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-test-api-key-for-ci}"

echo "🔍 Running smoke tests for API at: $API_URL"
echo ""

# Test 1: Health endpoint
echo "Test 1: GET /health"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$response" = "200" ]; then
  echo "✅ Health check passed (HTTP $response)"
else
  echo "❌ Health check failed (HTTP $response)"
  exit 1
fi

# Test 2: API documentation
echo ""
echo "Test 2: GET /documentation"
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/documentation")
if [ "$response" = "200" ] || [ "$response" = "302" ]; then
  echo "✅ Documentation endpoint passed (HTTP $response)"
else
  echo "❌ Documentation endpoint failed (HTTP $response)"
  exit 1
fi

# Test 3: Tasks endpoint (critical endpoint)
echo ""
echo "Test 3: GET /tasks (with auth)"
response=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $API_KEY" "$API_URL/tasks")
if [ "$response" = "200" ]; then
  echo "✅ Tasks endpoint passed (HTTP $response)"
else
  echo "❌ Tasks endpoint failed (HTTP $response)"
  exit 1
fi

echo ""
echo "✅ All smoke tests passed!"
