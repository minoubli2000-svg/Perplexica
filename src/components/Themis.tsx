'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FaBalanceScale, FaTimes,FaPrint, FaMinus, FaWindowMaximize, FaCopy, FaMoon, FaSun,
  FaRegFilePdf, FaFileExport, FaPlus, FaRegFolderOpen, FaTrashAlt, FaWifi, FaBan, FaUpload
} from 'react-icons/fa';
import WindowControls from './WindowControls';


// ===== CONFIGURATIONS =====



const ENGINES = [
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'perplexica', label: 'Perplexica' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'gpt', label: 'GPT' },
];

const MODEL_OPTIONS = {
  perplexity: [
    { value: 'sonar', label: 'Sonar' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { value: 'claude-sonnet-4-5-pensee', label: 'Claude Sonnet 4.5 Pensée' },
    { value: 'claude-opus-4-1-reflexion', label: 'Réflexion Claude Opus 4.1' },
    { value: 'gemini-2-5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gpt-5', label: 'GPT-5' },
  ],
  perplexica: [
    { value: 'default', label: 'Default' },
    { value: 'llama3', label: 'Llama 3' },
  ],
  ollama: [
    { value: 'llama3', label: 'Llama 3' },
    { value: 'mistral', label: 'Mistral' },
  ],
  gpt: [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

const ROLES = [
  { value: 'general', label: 'Général' },
  { value: 'doctorant', label: 'Doctorant' },
  { value: 'rapporteur', label: 'Rapporteur' },
];

// ===== Utilitaires modèle =====
const toBackendModel = (engine, modelValue) => {
  switch (engine) {
    case 'perplexity':
      return `perplexity:${modelValue || 'sonar'}`;
    case 'perplexica':
      return `perplexica:${modelValue || 'default'}`;
    case 'ollama':
      return `ollama:${modelValue || 'llama3'}`;
    case 'gpt':
      return `perplexity:${modelValue || 'sonar'}`;
    default:
      return '';
  }
};

const modelFamily = (modelString) => {
  if (!modelString) return 'general';
  const fam = modelString.split(':')[0];
  return fam || 'general';
};

// ===== SERVICES API =====
const API_BASE = 'http://localhost:3001';

const askIA = async (prompt, model) => {
  const res = await fetch(`${API_BASE}/api/ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });
  let j; try { j = await res.json(); } catch { j = {}; }
  if (!res.ok) throw new Error(j.error || res.statusText || 'Erreur IA');
  if (!j.result || !String(j.result).trim()) throw new Error('Réponse IA vide');
  return j;
};

const generateDoc = async (question, answer, model) => {
  const res = await fetch(`${API_BASE}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, response: answer, model }),
  });
  let j; try { j = await res.json(); } catch { j = {}; }
  if (!res.ok || !j.success) throw new Error(j.error || 'Erreur export');
  if (!j.filename) throw new Error('Nom de fichier manquant');
  return j;
};

const downloadDoc = (filename, model) => {
  const url = new URL(`${API_BASE}/api/documents/download`);
  url.searchParams.set('filename', filename);
  if (model) url.searchParams.set('model', model);
  window.open(url.toString(), '_blank');
};

