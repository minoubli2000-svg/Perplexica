from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import json
import subprocess
import sys
import uuid
import requests
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()  # lit automatiquement .env à la racine

import fitz  # PyMuPDF (optionnel, pour compat scripts)

# Détermine la racine projet (un niveau au-dessus de backend/)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))  # = C:\Users\inoub\Perplexica\backend
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)  # = C:\Users\inoub\Perplexica\

# Charge file.env depuis racine projet (ton fichier)
ENV_PATH = os.path.join(PROJECT_ROOT, "file.env")
load_dotenv(ENV_PATH)  # Si .env au lieu de file.env, change à ".env"

app = Flask(__name__)

# Autoriser l’UI (React/Electron) à appeler /api/* pendant le dev
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Dossiers de base (relatifs à racine projet)
DOCS_PATH = os.path.join(PROJECT_ROOT, "documents")
INCOMING_PATH = os.path.join(DOCS_PATH, "incoming")
CORE_EXTRACTION_PATH = os.path.join(PROJECT_ROOT, "core_extraction")  # Relatif à racine (plus flexible)
os.makedirs(DOCS_PATH, exist_ok=True)
os.makedirs(INCOMING_PATH, exist_ok=True)
os.makedirs(CORE_EXTRACTION_PATH, exist_ok=True)

# Profils et catégories attendus par Themis
PROFILES = ["general", "doctorant", "rapporteur"]
CATEGORIES = ["extraction", "questions_reponses", "reponse_seule", "production"]

# Extensions supportées (étendu pour extraction)
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".tiff", ".bmp"}

# Ports depuis file.env (défaut si manquants)
PERPLEXICA_PORT = int(os.getenv('PERPLEXICA_PORT', 3001))
BACKEND_PORT = int(os.getenv('BACKEND_PORT', 5000))
OLLAMA_PORT = int(os.getenv('OLLAMA_PORT', 11434))

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

def log_extraction(message: str):
    """Log pour extraction dans core_extraction.log."""
    log_path = os.path.join(CORE_EXTRACTION_PATH, "core_extraction.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] {message}\n")

# ------------------ BIBLIOTHÈQUE UNIQUE (INCHANGÉE) ------------------
@app.get("/api/library/structure")
def api_library_structure():
    """
    Renvoie la structure documentaire : profils > catégories > fichiers (avec tailles).
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

# ------------------ UPLOAD (INCHANGÉ, AVEC EXTRACTION OPTIONNELLE) ------------------
@app.post("/api/upload")
def api_upload():
    """
    Upload fichier avec profil/catégorie (intègre extraction si extract=true).
    form-data: file (req), profile (opt), category (opt), extract (opt pour auto-extract).
    """
    file = request.files.get("file")
    profile = (request.form.get("profile") or "general").lower()
    category = (request.form.get("category") or "extraction").lower()
    do_extract = request.form.get("extract") == "true"
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
    result = {"success": True, "path": fpath, "mode": profile, "subdir": category}
    # Extraction auto si demandée
    if do_extract:
        try:
            extract_result = _documents_extract_internal(filename=fname, file_path=fpath)
            result["extracted_text"] = extract_result.get("text", "")
        except Exception as e:
            result["extract_error"] = str(e)
    return jsonify(result)

# ------------------ EXTRACTION OPÉRATIONNELLE (RÉELLE VIA SCRIPTS) ------------------
def api_documents_extract_internal(filename: str = None, file_path: str = None):
    """Interne pour extract (utilisé par upload si extract=true)."""
    if not file_path:
        file_path = os.path.join(INCOMING_PATH, secure_filename(filename))
    if not os.path.exists(file_path):
        return {"error": "fichier introuvable"}
    text = ""
    ext = os.path.splitext(os.path.basename(file_path))[1].lower()
    try:
        script_name = None
        if ext == '.pdf':
            script_name = 'extract_pdf.py'
        elif ext in ['.doc', '.docx']:
            script_name = 'extract_word.py'
        elif ext == '.txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        elif ext in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
            script_name = 'extract_image.py'  # OCR
        else:
            return {"error": f"Extension {ext} non supportée"}
        if script_name:
            script_path = os.path.join(CORE_EXTRACTION_PATH, script_name)
            if not os.path.exists(script_path):
                raise FileNotFoundError(f"Script {script_name} introuvable à {script_path}")
            # Appel subprocess réel sur script (PyMuPDF/OCR)
            result = subprocess.run(
                [sys.executable, script_path, file_path],
                capture_output=True,
                text=True,
                cwd=CORE_EXTRACTION_PATH,
                timeout=30
            )
            if result.returncode != 0:
                log_extraction(f"Erreur {script_name} pour {os.path.basename(file_path)}: {result.stderr}")
                raise RuntimeError(f"Script échoué: {result.stderr}")
            text = result.stdout.strip() or "Aucun texte extrait."
            log_extraction(f"Extraction OK {script_name} pour {os.path.basename(file_path)}: {len(text)} chars")
        return {"text": text}
    except subprocess.TimeoutExpired:
        log_extraction(f"Timeout {ext} pour {os.path.basename(file_path)}")
        return {"error": "Timeout extraction (fichier trop lourd ?)"}
    except Exception as e:
        error_msg = str(e)
        log_extraction(f"Exception extraction {ext} {os.path.basename(file_path)}: {error_msg}")
        return {"error": error_msg}

@app.post("/api/documents/extract")
def api_documents_extract():
    """
    Extraction indépendante : upload + extract + return text.
    form-data: file (req)
    """
    # 1) Récupère le fichier envoyé
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "file manquant"}), 400

    # 2) Sauvegarde temporaire
    tname = secure_filename(file.filename)
    tpath = os.path.join(INCOMING_PATH, tname)
    file.save(tpath)

    # 3) Extraction via script interne
    result = api_documents_extract_internal(filename=tname, file_path=tpath)

    # 4) Gestion des erreurs internes
    if "error" in result:
        return jsonify(result), 500

    # 5) Renvoi du texte extrait
    return jsonify(result)


# ------------------ DOCUMENTS (GENERATE / DOWNLOAD – INCHANGÉS) ------------------
@app.post("/api/documents/generate")
def api_documents_generate():
    """
    Génère .txt Q/R dans production/ du profil.
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
    # Cherche d’abord en production/, puis racine
    prod = os.path.join(folder, "production")
    if os.path.isfile(os.path.join(prod, filename)):
        return send_from_directory(prod, secure_filename(filename), as_attachment=True)
    if os.path.isfile(os.path.join(folder, filename)):
        return send_from_directory(folder, secure_filename(filename), as_attachment=True)
    return jsonify({"error": "fichier introuvable"}), 404

