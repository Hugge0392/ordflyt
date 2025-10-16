@echo off
echo Startar Ordflyt utvecklingsserver...
echo.

REM Läs DATABASE_URL från .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="DATABASE_URL" set DATABASE_URL=%%b
    if "%%a"=="NODE_ENV" set NODE_ENV=%%b
    if "%%a"=="ADMIN_PASSWORD" set ADMIN_PASSWORD=%%b
    if "%%a"=="SESSION_SECRET" set SESSION_SECRET=%%b
)

REM Ta bort citattecken från DATABASE_URL
set DATABASE_URL=%DATABASE_URL:"=%

echo Miljovariabler laddade!
echo.
npm run dev


