import os
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

# Blueprints
core_bp = Blueprint("core", __name__, url_prefix="/api")
documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")
library_bp = Blueprint("library", __name__, url_prefix="/api/library")

# Répertoires et règles
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOC_ROOT = os.path.join(BASE_DIR, "documents")
os.makedirs(DOC_ROOT, exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".txt"}

def ensure_mode_dir(mode: str) -> str:
    m = (mode or "general").split(":")[0]
    p = os.path.join(DOC_ROOT, m)
    os.makedirs(p, exist_ok=True)
    return p

def allowed(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

# --- CORE (/api) ---
@core_bp.post("/ia")
def api_ia():
    data = request.get_json(force=True, silent=True) or {}
    prompt = (data.get("prompt") or "").strip()
    model = data.get("model") or ""
    if not prompt:
        return jsonify(error="prompt requis"), 400
    # TODO: router vers perplexity/perplexica/ollama/gpt selon le préfixe de 'model'
    return jsonify(result=f"[placeholder] {model}: {prompt[:200]}")

@core_bp.post("/upload")
def api_upload():
    file = request.files.get("file")
    profile = request.form.get("profile") or "general"
    category = request.form.get("category") or "extraction"
    if not file or not file.filename:
        return jsonify(error="fichier requis"), 400
    filename = secure_filename(file.filename)
    if not allowed(filename):
        return jsonify(error="extension non autorisée"), 400
    base = ensure_mode_dir(profile)
    dest_dir = os.path.join(base, category) if category else base
    os.makedirs(dest_dir, exist_ok=True)
    file.save(os.path.join(dest_dir, filename))
    return jsonify(ok=True, filename=filename, mode=(profile or "general"), subdir=category)

# --- DOCUMENTS (/api/documents) ---
@documents_bp.post("/generate")
def api_generate():
    data = request.get_json(force=True, silent=True) or {}
    q, r, model = data.get("question"), data.get("response"), data.get("model")
    if not q or not r:
        return jsonify(error="question/response requis"), 400
    out_dir = ensure_mode_dir(model)
    name = secure_filename(f"export_{(model or 'general').replace(':','_')}.txt")
    path = os.path.join(out_dir, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# Question\n{q}\n\n# Réponse\n{r}\n")
    return jsonify(success=True, filename=name)

@documents_bp.get("/download")
def api_download():
    filename = request.args.get("filename")
    model = request.args.get("model", "general")
    if not filename:
        return jsonify(error="filename requis"), 400
    folder = ensure_mode_dir(model)
    return send_from_directory(folder, secure_filename(filename), as_attachment=True)

@documents_bp.post("/extract")
def api_extract():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify(error="fichier requis"), 400
    # TODO: remplacer par l’extraction réelle (PyMuPDF/OCR)
    text = f"[extrait] {secure_filename(file.filename)}"
    return jsonify(text=text)

# --- LIBRARY (/api/library) ---
@library_bp.get("/structure")
def api_library_structure():
    modes = []
    for mode in ("general", "doctorant", "rapporteur"):
        folder = ensure_mode_dir(mode)
        nodes = []
        files_root = sorted([
            f for f in os.listdir(folder)
            if os.path.isfile(os.path.join(folder, f))
        ])
        nodes.append({"subdir": None, "files": files_root})
        for sd in sorted([
            d for d in os.listdir(folder)
            if os.path.isdir(os.path.join(folder, d))
        ]):
            subdir_path = os.path.join(folder, sd)
            files_sd = sorted([
                f for f in os.listdir(subdir_path)
                if os.path.isfile(os.path.join(subdir_path, f))
            ])
            nodes.append({"subdir": sd, "files": files_sd})
        modes.append({"mode": mode, "nodes": nodes})
    return jsonify({"modes": modes})

@library_bp.delete("/delete")
def api_library_delete():
    data = request.get_json(force=True, silent=True) or {}
    filename = secure_filename(data.get("filename") or "")
    mode = data.get("model")
    subdir = data.get("subdir")
    if not filename:
        return jsonify(error="filename requis"), 400
    base = ensure_mode_dir(mode)
    target_dir = os.path.join(base, subdir) if subdir else base
    os.makedirs(target_dir, exist_ok=True)
    path = os.path.join(target_dir, filename)
    if not os.path.exists(path):
        return jsonify(error="introuvable"), 404
    os.remove(path)
    return jsonify(deleted=filename, mode=(mode or "general"), subdir=subdir)

@library_bp.post("/rename")
def api_library_rename():
    data = request.get_json(force=True, silent=True) or {}
    old = secure_filename(data.get("oldName") or "")
    new = secure_filename(data.get("newName") or "")
    mode = data.get("model")
    subdir = data.get("subdir")
    if not old or not new:
        return jsonify(error="noms requis"), 400
    base = ensure_mode_dir(mode)
    target_dir = os.path.join(base, subdir) if subdir else base
    os.makedirs(target_dir, exist_ok=True)
    src = os.path.join(target_dir, old)
    dst = os.path.join(target_dir, new)
    if not os.path.exists(src):
        return jsonify(error="source introuvable"), 404
    if os.path.exists(dst):
        return jsonify(error="cible existe déjà"), 409
    os.rename(src, dst)
    return jsonify(renamed={"from": old, "to": new}, mode=(mode or "general"), subdir=subdir)