# ------------------ APIs IA (OLLAMA LOCAL RÉEL + PERPLEXITY FALLBACK) ------------------


import uuid

# ✅ Stocker les sessions avec leur contexte
SESSIONS = {}

@app.post("/api/ia")
def api_ia():
    data = request.get_json(force=True)
    prompt = data.get("prompt", "")
    model = data.get("model", "ollama:llama3")
    session_id = data.get("session_id")  # ✅ NOUVEAU
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if not prompt.strip():
        return jsonify({"error": "prompt vide"}), 400

    # ✅ Récupérer ou créer la session
    if session_id not in SESSIONS:
        SESSIONS[session_id] = {
            "context": [],
            "created": datetime.now().isoformat()
        }

    if request.headers.get('Accept') == 'text/event-stream':
        return stream_ollama_response(prompt, model, session_id)
    else:
        try:
            model_name = model.split(":")[-1]
            result = subprocess.run(
                ['ollama', 'run', model_name, prompt],
                capture_output=True,
                text=True,
                check=True,
                timeout=300
            )
            output = result.stdout.strip()
            
            # ✅ Sauvegarder dans le contexte de session
            SESSIONS[session_id]["context"].append({"role": "user", "text": prompt})
            SESSIONS[session_id]["context"].append({"role": "assistant", "text": output})
            
            return jsonify({
                "result": output,
                "session_id": session_id
            })
        except Exception as e:
            return jsonify({"error": f"Error: {str(e)}"}), 500


def stream_ollama_response(prompt: str, model: str, session_id: str):
    """Stream Ollama avec mémoire de session."""
    def generate():
        try:
            model_name = model.split(":")[-1]
            
            # ✅ RÉCUPÉRER TOUT LE CONTEXTE DE LA SESSION
            session = SESSIONS.get(session_id, {})
            context_history = session.get("context", [])
            
            # ✅ CONSTRUIRE LE PROMPT AVEC TOUT L'HISTORIQUE
            full_prompt = ""
            if context_history:
                for msg in context_history:
                    role = "Q" if msg["role"] == "user" else "A"
                    full_prompt += f"{role}: {msg['text']}\n"
            
            full_prompt += f"Q: {prompt}\nA:"
            
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": model_name,
                    "prompt": full_prompt,
                    "stream": True
                },
                stream=True,
                timeout=300
            )
            response.raise_for_status()
            
            full_response = ""
            for line in response.iter_lines():
                if line:
                    try:
                        chunk_json = json.loads(line)
                        text = chunk_json.get("response", "")
                        if text:
                            full_response += text
                            data = json.dumps({'result': text})
                            yield f"data: {data}\n\n"
                    except json.JSONDecodeError:
                        continue
            
            # ✅ SAUVEGARDER DANS LA SESSION
            if session_id in SESSIONS:
                SESSIONS[session_id]["context"].append({"role": "user", "text": prompt})
                SESSIONS[session_id]["context"].append({"role": "assistant", "text": full_response})
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
        }
    )


# ✅ Endpoint pour récupérer/créer une session
@app.get("/api/session")
def get_session():
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "context": [],
        "created": datetime.now().isoformat()
    }
    return jsonify({"session_id": session_id})


