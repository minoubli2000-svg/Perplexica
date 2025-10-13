import fitz  # PyMuPDF

doc = fitz.open(r"C:\Users\inoub\Documents\zola-claude.pdf")
text = ""
for page in doc:
    text_page = page.get_text()
    print(f"Page {page.number}: longueur {len(text_page)}")
    print("Aperçu page", page.number, ":", repr(text_page[:250]))
    text += text_page
doc.close()
print("Longueur totale extraite :", len(text))
print("Aperçu global :", repr(text[:500]))
