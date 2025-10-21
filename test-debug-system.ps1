# Test Debug System Script (PowerShell)
# Använd detta script för att testa debugging-systemet lokalt på Windows

param(
    [string]$BaseUrl = "http://localhost:5000"
)

Write-Host "Testing debug endpoints on: $BaseUrl" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Testing Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/debug/health" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "2️⃣ Testing System Info..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/debug/info" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "3️⃣ Testing Database Status..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/debug/db-status" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "4️⃣ Testing Recent Logs..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/debug/logs?limit=10" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Debug system test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "För produktion, använd:" -ForegroundColor Yellow
Write-Host '  $headers = @{"X-Debug-Token"="YOUR_TOKEN"}' -ForegroundColor Gray
Write-Host '  Invoke-RestMethod -Uri "https://your-app.vercel.app/api/debug/health" -Headers $headers' -ForegroundColor Gray