# ✅ Endpoint pour nettoyer les sessions (optionnel)
@app.delete("/api/session/<session_id>")
def delete_session(session_id):
    if session_id in SESSIONS:
        del SESSIONS[session_id]
        return jsonify({"status": "deleted"})
    return jsonify({"error": "Session not found"}), 404




    
   # ============ ROUTES MANQUANTES POUR FRONTEND ============

# 1. GET /api/documents - Liste tous les documents
@app.get("/api/documents")
def api_get_documents():
    """Liste tous les documents de tous les profils."""
    all_docs = []
    for prof in PROFILES:
        pdir = _profile_dir(prof)
        for cat in CATEGORIES:
            cdir = os.path.join(pdir, cat)
            if os.path.isdir(cdir):
                for fname in os.listdir(cdir):
                    fpath = os.path.join(cdir, fname)
                    if os.path.isfile(fpath):
                        all_docs.append({
                            "id": f"{prof}/{cat}/{fname}",
                            "name": fname,
                            "profile": prof,
                            "category": cat,
                            "size": os.path.getsize(fpath)
                        })
    return jsonify({"documents": all_docs})


# 2. POST /api/ask - Alias pour /api/ia
@app.post("/api/ask")
def api_ask():
    """Alias pour /api/ia pour compatibilité frontend."""
    data = request.get_json(silent=True) or {}
    question = data.get("question") or data.get("prompt")
    document_id = data.get("documentId")  # Optionnel
    
    # Réutiliser /api/ia
    if not question:
        return jsonify({"error": "question requise"}), 400
    
    # Appeler la logique d'IA existante
    data["prompt"] = question
    request_data = data
    return api_ia()


# 3. GET /api/documents/{id}/extract - Extraction par ID document
@app.get("/api/documents/<path:doc_id>/extract")
def api_get_extracted(doc_id):
    """Récupère le texte extrait d'un document déjà uploadé."""
    # Format doc_id attendu: "general/extraction/test.pdf"
    parts = doc_id.split("/")
    if len(parts) < 3:
        return jsonify({"error": "ID invalide (format: profile/category/filename)"}), 400
    
    prof, cat, fname = parts, parts, "/".join(parts[2:])
    fpath = os.path.join(_profile_dir(prof), cat, fname)
    
    if not os.path.isfile(fpath):
        return jsonify({"error": "Document introuvable"}), 404
    
    # Utiliser la fonction d'extraction existante
    result = api_documents_extract_internal(filename=fname, file_path=fpath)
    if "error" in result:
        return jsonify(result), 500
    
    return result


# 4. POST /api/export - Export conversation en PDF
@app.post("/api/export")
def api_export():
    """Export conversation en PDF."""
    data = request.get_json(silent=True) or {}
    chat = data.get("chat", [])  # Liste de messages
    document_id = data.get("documentId")
    
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        import io
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        y = 800
        
        # Titre
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, "Export Conversation Themis")
        y -= 40
        
        # Messages
        c.setFont("Helvetica", 10)
        for msg in chat:
            role = msg.get("role", "user")
            content = msg.get("content", "")[:80]  # Limité à 80 chars
            c.drawString(50, y, f"{role.upper()}: {content}")
            y -= 20
            if y < 50:
                c.showPage()
                y = 800
        
        c.save()
        buffer.seek(0)
        
        return buffer.getvalue(), 200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=export.pdf"
        }
    
    except ImportError:
        return jsonify({
            "error": "reportlab non installé. Exécute: pip install reportlab"
        }), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 5. DELETE /api/documents/{id} - Suppression par ID
@app.delete("/api/documents/<path:doc_id>")
def api_delete_document(doc_id):
    """Supprime un document par son ID (path complet)."""
    parts = doc_id.split("/")
    if len(parts) < 3:
        return jsonify({"error": "ID invalide"}), 400
    
    prof, cat, fname = parts, parts, "/".join(parts[2:])
    fpath = os.path.join(_profile_dir(prof), cat, fname)
    
    if not os.path.isfile(fpath):
        return jsonify({"error": "Document introuvable"}), 404
    
    try:
        os.remove(fpath)
        return jsonify({"success": True, "deleted": doc_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
 

# ------------------ MAIN ------------------
if __name__ == "__main__":
    # Port depuis file.env (BACKEND_PORT=5000 ou PERPLEXICA_PORT=3001)
    port = int(os.getenv('BACKEND_PORT', os.getenv('PERPLEXICA_PORT', 5000)))
    print(f"=== Themis Backend Réel ===")
    print(f"Port: {port} | Ollama: {OLLAMA_PORT} | Perplexity clé: {'Chargée' if os.getenv('PERPLEXITY_API_KEY') else 'Manquante'}")
    print(f"Dossiers: Docs={DOCS_PATH} | Extraction={CORE_EXTRACTION_PATH}")
    app.run(host="0.0.0.0", port=port, debug=True)







