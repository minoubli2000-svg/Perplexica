# extract_image.py
import sys
import os
import fitz  # PyMuPDF
from PIL import Image
import tkinter as tk
from tkinter import filedialog, messagebox

def pdf_to_images(pdf_path, out_dir, dpi=300):
    os.makedirs(out_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        mat = fitz.Matrix(dpi/72, dpi/72)
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        fname = f"page_{i+1:03d}.png"
        img.save(os.path.join(out_dir, fname))
    messagebox.showinfo("Terminé", f"{len(doc)} pages enregistrées dans :\n{out_dir}")

def main():
    root = tk.Tk()
    root.withdraw()

    # Sélection du PDF
    pdf_path = filedialog.askopenfilename(
        title="Choisir un PDF",
        filetypes=[("PDF", "*.pdf")],
        initialdir=os.getcwd()
    )
    if not pdf_path:
        return

    # Sélection du dossier de sortie
    out_dir = filedialog.askdirectory(
        title="Dossier de sortie pour images",
        initialdir=os.getcwd()
    )
    if not out_dir:
        return

    try:
        pdf_to_images(pdf_path, out_dir)
    except Exception as e:
        messagebox.showerror("Erreur", str(e))

if __name__ == "__main__":
    main()




