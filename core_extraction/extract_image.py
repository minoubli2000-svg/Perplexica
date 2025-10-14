import sys
import os
from PIL import Image
import pytesseract
from datetime import datetime

# Force chemin Tesseract (adapte si différent sur ton système)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Chemin log (même dossier que scripts)
LOG_PATH = os.path.join(os.path.dirname(__file__), "core_extraction.log")

def log_message(message):
    """Écrit dans le log avec timestamp."""
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] extract_image: {message}\n")

def extract_text_from_image(image_path, lang="fra"):
    """
    Extrait texte d'une image via OCR Tesseract.
    :param image_path: Chemin complet vers l'image (.jpg, .png, .tiff, etc.)
    :param lang: Langue OCR (default 'fra' pour français)
    :return: Texte extrait (string)
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Fichier image introuvable: {image_path}")
    
    try:
        # Ouvre image avec PIL, redimensionne si trop grande (>2000px pour perf)
        with Image.open(image_path) as image:
            width, height = image.size
            if width > 2000 or height > 2000:
                # Redimensionne à 50% max pour accélérer OCR
                new_size = (width // 2, height // 2)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
                log_message(f"Image redimensionnée de {width}x{height} à {new_size[0]}x{new_size[1]}")
            
            # OCR avec Tesseract
            text = pytesseract.image_to_string(image, lang=lang)
            log_message(f"Extraction OCR réussie pour {os.path.basename(image_path)}: {len(text)} chars")
            return text.strip()
    
    except Exception as e:
        error_msg = f"Erreur OCR sur {os.path.basename(image_path)}: {str(e)}"
        log_message(error_msg)
        raise RuntimeError(error_msg)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_image.py hehemin_image>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    try:
        text = extract_text_from_image(image_path)
        print(text)  # Output pour subprocess (capturé par backend)
    except Exception as e:
        print(f"Erreur: {str(e)}", file=sys.stderr)  # Erreur en stderr, pas stdout
        sys.exit(1)


