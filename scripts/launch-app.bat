@echo off
REM API Test Harness - Launch Script
REM This script starts the development server and opens the app in your default browser

echo ========================================
echo API Test Harness
echo ========================================
echo.
echo Starting development server...
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: npm install failed
        pause
        exit /b 1
    )
)

REM Start the dev server
echo.
echo Starting Vite dev server...
echo The app will open in your browser automatically.
echo.
echo Press Ctrl+C to stop the server when done.
echo.

start "" "http://localhost:5151"
call npm run dev

pause
