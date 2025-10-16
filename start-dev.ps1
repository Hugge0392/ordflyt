# Ladda .env fil och starta utvecklingsservern
# Används för att köra projektet lokalt på Windows

Write-Host "Laddar miljövariabler från .env..." -ForegroundColor Cyan

# Läs .env filen
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  ✓ $key" -ForegroundColor Green
        }
    }
    Write-Host ""
    Write-Host "Startar utvecklingsservern..." -ForegroundColor Cyan
    Write-Host ""
    npm run dev
} else {
    Write-Host "❌ .env filen finns inte!" -ForegroundColor Red
    Write-Host "Skapa .env filen med DATABASE_URL innan du startar servern." -ForegroundColor Yellow
    exit 1
}


