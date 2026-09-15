@echo off
echo Starting Tally Sync Agent inside VM...
cd /d "%~dp0"
python -m pip install requests python-dotenv supabase apscheduler python-dateutil
python main.py
pause
