@echo off
title Themis - Démarrage
color 0C
echo 🏛️ Démarrage Themis...
cd /d "%~dp0"
docker-compose up -d
echo ⏳ Services (20s)...
timeout /t 20 /nobreak >nul
start /min cmd /c "npm run dev"
timeout /t 10 /nobreak >nul  
start "" node main.js
echo ✅ Themis opérationnel !
timeout /t 5 /nobreak >nul