const libraryApi = {
  // Récupère la structure des dossiers et fichiers de la bibliothèque documentaire
  async getStructure() {
    const res = await fetch(`${API_BASE}/api/library/structure`);
    let j;
    try { j = await res.json(); } catch { j = {}; }
    if (!res.ok || j.error)
      throw new Error(j.error || "Erreur récupération structure");
    return j;
  },

  // Extraction OCR/texte depuis un fichier (PDF/image)
  async extractFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/api/documents/extract`, {
      method: "POST",
      body: formData
    });
    let j;
    try { j = await res.json(); } catch { j = {}; }
    if (!res.ok || j.error)
      throw new Error(j.error || "Erreur extraction");
    return j; // j.text contient le texte extrait !
  },

  // Suppression d’un fichier documentaire
  async deleteFile(filename, model, subdir = null) {
    const payload = { filename, model, subdir };
    const res = await fetch(`${API_BASE}/api/library/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let j;
    try { j = await res.json(); } catch { j = {}; }
    if (!res.ok || j.error)
      throw new Error(j.error || "Erreur suppression");
    return j;
  },

  // Renommage d’un fichier documentaire
  async renameFile(oldName, newName, model, subdir = null) {
    const payload = { oldName, newName, model, subdir };
    const res = await fetch(`${API_BASE}/api/library/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    let j;
    try { j = await res.json(); } catch { j = {}; }
    if (!res.ok || j.error)
      throw new Error(j.error || "Renommage indisponible");
    return j;
  },

  // Upload d’un fichier documentaire
  async uploadFile(file, model, subdir) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("profile", model);
    formData.append("category", subdir || "extraction");
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      body: formData
    });
    let j;
    try { j = await res.json(); } catch { j = {}; }
    if (!res.ok || j.error)
      throw new Error(j.error || "Erreur upload");
    return j;
  }
};




// ===== UI Utils =====
const Spinner = () => (
  <span className="inline-block w-5 h-5 border-2 border-blue-500 border-r-transparent rounded-full animate-spin align-middle ml-2" />
);

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div
      onClick={onClose}
      className={`fixed top-6 right-8 z-50 flex items-center gap-3 font-medium px-5 py-3 min-w-[220px]
        rounded-xl shadow-2xl ring-2 ring-blue-600 transition-transform cursor-pointer
        ${type === 'error' ? 'bg-red-500' : 'bg-green-600'} text-white hover:scale-105 active:scale-95`}
    >
      {type === 'error' ? '❌' : '✅'} {message}
    </div>
  );
};

const ProgressBar = ({ stage }) => {
  if (!stage) return null;
  let percent = 0;
  if (stage.includes('Extraction en cours')) percent = 20;
  else if (stage.includes('Interrogation IA')) percent = 70;
  else if (stage.includes('terminée') || stage.includes('Réponse')) percent = 100;
  return (
    <div className="w-full mb-4">
      <div className="flex items-center gap-2">
        <progress value={percent} max="100" className="w-[95%] h-3 rounded-full [&::-webkit-progress-bar]:bg-gray-200 [&::-webkit-progress-value]:bg-blue-500" />
        <span className="min-w-[38px] text-blue-400 font-bold text-sm">{percent}%</span>
      </div>
      <div className="text-blue-400 font-bold text-base mt-2 flex items-center gap-2 min-h-[28px]">
        {stage}
        {stage.includes('cours') && <Spinner />}
      </div>
    </div>
  );
};

const ThemisButton = ({ children, icon, variant = 'primary', size = 'md', disabled = false, loading = false, className = '', ...props }) => {
  const sizes = { xs: 'px-2 py-1 text-xs', sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-base', lg: 'px-5 py-3 text-lg' };
  const variants = {
    primary: 'bg-blue-700 hover:bg-blue-800 text-white',
    secondary: 'bg-blue-500 hover:bg-blue-600 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    dark: 'bg-gray-800 hover:bg-gray-900 text-gray-100',
    outline: 'border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white',
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 rounded-lg font-semibold border-0 shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      type={props.type || 'button'}
    >
      {loading ? <Spinner /> : icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

// ===== Bibliothèque =====
const LibrarySidebar = ({ onStructureChange }) => {
  const [structure, setStructure] = useState(null);
  const [selectedModel, setSelectedModel] = useState('general');
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadModel, setUploadModel] = useState('general');
  const [uploadSubdir, setUploadSubdir] = useState('');
  const fileInputRef = useRef(null);

  const loadStructure = async () => {
    try {
      setLoading(true);
      const data = await libraryApi.getStructure();
      const struct = data?.structure || data;
      if (struct) {
        setStructure(struct);
        onStructureChange?.(struct);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStructure(); }, []);

  const handleUpload = async () => {
    if (!uploadFile) return;
    try {
      setLoading(true);
      await libraryApi.uploadFile(uploadFile, uploadModel, uploadSubdir || null);
      setUploadFile(null);
      setUploadSubdir('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadStructure();
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  



  const handleDelete = async (filename, model, subdir = null) => {
    if (!confirm(`Supprimer ${filename} ?`)) return;
    try {
      setLoading(true);
      await libraryApi.deleteFile(filename, model, subdir);
      await loadStructure();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (filename, model, subdir = null) => {
    const next = prompt('Nouveau nom de fichier (avec extension):', filename);
    if (!next || next === filename) return;
    try {
      setLoading(true);
      await libraryApi.renameFile(filename, next, model, subdir || null);
      await loadStructure();
    } catch (err) {
      console.error('Renommage indisponible:', err);
      alert('Renommage indisponible côté serveur. Ajouter /api/library/rename ou renommer manuellement.');
    } finally {
      setLoading(false);
    }
  };

  const renderModelTree = (modelName, modelData) => {
    const folders = typeof modelData === 'object' && !Array.isArray(modelData)
      ? modelData
      : { '': (modelData?.files || modelData || []) };


    return Object.entries(folders).map(([subdir, files]) => (
      <div key={subdir} className="border-l-2 border-blue-200 dark:border-blue-600 pl-3">
        <div className="font-medium text-sm text-blue-600 dark:text-blue-400 mb-1">📂 {subdir || 'Racine'}</div>
        <div className="space-y-1">
          {Array.isArray(files) && files.length > 0 ? (
            files.map(file => {
              const name = file?.name || file;
              const size = file?.size;
              return (
                <div key={name} className="flex justify-between items-center py-1 px-2 bg-white dark:bg-gray-600 rounded text-xs">
                  <span className="flex items-center gap-1">
                    <FaRegFilePdf className="text-red-500" />
                    <span className="text-gray-800 dark:text-gray-200">{name}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {size != null && <span className="text-gray-500">{Math.round(size / 1024)} KB</span>}
                    <button onClick={() => handleRename(name, modelName, subdir || null)} className="text-blue-500 hover:text-blue-700" title="Renommer">✏️</button>
                    <button onClick={() => handleDelete(name, modelName, subdir || null)} className="text-red-500 hover:text-red-700" title="Supprimer">
                      <FaTrashAlt size={10} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 italic text-xs px-2">Vide</div>
          )}
        </div>
      </div>
    ));
  };

  if (loading && !structure) {
    return (
      <div className="flex flex-col h-full p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-blue-200 dark:border-gray-700">
        <div className="p-4 text-blue-600 flex items-center gap-2">
          <Spinner /> Chargement de la bibliothèque...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-r border-blue-200 dark:border-gray-700">
      <h3 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4 flex items-center gap-2">
        <FaRegFolderOpen /> Bibliothèque Documentaire
      </h3>

      {/* Upload Section */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="space-y-2">
          <select value={uploadModel} onChange={(e) => setUploadModel(e.target.value)} className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200">
            <option value="general">Général</option>
            <option value="doctorant">Doctorant</option>
            <option value="rapporteur">Rapporteur</option>
          </select>
          <select value={uploadSubdir} onChange={(e) => setUploadSubdir(e.target.value)} className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200">
            <option value="">Choisir dossier...</option>
            <option value="extraction">Extraction</option>
            <option value="questions_reponses">Questions/Réponses</option>
            <option value="reponse_seule">Réponse seule</option>
            <option value="production">Production</option>
          </select>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.json" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="w-full text-xs" />
          <ThemisButton onClick={handleUpload} disabled={!uploadFile || !uploadSubdir} loading={loading} size="sm" variant="primary" icon={<FaUpload />} className="w-full">
            Ajouter
          </ThemisButton>
        </div>
      </div>

      {/* Structure */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {structure && Object.entries(structure).map(([modelName, modelData]) => (
          <div key={modelName} className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h4
                className={`font-semibold cursor-pointer flex items-center gap-2 ${selectedModel === modelName ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setSelectedModel(selectedModel === modelName ? '' : modelName)}
              >
                📁 {modelName.toUpperCase()}
              </h4>
            </div>
            {selectedModel === modelName && (
              <div className="ml-2 space-y-2">
                {renderModelTree(modelName, modelData)}
              </div>
            )}
          </div>
        ))}
      </div>

      <ThemisButton onClick={loadStructure} loading={loading} size="sm" variant="outline" className="mt-3">
        🔄 Actualiser
      </ThemisButton>
    </div>
  );
}

