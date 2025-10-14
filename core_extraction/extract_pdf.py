import sys
import fitz  # PyMuPDF
import json

def extract_pages_from_pdf(pdf_path, start_page=0, end_page=None):
    """
    Extrait texte de pages spécifiques PDF pour Themis.
    :param pdf_path: Chemin fichier (ex: documents/these.pdf)
    :param start_page: Page départ (0-indexé, default 0 = première)
    :param end_page: Page fin (None = toutes après start, inclusif)
    :return: Dict {"text": "...", "pages_extracted": [1,2], "total_pages": N}
    """
    try:
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        if end_page is None:
            end_page = total_pages - 1
        if start_page > end_page or start_page >= total_pages:
            return {"error": f"Pages invalides : start {start_page}, end {end_page}, total {total_pages}"}

        text = ""
        pages_extracted = []
        for i in range(start_page, end_page + 1):
            page = doc[i]
            text += page.get_text() + "\n--- Page {} ---\n".format(i + 1)  # Séparateurs pour Themis
            pages_extracted.append(i + 1)

        doc.close()
        return {
            "text": text.strip(),
            "pages_extracted": pages_extracted,
            "total_pages": total_pages,
            "file_path": pdf_path
        }
    except Exception as e:
        return {"error": f"Erreur extraction : {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <pdf_path> [start_page] [end_page]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    start_page = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    end_page = int(sys.argv[3]) if len(sys.argv) > 3 else None
    
    result = extract_pages_from_pdf(pdf_path, start_page, end_page)
    
    if "error" in result:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))  # Pour debug/test




