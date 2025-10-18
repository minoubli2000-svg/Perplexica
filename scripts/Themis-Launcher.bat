@echo off
title Themis – Démarrage Complet
cls

REM Se placer à la racine du projet
cd /d "C:\Users\inoub\Perplexica"

REM 1. Démarrer l’interface Next.js (port 3000)
echo ▶️  Démarrage Frontend Next.js...
start "" /min cmd /c "npm run dev"

REM 2. Démarrer le backend Flask (port 3001)
echo ▶️  Démarrage Backend Flask...
start "" /min cmd /c "cd /d C:\Users\inoub\Perplexica\backend && python app.py"

REM 3. Construire et lancer Perplexica via Docker Compose
echo ▶️  Build et lancement Docker Compose...
cd /d "C:\Users\inoub\Perplexica"
docker-compose up -d --build

REM 4. Attendre le démarrage des services Docker
echo ⏳  Attente des services Docker (20s)...
timeout /t 20 /nobreak >nul

REM 5. Lancer l’application Electron avec GPU désactivé
echo ▶️  Lancement de l'application Electron...
start "" /min cmd /c "cd /d C:\Users\inoub\Perplexica\Electron && npx electron . --disable-gpu --disable-gpu-compositing --ignore-gpu-blocklist --disable-software-rasterizer"

echo ✅  Themis est opérationnel !
exit /b 0












