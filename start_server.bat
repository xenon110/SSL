@echo off
title Tally Sync & Queue Server (Auto-Updating)
color 0A

:loop
echo ===================================================
echo [%date% %time%] Checking for updates from GitHub...
echo ===================================================

:: Pull the latest code from GitHub
git pull origin main

echo.
echo ===================================================
echo [%date% %time%] Starting Queue Listener...
echo ===================================================

:: Run the python script
cd sync_agent
python queue_listener.py
cd ..

echo.
echo ===================================================
echo [WARNING] Listener stopped. Restarting in 10 seconds...
echo ===================================================
timeout /t 10 /nobreak > nul
goto loop
