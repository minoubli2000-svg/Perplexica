import sys
from docx import Document

def extract_text_from_word(word_path):
    doc = Document(word_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_word.py <chemin_du_docx>")
        sys.exit(1)
    word_path = sys.argv[1]
    result = extract_text_from_word(word_path)
    print(result)

