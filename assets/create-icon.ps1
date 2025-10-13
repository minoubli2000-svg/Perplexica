# Télécharger l'image PNG générée et la convertir en ICO
Add-Type -AssemblyName System.Drawing

# Chemin de l'image source (vous devez télécharger l'image générée)
$sourceImage = "C:\Users\inoub\Perplexica\assets\themis_source.png"
$iconPath = "C:\Users\inoub\Perplexica\assets\themis.ico"

# Fonction pour créer un fichier .ico
function Convert-PngToIco {
    param([string]$PngPath, [string]$IcoPath)
    
    if (Test-Path $PngPath) {
        try {
            $bitmap = New-Object System.Drawing.Bitmap($PngPath)
            $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
            $fileStream = New-Object System.IO.FileStream($IcoPath, 'Create')
            $icon.Save($fileStream)
            $fileStream.Close()
            $bitmap.Dispose()
            Write-Host "✅ Icône .ico créée : $IcoPath" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "❌ Erreur conversion : $_" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "❌ Image source non trouvée : $PngPath" -ForegroundColor Red
        return $false
    }
}

# Créer une icône par défaut si pas de source
if (-not (Test-Path $sourceImage)) {
    Write-Host "💡 Création d'une icône de base..." -ForegroundColor Yellow
    
    # Créer une icône simple avec caractères
    $bitmap = New-Object System.Drawing.Bitmap(64, 64)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Fond
    $graphics.FillEllipse([System.Drawing.Brushes]::DarkRed, 0, 0, 64, 64)
    
    # Texte balance
    $font = New-Object System.Drawing.Font("Segoe UI Emoji", 32)
    $brush = [System.Drawing.Brushes]::White
    $graphics.DrawString("⚖", $font, $brush, 8, 12)
    
    $graphics.Dispose()
    $bitmap.Save($sourceImage)
    $bitmap.Dispose()
}

# Convertir en .ico
Convert-PngToIco $sourceImage $iconPath
