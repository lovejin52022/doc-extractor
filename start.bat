@echo off
setlocal

start "backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"
start "frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
