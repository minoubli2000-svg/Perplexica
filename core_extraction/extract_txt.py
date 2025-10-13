import sys
import os

def extract_txt(txt_path):
    if not os.path.isfile(txt_path):
        print(f"Erreur : fichier {txt_path} introuvable")
        sys.exit(2)
    try:
        with open(txt_path, "r", encoding="utf-8") as f:
            text = f.read()
        return text
    except Exception as e:
        print(f"Erreur lecture .txt : {str(e)}")
        sys.exit(3)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage : python extract_txt.py <chemin_txt>")
        sys.exit(1)
    txt_path = sys.argv[1]
    print(extract_txt(txt_path))
