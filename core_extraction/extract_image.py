import sys
from PIL import Image
import pytesseract

# Force le bon chemin binaire
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def extract_text_from_image(image_path):
    image = Image.open(image_path)
    text = pytesseract.image_to_string(image, lang="fra") # adapte la langue si besoin
    return text

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_image.py <chemin_image>")
        sys.exit(1)
    image_path = sys.argv[1]
    print(extract_text_from_image(image_path))

