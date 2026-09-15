@echo off
echo Starting Tally Sync Agent inside VM...
cd /d "%~dp0"

if not exist .env (
    echo Creating .env configuration...
    echo SUPABASE_URL="https://rnebzqsgkgverxdqgmgp.supabase.co" > .env
    echo SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZWJ6cXNna2d2ZXJ4ZHFnbWdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzMzNTIxNiwiZXhwIjoyMDk4OTExMjE2fQ.mthp0-dB6hbJn_6d-N_SR-k2kHf_ARiQn_Kw3o_b8Ko" >> .env
    echo TALLY_URL="http://localhost:9000" >> .env
)

python -m pip install requests python-dotenv supabase apscheduler python-dateutil
python main.py
pause
