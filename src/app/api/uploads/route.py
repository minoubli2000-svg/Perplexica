import os
from flask import Flask, request, jsonify
import fitz  # PyMuPDF
from werkzeug.utils import secure_filename

app = Flask(__name__)

UPLOAD_FOLDER = os.path.dirname(os.path.abspath(__file__))
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/extract_pdf_text', methods=['POST'])
def extract_pdf_text():
    # Vérification de la présence du fichier
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Aucun fichier reçu', 'api_response': {}}), 400

    f = request.files['file']

    # Vérification de l'extension
    if f.filename == '' or not f.filename.lower().endswith('.pdf'):
        return jsonify({'success': False, 'message': 'Nom de fichier invalide ou pas un PDF', 'api_response': {}}), 400

    # Sécurisation du nom et sauvegarde
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(f.filename))
    try:
        f.save(save_path)
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erreur lors de la sauvegarde : {str(e)}', 'api_response': {}}), 500

    # Extraction du texte PDF
    try:
        doc = fitz.open(save_path)
        text = ""
        for page in doc:
            text_page = page.get_text()
            print(f"Page {page.number}: longueur {len(text_page)}")
            text += text_page
        doc.close()
        print("Longueur totale extraite :", len(text))
        print("Aperçu global :", repr(text[:500]))

        # Succès si le texte a une longueur décente (>100 caractères)
        if len(text.strip()) > 100:
            return jsonify({'success': True, 'message': 'Extraction réussie', 'api_response': {'texte': text}}), 200
        else:
            return jsonify({'success': False, 'message': 'PDF sans texte natif ou extraction vide.', 'api_response': {}}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': f'Erreur d\'extraction PDF : {str(e)}', 'api_response': {}}), 500

if __name__ == '__main__':
    print(app.url_map)  # Affiche la liste des routes au lancement
    app.run(debug=True)
