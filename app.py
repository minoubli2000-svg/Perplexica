from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from datetime import datetime

app = Flask(__name__)
# Autoriser l’UI (React/Electron) à appeler /api/* pendant le dev
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Dossiers de base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_PATH = os.path.join(BASE_DIR, "documents")
INCOMING_PATH = os.path.join(DOCS_PATH, "incoming")
os.makedirs(DOCS_PATH, exist_ok=True)
os.makedirs(INCOMING_PATH, exist_ok=True)

# Profils et catégories attendus par Themis
PROFILES = ["general", "doctorant", "rapporteur"]
CATEGORIES = ["extraction", "questions_reponses", "reponse_seule", "production"]
ALLOWED_EXTENSIONS = {".pdf", ".txt"}

def _profile_dir(model: str) -> str:
    """
    Retourne le dossier profil (insensible à la casse), le crée si besoin.
    """
    if not model:
        model = "general"
    model = model.split(":")[0]  # supporte "prefix:xxx"
    # Tolérance casse
    for candidate in [model, model.lower(), model.upper()]:
        p = os.path.join(DOCS_PATH, candidate)
        if os.path.isdir(p):
            return p
    # Par défaut créer en minuscules
    p = os.path.join(DOCS_PATH, model.lower())
    os.makedirs(p, exist_ok=True)
    return p

def _list_files_with_size(path: str):
    items = []
    if not os.path.isdir(path):
        return items
    for name in os.listdir(path):
        fpath = os.path.join(path, name)
        if os.path.isfile(fpath):
            try:
                size = os.path.getsize(fpath)
            except Exception:
                size = None
            items.append({"name": name, "size": size})
    return items

def _allowed(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

# ------------------ LIBRARY ------------------

@app.get("/api/library/structure")
def api_library_structure():
    """
    Renvoie la structure documentaire attendue par Themis:
    {
      "structure": {
        "general": { "extraction": [...], "questions_reponses": [...], "reponse_seule": [...], "production": [...], "": [...] },
        "doctorant": {...},
        "rapporteur": {...}
      }
    }
    """
    result = {}
    for prof in PROFILES:
        pdir = _profile_dir(prof)
        tree = {}
        # Catégories connues
        for cat in CATEGORIES:
            cdir = os.path.join(pdir, cat)
            os.makedirs(cdir, exist_ok=True)
            tree[cat] = _list_files_with_size(cdir)
        # Racine du profil
        tree[""] = _list_files_with_size(pdir)
        result[prof] = tree
    return jsonify({"structure": result})

@app.delete("/api/library/delete")
def api_library_delete():
    data = request.get_json(silent=True) or {}
    filename = data.get("filename")
    model = data.get("model") or "general"
    subdir = data.get("subdir")

    if not filename:
        return jsonify({"error": "filename requis"}), 400

    base = _profile_dir(model)
    target_dir = os.path.join(base, subdir) if subdir else base
    fpath = os.path.join(target_dir, filename)
    if not os.path.isfile(fpath):
        return jsonify({"error": "fichier introuvable"}), 404

    try:
        os.remove(fpath)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/library/rename")
def api_library_rename():
    data = request.get_json(silent=True) or {}
    old_name = data.get("oldName")
    new_name = data.get("newName")
    model = data.get("model") or "general"
    subdir = data.get("subdir")

    if not old_name or not new_name:
        return jsonify({"error": "oldName et newName requis"}), 400

    base = _profile_dir(model)
    target_dir = os.path.join(base, subdir) if subdir else base
    src = os.path.join(target_dir, old_name)
    dst = os.path.join(target_dir, secure_filename(new_name))

    if not os.path.isfile(src):
        return jsonify({"error": "source introuvable"}), 404

    if os.path.exists(dst):
        return jsonify({"error": "cible existe déjà"}), 409

    try:
        os.replace(src, dst)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ------------------ UPLOAD / EXTRACT ------------------

@app.post("/api/upload")
def api_upload():
    """
    Upload d’un fichier documentaire:
    form-data:
      - file (obligatoire)
      - profile = general|doctorant|rapporteur
      - category = extraction|questions_reponses|reponse_seule|production
    """
    file = request.files.get("file")
    profile = (request.form.get("profile") or "general").lower()
    category = (request.form.get("category") or "extraction").lower()

    if not file or not file.filename:
        return jsonify({"error": "file manquant"}), 400

    base = _profile_dir(profile)
    target_dir = os.path.join(base, category) if category else base
    os.makedirs(target_dir, exist_ok=True)

    fname = secure_filename(file.filename)
    if not _allowed(fname):
        return jsonify({"error": "extension non autorisée"}), 400

    fpath = os.path.join(target_dir, fname)
    file.save(fpath)
    return jsonify({"success": True, "path": fpath, "mode": profile, "subdir": category})

@app.post("/api/documents/extract")
def api_documents_extract():
    """
    Extraction simplifiée: lit le fichier binaire et tente un decode UTF-8 “best effort”.
    Remplacer par une vraie extraction/OCR selon besoin.
    """
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "file manquant"}), 400

    tname = secure_filename(file.filename)
    tpath = os.path.join(INCOMING_PATH, tname)
    file.save(tpath)

    text = ""
    try:
        with open(tpath, "rb") as fh:
            raw = fh.read()
            try:
                text = raw.decode("utf-8", errors="ignore")
            except Exception:
                text = ""
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify({"text": text or "Extraction simplifiée: pas de texte détecté."})

# ------------------ DOCUMENTS (generate / download) ------------------

@app.post("/api/documents/generate")
def api_documents_generate():
    """
    Génére un “document” minimal (txt) à partir de la question/réponse pour démo/export.
    """
    data = request.get_json(silent=True) or {}
    question = data.get("question") or ""
    response = data.get("response") or ""
    model = (data.get("model") or "general").lower()

    out_dir = os.path.join(_profile_dir(model), "production")
    os.makedirs(out_dir, exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"themis_{ts}.txt"
    fpath = os.path.join(out_dir, fname)

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(f"# Question\n{question}\n\n# Réponse\n{response}\n")

    return jsonify({"success": True, "filename": fname})

@app.get("/api/documents/download")
def api_documents_download():
    filename = request.args.get("filename")
    model = request.args.get("model", "general")
    if not filename:
        return jsonify({"error": "filename requis"}), 400
    folder = _profile_dir(model)
    # Chercher d’abord en production/, puis à la racine du profil
    prod = os.path.join(folder, "production")
    if os.path.isfile(os.path.join(prod, filename)):
        return send_from_directory(prod, secure_filename(filename), as_attachment=True)
    return send_from_directory(folder, secure_filename(filename), as_attachment=True)

# ------------------ IA ------------------

@app.post("/api/ia")
def api_ia():
    """
    Stub de réponse IA pour débloquer l’UI Themis si les services distants ne sont pas prêts.
    Remplacer par un routage vers Perplexity/Perplexica/Ollama/GPT selon 'model'.
    """
    data = request.get_json(silent=True) or {}
    prompt = data.get("prompt") or ""
    model = data.get("model") or ""
    if not prompt.strip():
        return jsonify({"error": "prompt vide"}), 400
    return jsonify({"result": f"[Réponse simulée] {model}: {prompt[:200]}..."})

# ------------------ MAIN ------------------

if __name__ == "__main__":
    # Lancer sur 3001 pour coller avec API_BASE côté Themis
    app.run(host="0.0.0.0", port=3001, debug=True)




