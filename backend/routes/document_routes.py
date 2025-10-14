import os
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv  # Charge file.env
import requests
from openai import OpenAI  # Fallback si besoin

load_dotenv('file.env')  # Charge ton file.env (ajoute chemin racine si besoin)

# Blueprints
core_bp = Blueprint("core", __name__, url_prefix="/api")
documents_bp = Blueprint("documents", __name__, url_prefix="/api/documents")
library_bp = Blueprint("library", __name__, url_prefix="/api/library")

# Répertoires et règles
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOC_ROOT = os.path.join(BASE_DIR, "documents")
os.makedirs(DOC_ROOT, exist_ok=True)
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".doc", ".docx", ".md", ".png", ".jpg", ".jpeg"}

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
    engine = data.get("engine", "ollama")  # Default Ollama local
    model = data.get("model") or os.getenv("OLLAMA_MODEL", "llama3")  # De file.env

    if not prompt:
        return jsonify(error="prompt requis"), 400

    try:
        if engine == "ollama":
            # IA réelle Ollama locale (tes modèles: llama3/mistral/etc.)
            ollama_port = os.getenv("OLLAMA_PORT", "11434")
            ollama_url = f"http://localhost:{ollama_port}"
            resp = requests.post(f"{ollama_url}/api/generate", json={
                "model": model,  # ex: llama3, mistral
                "prompt": prompt,
                "stream": False
            }, timeout=120)
            if resp.status_code == 200:
                result = resp.json()
                answer = result.get("response", "Erreur Ollama")
            else:
                return jsonify(error=f"Ollama {resp.status_code}: {resp.text}"), 500

        elif engine == "perplexity":
            # Fallback Perplexity API (clé de file.env)
            api_key = os.getenv("PERPLEXITY_API_KEY")
            if not api_key:
                return jsonify(error="Clé Perplexity manquante (file.env)"), 500
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            model_map = {"sonar": "sonar-medium-online", "claude-sonnet-4-5": "claude-3-5-sonnet-20240620"}
            model_name = model_map.get(model, "sonar-medium-online")
            resp = requests.post("https://api.perplexity.ai/chat/completions",
                                json={"model": model_name, "messages": [{"role": "user", "content": prompt}]},
                                headers=headers, timeout=120)
            if resp.status_code == 200:
                result = resp.json()
                answer = result["choices"][0]["message"]["content"]
            else:
                return jsonify(error=f"Perplexity {resp.status_code}"), 500

        else:
            return jsonify(error=f"Engine {engine} non supporté"), 400

        return jsonify(answer=answer)  # Réponse réelle, pas placeholder

    except Exception as e:
        print(f"IA Error: {str(e)}")
        return jsonify(error=f"IA échouée: {str(e)}"), 500

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
    filename = secure_filename(file.filename)
    temp_path = os.path.join(DOC_ROOT, "temp", filename)  # Temp dir
    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
    file.save(temp_path)

    try:
        extracted_text = ""
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            import fitz  # PyMuPDF
            doc = fitz.open(temp_path)
            for page in doc:
                extracted_text += page.get_text()
            doc.close()

        elif ext in [".doc", ".docx"]:
            from docx import Document
            doc = Document(temp_path)
            extracted_text = "\n".join([para.text for para in doc.paragraphs])

        elif ext in [".txt", ".md"]:
            with open(temp_path, "r", encoding="utf-8") as f:
                extracted_text = f.read()

        elif ext in [".png", ".jpg", ".jpeg"]:
            import easyocr
            reader = easyocr.Reader(["en", "fr"])  # Français/Anglais
            result = reader.readtext(temp_path)
            extracted_text = " ".join([text for _, text, _ in result])

        else:
            extracted_text = "Format non supporté"

        os.remove(temp_path)  # Nettoie temp
        return jsonify(extracted_text=extracted_text.strip())

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify(error=f"Extraction échouée: {str(e)}"), 500

# --- LIBRARY (/api/library) ---
@library_bp.get("/structure")
def api_library_structure():
    modes = []
    for mode in ("general", "doctorant", "rapporteur"):
        folder = ensure_mode_dir(mode)
        nodes = []
        files_root = sorted([f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))])
        nodes.append({"subdir": None, "files": files_root})
        for sd in sorted([d for d in os.listdir(folder) if os.path.isdir(os.path.join(folder, d))]):
            subdir_path = os.path.join(folder, sd)
            files_sd = sorted([f for f in os.listdir(subdir_path) if os.path.isfile(os.path.join(subdir_path, f))])
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