// ===== Composant principal =====
export default function Themis() {
  const [showLibrary, setShowLibrary] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [libraryStructure, setLibraryStructure] = useState(null);

  const [role, setRole] = useState('general');
  const [onlineMode, setOnlineMode] = useState('en_ligne');
  const [engine, setEngine] = useState('perplexity');
  const [models, setModels] = useState({
    perplexity: MODEL_OPTIONS.perplexity[0].value,
    perplexica: MODEL_OPTIONS.perplexica[0].value,
    ollama: MODEL_OPTIONS.ollama[0].value,
    gpt: MODEL_OPTIONS.gpt[0].value,
  });

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [history, setHistory] = useState([]);

  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedQ, setImportedQ] = useState('');
  const [importedA, setImportedA] = useState('');
  const [loadingExport, setLoadingExport] = useState(false);

  const fileExtractInputRef = useRef(null);

  const activeModelValue = models[engine];
  const model = toBackendModel(engine, activeModelValue);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  useEffect(() => { if (role === 'general') setOnlineMode('en_ligne'); }, [role]);
  useEffect(() => {
    const availableEngines = { en_ligne: ['perplexity', 'gpt'], hors_ligne: ['ollama', 'perplexica'] };
    if (!availableEngines[onlineMode].includes(engine)) setEngine(availableEngines[onlineMode][0]);
  }, [onlineMode, engine]);

  useEffect(() => { try { localStorage.setItem('themis-history', JSON.stringify(history)); } catch {} }, [history]);
  useEffect(() => { try { const saved = localStorage.getItem('themis-history'); if (saved) setHistory(JSON.parse(saved)); } catch {} }, []);
  useEffect(() => {
    const handleKeyDown = (e) => { if ((e.key === 'Enter' && (e.ctrlKey || e.metaKey)) && question.trim()) handleAskAI(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleClear = () => { setQuestion(''); setAnswer(''); setExtractedText(''); setStage(''); setError(''); };

  const handleAskAI = async () => {
    if (!question.trim()) return;
    setStage('Interrogation IA en cours...');
    setError(''); setAnswer('');
    try {
      const res = await askIA(question, model);
      if (!res.result) throw new Error('Aucune réponse reçue');
      setAnswer(res.result);
      setStage('Réponse reçue');
      setHistory(prev => [{ question, answer: res.result, model }, ...prev].slice(0, 15));
      showToast('Réponse IA reçue');
    } catch (err) {
      setError(`Erreur IA: ${err.message}`);
      setStage('');
      showToast(`Erreur IA: ${err.message}`, 'error');
    }
  };

  const handleImportQR = () => {
    if (!importedQ.trim() || !importedA.trim()) return showToast('Veuillez remplir les deux champs', 'error');
    setHistory(prev => [{ question: importedQ, answer: importedA, model }, ...prev].slice(0, 15));
    setShowImportModal(false); setImportedQ(''); setImportedA(''); showToast('Q/R importée avec succès');
  };

  const handleWordExport = async () => {
    if (!question.trim() || !answer.trim()) return;
    setLoadingExport(true);
    try {
      const { filename } = await generateDoc(question, answer, model);
      showToast('Document Word généré');
      downloadDoc(filename, model);
    } catch (err) {
      showToast(`Erreur export: ${err.message}`, 'error');
    } finally {
      setLoadingExport(false);
    }
  };

  const handleCopyAnswer = async () => { if (!answer) return; try { await navigator.clipboard.writeText(answer); } catch {} };

  const handleEngineChange = (next) => {
    setEngine(next);
    if (!models[next]) setModels(prev => ({ ...prev, [next]: (MODEL_OPTIONS[next]?.[0]?.value || '') }));
  };

  const safeJson = async res => {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
  return await res.json();
  } else {
    const textErr = await res.text();
    throw new Error(textErr);
  }
};

 
const handlePrintAnswer = () => {
  if (!answer) return;
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html><head><title>Réponse Themis</title></head><body><pre>${answer}</pre></body></html>
  `);
  printWin.document.close();
  printWin.print();
};
 




  const handleFileExtract = async (file) => {
    if (!file) return;
      try {
    showToast("Extraction du texte en cours...");
    const formData = new FormData();
    formData.append('file', file);

    // Appel direct à l'API extraction (évite upload séparé)
    const res = await fetch('http://localhost:3001/api/documents/extract', {
      method: 'POST',
      body: formData,
    });
    const extractJson = await safeJson(res);

    if (res.ok && extractJson.text) {
      setExtractedText(extractJson.text);
      showToast("Texte extrait avec succès !");
    } else {
      showToast("Erreur extraction : " + (extractJson.error || "Inconnue"), "error");
    }
  } catch (e) {
    showToast("Erreur technique : " + e.message, "error");
  } finally {
    if (fileExtractInputRef.current) fileExtractInputRef.current.value = "";
  }
};




return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar bibliothèque */}
      {showLibrary && (
        <aside className="flex-shrink-0 w-[340px] max-w-[380px] min-w-[260px] border-r border-blue-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <LibrarySidebar onStructureChange={setLibraryStructure} />
        </aside>
      )}

      {/* Contenu principal */}
<main className="flex-1 flex flex-col items-stretch">
  {/* Toolbar */}
  <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-blue-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80">
    {/* Titre Themis avec balance blanche et bordure rouge */}
    <div className="flex items-center gap-2 px-3 py-1 rounded bg-transparent">
      <FaBalanceScale className="themis-balance" />
      <span className="themis-title">Themis</span>
    </div>

    {/* Profil */}
    <div>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mr-2">Profil:</label>
      <select value={role} onChange={e => setRole(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
      </select>
    </div>

    {/* Mode IA */}
    <div>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mr-2">Mode:</label>
      <ThemisButton size="xs" variant={onlineMode === 'en_ligne' ? 'success' : 'outline'} disabled={role==='general'} onClick={()=>setOnlineMode('en_ligne')} className="mr-1">
        En ligne <FaWifi />
      </ThemisButton>
      <ThemisButton size="xs" variant={onlineMode === 'hors_ligne'? 'success':'outline'} disabled={role==='general'} onClick={()=>setOnlineMode('hors_ligne')}>
        Hors ligne <FaBan />
      </ThemisButton>
    </div>

    {/* Moteur */}
    <div>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mr-2">Moteur:</label>
      <select value={engine} onChange={e=>handleEngineChange(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        {ENGINES.filter(e=> onlineMode==='en_ligne'? ['perplexity','gpt'].includes(e.value) : ['ollama','perplexica'].includes(e.value))
          .map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>

    {/* Modèle */}
    <div>
      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mr-2">Modèle:</label>
      <select value={models[engine]} onChange={e=>setModels(p=>({...p,[engine]:e.target.value}))} className="px-2 py-1 rounded border bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200">
        {(MODEL_OPTIONS[engine]||[]).map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>

    {/* Thème */}
    <ThemisButton size="xs" variant="outline" icon={theme==='dark'? <FaSun/>:<FaMoon/>} onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="ml-auto" title="Changer le thème">
      {theme==='dark'?'Clair':'Sombre'}
    </ThemisButton>
  </div>

  {/* Progression */}
  <div className="px-6 pt-4"><ProgressBar stage={stage}/></div>

  {/* Question + actions */}
  <div className="flex flex-col gap-3 px-6 py-4">
    <textarea
      value={question}
      onChange={e=>setQuestion(e.target.value)}
      rows={3}
      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
      placeholder="Posez votre question à l'IA..."
    />
    <div className="flex flex-wrap gap-2 items-center">
      <ThemisButton onClick={handleAskAI} disabled={!question.trim()} variant="primary" icon={<FaBalanceScale/>}>
        Poser la question
      </ThemisButton>
      <ThemisButton onClick={handleClear} variant="outline" icon={<FaTrashAlt/>}>
        Effacer
      </ThemisButton>
      {/* Tous les autres boutons Export/Copy/Import/Extract sont supprimés d'ici */}
    </div>
  </div>

  {/* Erreurs */}
  {error && (
    <div className="mx-6 mb-2 p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-lg">
      <strong>Erreur:</strong> {error}
    </div>
  )}

  {/* Texte Extrait */}
  {extractedText && (
    <div className="mx-6 mb-2 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-lg">
      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Texte extrait:</h4>
      <pre className="whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-200 max-h-32 overflow-y-auto bg-white dark:bg-gray-800 p-2 rounded">
        {extractedText}
      </pre>
      <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded shadow" onClick={()=>setQuestion(extractedText)} title="Envoyer ce texte à l’IA">
        Injecter dans l’IA
      </button>
    </div>
  )}

  {/* Réponse IA */}
  {answer && (
    <div className="relative mx-6 mb-2 p-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 rounded-lg">
      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Réponse:</h4>
      <pre className="whitespace-pre-wrap text-sm text-green-800 dark:text-green-200 max-h-64 overflow-y-auto">
        {answer}
      </pre>
      <ThemisButton icon={<FaCopy/>} onClick={handleCopyAnswer} size="sm" variant="outline" className="absolute top-2 right-2" title="Copier la réponse"/>
    </div>
  )}

  {/* Historique */}
  {history.length>0 && (
    <div className="mx-6 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Historique des conversations:</h4>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.slice(0,3).map(({question:q,answer:a},idx)=>(
          <div key={idx} className="p-3 bg-white dark:bg-gray-700 rounded border-l-2 border-gray-300 dark:border-gray-600">
            <div className="text-sm"><strong className="text-blue-600 dark:text-blue-400">Q:</strong> {q}</div>
            <div className="text-sm mt-1"><strong className="text-green-600 dark:text-green-400">R:</strong> {(a||'').substring(0,100)}...</div>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* Toast */}
  <Toast message={toast.message} type={toast.type} onClose={()=>setToast({message:'',type:'success'})}/>

  {/* Modal Import Q/R */}
  {showImportModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 min-w-[400px] max-w-[600px] border border-gray-200 dark:border-gray-700 shadow-2xl">
        <h4 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Importer une Question/Réponse</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Question:</label>
            <textarea value={importedQ} onChange={e=>setImportedQ(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Saisissez votre question..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Réponse:</label>
            <textarea value={importedA} onChange={e=>setImportedA(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500" rows={4} placeholder="Saisissez la réponse..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <ThemisButton onClick={()=>setShowImportModal(false)} variant="outline">Annuler</ThemisButton>
          <ThemisButton onClick={handleImportQR} variant="success" disabled={!importedQ.trim()||!importedA.trim()}>Importer</ThemisButton>
        </div>
      </div>
    </div>
  )}
</main>


  {/* Sidebar droite */}
<aside className="flex flex-col flex-1 max-w-[270px] min-w-[200px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-l border-blue-200 dark:border-gray-700 py-6 px-4 space-y-4">
  <ThemisButton className="w-full" icon={<FaRegFolderOpen />} onClick={() => setShowLibrary(!showLibrary)} variant="dark">
    {showLibrary ? 'Masquer' : 'Afficher'} Bibliothèque
  </ThemisButton>
  <h3 className="text-lg font-bold text-center text-blue-700 dark:text-blue-300">Configuration IA</h3>
  <div className="pt-4 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 space-y-1">
    <div>Engine: <strong>{engine}</strong></div>
    <div>Model: <strong>{models[engine]}</strong></div>
    <div>Role: <strong>{role}</strong></div>
    <div>Historique: <strong>{history.length}</strong> entrées</div>
  </div>

  {/* Éléments déplacés + Imprimer */}
  <div className="space-y-3">
    <ThemisButton
      onClick={handleWordExport}
      disabled={loadingExport || !question.trim() || !answer.trim()}
      variant="success"
      icon={<FaFileExport />}
      className="w-full"
    >
      Exporter Word
    </ThemisButton>
    <ThemisButton
      onClick={handleCopyAnswer}
      disabled={!answer.trim()}
      variant="primary"
      icon={<FaCopy />}
      className="w-full"
    >
      Copier
    </ThemisButton>
    <ThemisButton
      onClick={handlePrintAnswer}
      disabled={!answer.trim()}
      variant="dark"
      icon={<FaPrint />}
      className="w-full"
    >
      Imprimer
    </ThemisButton>
    <ThemisButton
      onClick={() => setShowImportModal(true)}
      variant="secondary"
      icon={<FaUpload />}
      className="w-full"
    >
      Import Q/R
    </ThemisButton>
    <label className="w-full block">
      <ThemisButton as="span" variant="outline" icon={<FaRegFilePdf />} className="w-full">
        Extraire fichier
      </ThemisButton>
      <input
        ref={fileExtractInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={e => handleFileExtract(e.target.files?.[0] || null)}
        className="hidden"
      />
    </label>
  </div>
</aside>
</div>
);
} 