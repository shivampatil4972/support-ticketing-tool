@echo off
setlocal

cd /d "%~dp0"

for /f "usebackq" %%p in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique" 2^>nul`) do (
  if not "%%p"=="" (
    echo Stopping stale process using port 5000: %%p
    taskkill /PID %%p /F >nul 2>&1
  )
)

for /f "usebackq" %%p in (`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique" 2^>nul`) do (
  if not "%%p"=="" (
    echo Stopping stale process using port 5173: %%p
    taskkill /PID %%p /F >nul 2>&1
  )
)

start "Support Ticketing Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "Support Ticketing Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 0.0.0.0 --port 5173 --strictPort"

exit /b 0
