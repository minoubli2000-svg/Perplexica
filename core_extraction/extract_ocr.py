import sys
from PIL import Image, UnidentifiedImageError
import pytesseract
import os

# Chemin Tesseract Windows (adapte si besoin)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def extract_ocr(image_path, lang="fra"):
    if not os.path.exists(image_path):
        print(f"Erreur : le fichier {image_path} n'existe pas.")
        sys.exit(2)
    try:
        image = Image.open(image_path)
    except UnidentifiedImageError:
        print(f"Erreur : le fichier {image_path} n'est pas une image reconnue.")
        sys.exit(3)
    except Exception as e:
        print(f"Erreur d'ouverture : {str(e)}")
        sys.exit(4)
    try:
        text = pytesseract.image_to_string(image, lang=lang)
    except Exception as e:
        print(f"Erreur OCR : {str(e)}")
        sys.exit(5)
    return text

if __name__ == "__main__":
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage : python extract_ocr.py <chemin_image> [lang]")
        print("Exemple : python extract_ocr.py monimage.jpg fra")
        sys.exit(1)
    image_path = sys.argv[1]
    lang = sys.argv[2] if len(sys.argv) == 3 else "fra"
    result = extract_ocr(image_path, lang)
    print(result)
