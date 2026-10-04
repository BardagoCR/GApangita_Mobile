@echo off
echo =====================================
echo     Starting Flask Website (Auto-Restart)
echo =====================================
cd /d "%~dp0"

:loop
echo.
echo Server starting on http://127.0.0.1:5000
py app.py
echo.
echo Server stopped unexpectedly. Restarting in 3 seconds...
timeout /t 3 >nul
goto loop