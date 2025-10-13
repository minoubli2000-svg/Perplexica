
@echo off
title Themis - Lancement Complet
color 0A
cls

echo.
echo  ████████╗██╗  ██╗███████╗███╗   ███╗██╗███████╗
echo  ╚══██╔══╝██║  ██║██╔════╝████╗ ████║██║██╔════╝
echo     ██║   ███████║█████╗  ██╔████╔██║██║███████╗
echo     ██║   ██╔══██║██╔══╝  ██║╚██╔╝██║██║╚════██║
echo     ██║   ██║  ██║███████╗██║ ╚═╝ ██║██║███████║
echo     ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝╚═╝╚══════╝
echo.
echo  🏛️  Assistant IA pour la gestion documentaire
echo  ==============================================

rem Racine du projet
cd /d "C:\Users\inoub\Perplexica"

echo 🐳 Démarrage services Docker...
start /min docker-compose up -d

echo ⏳ Initialisation Docker (15s)...
timeout /t 15 /nobreak >nul

echo 🐍 Démarrage Backend Flask (port 3001)...
start /min cmd /c "title Themis Backend && python app.py"

echo ⏳ Initialisation Backend (10s)...
timeout /t 10 /nobreak >nul

echo 🎨 Démarrage Interface React (port 3000)...
start /min cmd /c "title Themis Frontend && npm run dev"

echo ⏳ Initialisation Interface (15s)...
timeout /t 15 /nobreak >nul

rem Dossier Electron (adapter si différent)
set "ELECTRON_DIR=C:\Users\inoub\Perplexica\electron"

echo 🖥️ Lancement Application Electron (mode sans GPU)...
start "" /min /d "%ELECTRON_DIR%" cmd /c "title Themis Electron && npx electron . --disable-gpu --disable-gpu-compositing --ignore-gpu-blocklist"

echo.
echo 🎉 THEMIS LANCE AVEC SUCCES !
echo.
echo 🌐 Services actifs:
echo    • Interface: http://localhost:3000
echo    • Backend:   http://localhost:3001
echo    • Ollama:    http://localhost:11434
echo    • SearxNG:   http://localhost:4000
echo.
echo ⚖️ Themis est opérationnel !
timeout /t 10 /nobreak >nul

