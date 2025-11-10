#!/bin/bash

# Test Debug System Script
# Använd detta script för att testa debugging-systemet lokalt

BASE_URL="${1:-http://localhost:5000}"
echo "Testing debug endpoints on: $BASE_URL"
echo "================================"
echo ""

echo "1️⃣ Testing Health Check..."
curl -s "$BASE_URL/api/debug/health" | json_pp || curl -s "$BASE_URL/api/debug/health"
echo -e "\n"

echo "2️⃣ Testing System Info..."
curl -s "$BASE_URL/api/debug/info" | json_pp || curl -s "$BASE_URL/api/debug/info"
echo -e "\n"

echo "3️⃣ Testing Database Status..."
curl -s "$BASE_URL/api/debug/db-status" | json_pp || curl -s "$BASE_URL/api/debug/db-status"
echo -e "\n"

echo "4️⃣ Testing Recent Logs..."
curl -s "$BASE_URL/api/debug/logs?limit=10" | json_pp || curl -s "$BASE_URL/api/debug/logs?limit=10"
echo -e "\n"

echo "5️⃣ Testing Error Tracking (sync error)..."
curl -s "$BASE_URL/api/debug/test-error?type=sync" 2>&1 | head -20
echo -e "\n"

echo "================================"
echo "✅ Debug system test complete!"
echo ""
echo "För produktion, använd:"
echo "  curl -H 'X-Debug-Token: YOUR_TOKEN' https://your-app.vercel.app/api/debug/health"



