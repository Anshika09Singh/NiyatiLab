@echo off
echo ================================================
echo  AI Career Intelligence System - Quick Start
echo ================================================
echo.

REM ── Step 1: Create virtual environment
if not exist "backend\venv" (
  echo [1/4] Creating Python virtual environment...
  python -m venv backend\venv
) else (
  echo [1/4] Virtual environment already exists.
)

REM ── Step 2: Activate and install
echo [2/4] Installing Python dependencies...
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt --quiet

REM ── Step 3: Set up .env if not present
if not exist "backend\.env" (
  echo [3/4] Creating .env file from template...
  copy backend\.env.example backend\.env
  echo.
  echo  *** ACTION REQUIRED ***
  echo  Please edit backend\.env and add your GEMINI_API_KEY
  echo  Get a free key at: https://aistudio.google.com/apikey
  echo.
  pause
) else (
  echo [3/4] .env file found.
)

REM ── Step 4: Start Flask
echo [4/4] Starting Flask backend on http://localhost:5000
echo.
echo  Frontend: Open frontend\index.html in your browser
echo  Backend API: http://localhost:5000
echo  Health Check: http://localhost:5000/health
echo.
cd backend
python app.py
