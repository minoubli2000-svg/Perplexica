@echo off
title Création Icône Themis
echo 🎨 Création de l'icône Themis avec balance...

cd /d "C:\Users\inoub\Perplexica"
mkdir assets 2>nul

echo 🏛️ Génération icône balance...
powershell -Command "Add-Type -AssemblyName System.Drawing; $b = New-Object System.Drawing.Bitmap(64,64); $g = [System.Drawing.Graphics]::FromImage($b); $g.FillEllipse([System.Drawing.Brushes]::Crimson, 0, 0, 64, 64); $f = New-Object System.Drawing.Font('Segoe UI Emoji', 32); $g.DrawString('⚖', $f, [System.Drawing.Brushes]::Gold, 8, 12); $g.Dispose(); $b.Save('assets\themis.ico'); $b.Dispose(); Write-Host 'Icône créée'"

echo ✅ Icône balance créée !
echo 🔗 Création du raccourci bureau...

powershell -Command "$s = New-Object -comObject WScript.Shell; $l = $s.CreateShortcut('$env:USERPROFILE\Desktop\⚖️ Thémis IA.lnk'); $l.TargetPath = 'C:\Users\inoub\Perplexica\scripts\Themis-Launcher.bat'; $l.WorkingDirectory = 'C:\Users\inoub\Perplexica'; $l.Description = 'Thémis - Assistant IA avec balance'; $l.Save(); Write-Host 'Raccourci créé'"

echo.
echo 🎉 TERMINÉ ! Icône Themis avec balance créée sur le bureau !
pause
