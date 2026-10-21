@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22.13 or newer, then run this file again.
 pause
 exit /b 1
)
if not exist node_modules (
 call npm.cmd ci
 if errorlevel 1 goto fail
)
if not exist .env (
 call npm.cmd run setup
 if errorlevel 1 goto fail
)
call npm.cmd run check-db
if errorlevel 1 goto fail
if not exist dist\index.html (
 call npm.cmd run build
 if errorlevel 1 goto fail
)
echo Open http://localhost:3000 in your browser after the ready message.
call npm.cmd start
pause
exit /b
:fail
echo Setup failed. Read the message above and README.md.
pause
exit /b 1
