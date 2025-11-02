'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FaBalanceScale,FaExpand,FaFileWord,FaSync,FaCompress,FaBrain,FaFilePdf, FaSyncAlt, FaTimes, FaPrint, FaMinus, FaWindowMaximize, FaCopy, FaMoon, FaSun,
  FaRegFilePdf, FaFileExport, FaPlus, FaRegFolderOpen,FaFolderOpen, FaTrashAlt, FaWifi, FaBan, FaUpload,
  FaRobot, // Remplace FaBrain pour l'IA (icône robot)
  FaCog, // Pour config si besoin
} from 'react-icons/fa';
import WindowControls from './WindowControls';
import DraggableModal from './DraggableModal'; // Import pour les modals flottants (basé sur tes fichiers)
import { extractTextAndPreview } from '../services/tesseract'






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
const toBackendModel = (engine: string, modelValue: string): string => {
  switch (engine) {
    case 'perplexity':
      return `perplexity:${modelValue || 'sonar'}`;
    case 'perplexica':
      return `perplexica:${modelValue || 'default'}`;
    case 'ollama':
      return `ollama:${modelValue || 'llama3'}`;
    case 'gpt':
      return `gpt:${modelValue || 'gpt-3.5-turbo'}`;
    default:
      return '';
  }
};

const modelFamily = (modelString: string): string => {
  if (!modelString) return 'general';
  const fam = modelString.split(':')[0];
  return fam || 'general';
};





// ===== SERVICES API =====
const API_BASE = 'http://localhost:3001';

const askIA = async (prompt: string, model: string, onChunk: (chunk: { done: boolean; text: string }) => void) => {
  const res = await fetch(`${API_BASE}/api/ia`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream' // Demander le streaming
    },
    body: JSON.stringify({ prompt, model }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || res.statusText || 'Erreur IA');
  }

  // Vérifier si c'est du SSE (streaming)
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Pas de body stream disponible');

    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onChunk?.({ done: true, text: fullResponse });
              break;
            }
            try {
              const json = JSON.parse(data);
              if (json.result) {
                fullResponse += json.result;
                onChunk?.({ done: false, text: json.result });
              }
            } catch (e) {
              // Ignore les lignes non-JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { result: fullResponse };
  } else {
    // Fallback : réponse JSON classique
    const json = await res.json();
    if (!json.result || !String(json.result).trim()) {
      throw new Error('Réponse IA vide');
    }
    onChunk?.({ done: true, text: json.result });
    return json;
  }
};

// ===== Handler IA avec streaming =====
const handleAskAI = async () => {
  if (!question.trim()) {
    setError('Veuillez entrer une question');
    return;
  }

  setLoading(true);
  setError('');
  let streamedResponse = '';

  try {
    const currentModel = models[engine];
    const model = toBackendModel(engine, currentModel);

    // ✅ AJOUTER TOUT L'HISTORIQUE DE MESSAGES (contexte chat)
    const fullMessages = [
      ...messages,
      { role: 'user', text: question }
    ];

    // Ajouter le message utilisateur au chat
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    
    // Ajouter un placeholder pour la réponse IA
    setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

    // ✅ ENVOYER LES MESSAGES AVEC LE CONTEXTE
    const res = await fetch(`${API_BASE}/api/ia`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ 
        prompt: question,
        model,
        messages: fullMessages  // ✅ NOUVEAU : Passer tous les messages
      }),
    });

    if (!res.ok) throw new Error('Erreur serveur');

    const reader = res.body?.getReader();
    if (!reader) throw new Error('Pas de stream');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') break;
          
          try {
            const json = JSON.parse(dataStr);
            if (json.result) {
              streamedResponse += json.result;
              
              // Mettre à jour en temps réel
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  text: streamedResponse
                };
                return updated;
              });
            }
          } catch (e) {
            continue;
          }
        }
      }
    }

    reader.releaseLock();
    setQuestion('');
    setLoading(false);

    // ✅ Sauvegarder dans l'historique
    setHistory(prev => [
      ...prev,
      {
        question,
        messages: [
          ...messages,
          { role: 'user', text: question },
          { role: 'assistant', text: streamedResponse }
        ],
        model,
        timestamp: new Date().toISOString()
      }
    ].slice(0, 15));

  } catch (err) {
    setError((err as Error).message);
    setLoading(false);
  }
};







const generateDoc = async (question, responseString, model) => {
  const res = await fetch(`${API_BASE}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, response: responseString, model }),
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
    const res = await fetch(`'http://localhost:3001/api/documents/extract'`, {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [isExtracting, setIsExtracting] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [libraryStructure, setLibraryStructure] = useState(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  
  const fileExtractInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  

  const [role, setRole] = useState('general');
  const [onlineMode, setOnlineMode] = useState('en_ligne');
  const [engine, setEngine] = useState('perplexity');
  const [models, setModels] = useState({
    perplexity: MODEL_OPTIONS.perplexity[0].value,
    perplexica: MODEL_OPTIONS.perplexica[0].value,
    ollama: MODEL_OPTIONS.ollama[0].value,
    gpt: MODEL_OPTIONS.gpt[0].value,
  });

  
  const [messages, setMessages] = useState(() => {
  const saved = localStorage.getItem('themis_chat');
  return saved ? JSON.parse(saved) : [];
  });

  const [question, setQuestion] = useState('');


  const [extractedText, setExtractedText] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
 
 
 const handleExtract = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setIsExtracting(true);
  setError('');
  setExtractedText('');
  setPreviewUrl('');

  try {
    let text = '';
    let previewUrl = '';
    if (file.type.startsWith('image/')) {
      // OCR direct navigateur pour les images
      const result = await extractTextAndPreview(file);
      text = result.text;
      previewUrl = result.previewUrl;
    } else if (file.type === 'application/pdf') {
      // OCR serveur pour les PDF
      const formData = new FormData();
      formData.append('file', file);
      previewUrl = URL.createObjectURL(file);
      const response = await fetch('http://localhost:3001/api/documents/extract', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      text = result.text || '';
    } else {
      setError("Type de fichier non supporté (utilisez image ou PDF).");
      return;
    }

    setExtractedText(text);
    setPreviewUrl(previewUrl);
    if (!text || !text.trim()) setError("Aucun texte détecté.");
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setIsExtracting(false);
  }
};



 







  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedQ, setImportedQ] = useState('');
  const [importedA, setImportedA] = useState('');
  const [loadingExport, setLoadingExport] = useState(false);

 

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

  const handleClear = () => {
  setQuestion('');
  setMessages([]); // ← ici ! toujours tableau vide pour clear le chat
  setExtractedText('');
  setStage('');
  setError('');
};
  
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/session`);
        const data = await res.json();
        setSessionId(data.session_id);
        console.log('Session créée:', data.session_id);
      } catch (err) {
        console.error('Erreur création session:', err);
      }
    };
    
    initSession();
  }, []);  // ← S'exécute une fois au montage

    
   

  
  const handleAskAI = async () => {
    if (!question.trim()) {
      setError('Veuillez entrer une question');
      return;
    }

    if (!sessionId) {
      setError('Création de session en cours...');
      return;
    }

    setLoading(true);
    setError('');
    let streamedResponse = '';

    try {
      const currentModel = models[engine];
      const model = toBackendModel(engine, currentModel);

      // Ajouter le message utilisateur au chat
      setMessages(prev => [...prev, { role: 'user', text: question }]);
      
      // Ajouter un placeholder pour la réponse IA
      setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

      // ✅ ENVOYER LA SESSION_ID
      const res = await fetch(`${API_BASE}/api/ia`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          prompt: question,
          model,
          session_id: sessionId  // ✅ CRUCIAL
        }),
      });

      if (!res.ok) throw new Error('Erreur serveur');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Pas de stream');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            
            try {
              const json = JSON.parse(dataStr);
              if (json.result) {
                streamedResponse += json.result;
                
                // Mettre à jour en temps réel
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    text: streamedResponse
                  };
                  return updated;
                });
              }
            } catch (e) {
              continue;
            }
          }
        }
      }

      reader.releaseLock();
      setQuestion('');
      setLoading(false);

    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      if (sessionId) {
        await fetch(`${API_BASE}/api/session/${sessionId}`, { method: 'DELETE' });
      }
      const res = await fetch(`${API_BASE}/api/session`);
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([]);
      setQuestion('');
      setError('');
      console.log('Nouvelle session créée');
    } catch (err) {
      console.error('Erreur création session:', err);
    }
  };

 
  const handleImportQR = async () => {
  if (!importedQ.trim() || !importedA.trim())
    return showToast('Veuillez remplir les deux champs', 'error');

  try {
    // ✅ AJOUTER LA Q/R AUX MESSAGES DE CHAT
    setMessages(prev => [
      ...prev,
      { role: 'user', text: importedQ },
      { role: 'assistant', text: importedA }
    ]);

    // ✅ SAUVEGARDER DANS L'HISTORIQUE
    setHistory(prev => [
      {
        question: importedQ,
        messages: [
          { role: 'user', text: importedQ },
          { role: 'assistant', text: importedA }
        ],
        model: `${engine}:${models[engine]}`, // ← CHANGÉ
        timestamp: new Date().toISOString()
      },
      ...prev
    ].slice(0, 15));

    // ✅ AJOUTER À LA SESSION CÔTÉ SERVEUR POUR LE CONTEXTE
    if (sessionId) {
      try {
        await fetch(`${API_BASE}/api/session/add-context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            messages: [
              { role: 'user', text: importedQ },
              { role: 'assistant', text: importedA }
            ]
          })
        }).catch(err => console.warn('Sync session échoué:', err));
      } catch (err) {
        console.warn('Erreur sync session:', err);
      }
    }

    setShowImportModal(false);
    setImportedQ('');
    setImportedA('');
    showToast('Q/R importée avec succès et ajoutée au contexte');
  } catch (err) {
    showToast('Erreur import Q/R', 'error');
    console.error(err);
  }
};




  
  const handleCopyAnswer = async () => {
  // Cherche le dernier message du role assistant (IA)
  const lastAssistantMsg =
    messages.slice().reverse().find(m => m.role === 'assistant')?.text || '';
  if (!lastAssistantMsg) return;
  try {
    await navigator.clipboard.writeText(lastAssistantMsg);
  } catch {}
};


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


const handleCopyToLibrary = () => {
  if (!extractedText) return;
  // 1) Appel à votre API pour copier dans la bibliothèque
  fetch('http://localhost:3001/api/library/upload', {
    method: 'POST',
    body: JSON.stringify({ text: extractedText }),
    headers: { 'Content-Type': 'application/json' }
  })
    .then(res => {
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      return res.json();
    })
    .then(() => alert('Copié dans la bibliothèque !'))
    .catch(err => alert(err.message));
};


 
const handlePrintAnswer = () => {
  if (!messages || messages.length === 0) return;
  const printWin = window.open('', '_blank');
  if (!printWin) {
    setError('Impression bloquée (autorise les popups ?)');
    return;
  }

  // Concatène tous les messages assistant (si tu veux le dernier seulement, adapte !)
  const printable = messages
    .filter(m => m.role === 'assistant')
    .map(m => m.text)
    .join('\n\n');

  printWin.document.write(`
    <html>
      <head><title>Réponse Themis</title></head>
      <body>
        <pre>${printable}</pre>
        <button onclick="window.print()">Imprimer cette réponse</button>
      </body>
    </html>
  `);
  printWin.document.close();
};





  // État pour modals
const [showExtractModal, setShowExtractModal] = useState(false);
const [showPrintModal, setShowPrintModal] = useState(false);

// Handler actualiser (efface tout)
const handleRefreshAll = () => {
  setQuestion('');
  setMessages([]);      // Vide tout le chat
  setHistory([]);
  setError('');
  setExtractedText('');
};



const handleFileExtract = async (file: File | null) => {
  if (!file) return;
  setIsExtracting(true);
  setError('');
  try {
    // extractTextAndPreview renvoie { text, previewUrl }
    const { text, previewUrl } = await extractTextAndPreview(file);
    setExtractedText(text);
    setPreviewUrl(previewUrl);
    if (text && text.trim()) {
      setShowExtractModal(true); // Ouvre le modal
    } else {
      setError('Aucun texte détecté');
    }
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setIsExtracting(false);
  }
};





// Sauvegarde extrait dans bibliothèque (POST /api/upload avec extraction auto)
const saveExtractToLibrary = async (filename: string, content: string) => {
  try {
    const formData = new FormData();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const file = new File([blob], filename, { type: 'text/plain' });
    formData.append('file', file);
    formData.append('profile', 'general');  // Ou dynamique
    formData.append('category', 'extraction');
    formData.append('extract', 'true');  // Extraction auto si besoin

    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`Sauvegarde échouée: ${response.status}`);
    
    setToast?.({ message: 'Extrait copié dans la bibliothèque', type: 'success' });
    setShowExtractModal(false);
    setExtractedText('');
  } catch (err) {
    setError('Erreur lors de la copie: ' + (err as Error).message);
    console.error('Sauvegarde erreur:', err);
  }
};

// Extraction texte (TXT local, PDF/DOC via backend /api/documents/extract)
const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (fileType === 'txt') {
    // Lecture directe TXT
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Lecture TXT échouée'));
      reader.readAsText(file);
    });
  } else if (['pdf', 'doc', 'docx', 'jpg', 'png'].includes(fileType)) {  // Étendu pour images OCR
    // Backend pour PDF/DOC/OCR (route /api/documents/extract)
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('http://localhost:3001/api/documents/extract', { method: 'POST', body: formData });
    if (!response.ok) throw new Error(`Backend extraction: ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text || '';
  } else {
    throw new Error('Type non supporté (.txt, .pdf, .doc, .docx, .jpg, .png)');
  }
};

 // Handler export Word (unique, async – fusion backend/client)
const handleWordExport = async () => {
  if (!question.trim() || !messages.trim()) {
    setError('Question ou réponse vide pour export.');
    return;
  }
  
  setLoadingExport(true);
  const timestamp = new Date().toISOString().split('T')[0];
  
  try {
    let filename = `themis_qr_${timestamp}.docx`;
    
    // Tente backend (Flask /api/generate-doc si existant)
    try {
      const lastAssistant = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.text || '';
      const { filename: backendFilename } = await generateDoc(question, lastAssistant, model);

      showToast('Document Word généré via backend');
    } catch (backendErr) {
      console.warn('Backend indisponible, fallback client:', backendErr);
      // Fallback client-side docx
      const { Packer, Document, Paragraph, TextRun } = await import('docx');
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ children: [new TextRun({ text: 'Question:', bold: true, size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: question, size: 20 })] }),
            new Paragraph({ children: [new TextRun({ text: '\n' })] }),
            new Paragraph({ children: [new TextRun({ text: 'Réponse:', bold: true, size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: messages, size: 20 })] }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      filename = `themis_qr_${timestamp}.docx`;
      
      // Download (file-saver ou natif)
      try {
        const { saveAs } = await import('file-saver');
        saveAs(blob, filename);
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      }
    }
    
    // Download si backend gère pas
    if (typeof downloadDoc === 'function') {
      downloadDoc(filename, model);
    }
    
    showToast('Export Word réussi !');
    setError('');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    setError('Export échoué: ' + msg);
    showToast(`Erreur export: ${msg}`, 'error');
    console.error('Word export error:', err);
  } finally {
    setLoadingExport(false);
  }
};

const [isFullscreen, setIsFullscreen] = useState(false);
   

const handlePrint = () => {
  // Vérifie que la question n'est pas vide
  if (!question.trim() || !messages.filter(m => m.role === 'assistant').length) {
    setError('Question ou réponse vide pour impression.');
    return;
  }
  const printWin = window.open('', '_blank');
  if (!printWin) {
    setError('Impression bloquée (autorise les popups ?)');
    return;
  }

  // Prend TOUTES les réponses assistant
  const printable = messages
    .filter(m => m.role === 'assistant')
    .map(m => m.text)
    .join('\n\n');

  printWin.document.write(`
    <html>
      <head>
        <title>Réponse Themis</title>
        <style>body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.5; } h1 { color: #333; } h2 { margin-top: 20px; } pre { white-space: pre-wrap; background: #f9f9f9; padding: 10px; border-left: 3px solid #007bff; }</style>
      </head>
      <body>
        <h1>Réponse Themis</h1>
        <h2>Question:</h2>
        <pre>${question}</pre>
        <h2>Réponse:</h2>
        <pre>${printable}</pre>
        <button onclick="window.print()">Imprimer cette réponse</button>
      </body>
    </html>
  `);
  printWin.document.close();
  setShowPrintModal(false);
  setToast?.({ message: 'Aperçu impression ouvert !', type: 'success' });
};



const handleExportPDF = async () => {
  if (!question.trim() || !messages.trim()) {
    setError('Question ou réponse vide pour export.');
    return;
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `reponse_themis_${timestamp}.html`;
  
  try {
    const htmlContent = `
      <html>
        <head><title>Réponse Themis</title>
        <style>body { font-family: Arial; margin: 20px; line-height: 1.5; } h1, h2 { color: #333; } pre { white-space: pre-wrap; background: #f5f5f5; padding: 10px; }</style>
        </head>
        <body>
          <h1>Réponse Themis</h1>
          <h2>Question:</h2>
          <pre>${question}</pre>
          <h2>Réponse:</h2>
          <pre>${messages}</pre>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowPrintModal(false);
  } catch (err) {
    setError('Export PDF échoué: ' + (err as Error).message);
  }
};

// ✅ AJOUTER LE RETURN ICI (pas après les lignes orphelines!)

return (
  <>
    {showPrintModal && messages.length && (
      <DraggableModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Impression"
        size="md"
  >
    <div className="p-4">
      <div className="max-h-96 overflow-y-auto">
        <pre className="whitespace-pre-wrap">
          {messages.filter(m => m.role === 'assistant').map(m => m.text).join('\n\n')}
        </pre>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <ThemisButton onClick={() => setShowPrintModal(false)} variant="outline">
          Annuler
        </ThemisButton>
        <ThemisButton onClick={handlePrintAnswer} variant="primary">
          Imprimer
        </ThemisButton>
      </div>
    </div>
  </DraggableModal>
)}


          <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {showLibrary && (
              <aside className="w-80 bg-white/80 dark:bg-gray-800/80 p-4 border-r">
                <LibrarySidebar onStructureChange={setLibraryStructure} />
              </aside>
            )}

    

        {/* Contenu principal */}
        <main className="flex-1 flex flex-col p-6">
          {/* Barre d’outils */}
          <div className="flex items-center gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold mr-2">Profil :</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="border px-2 py-1"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
  <label className="text-xs font-semibold mr-2 block mb-2">Mode Connexion :</label>
  <button
    onClick={() => setOnlineMode(onlineMode === 'en_ligne' ? 'hors_ligne' : 'en_ligne')}
    className={`relative w-full max-w-xs h-10 rounded-full transition-all duration-300 ease-in-out flex items-center px-2 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg ${
      onlineMode === 'en_ligne'
        ? 'bg-green-500 focus:ring-green-500'  // Vert pour en ligne
        : 'bg-red-500 focus:ring-red-500'      // Rouge pour hors ligne
    }`}
    title={`Passer en mode ${onlineMode === 'en_ligne' ? 'Hors ligne' : 'En ligne'}`}
  >
    {/* Cercle indicateur qui glisse */}
    <div
      className={`absolute h-8 w-8 rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center text-white text-xs font-bold ${
        onlineMode === 'en_ligne'
          ? 'bg-white translate-x-1 shadow-green-200'  // À droite pour en ligne
          : 'bg-white -translate-x-1 shadow-red-200'   // À gauche pour hors ligne
      }`}
    >
      {onlineMode === 'en_ligne' ? <FaWifi className="text-green-600" /> : <FaBan className="text-red-600" />}
    </div>
    {/* Texte fade selon état */}
    <span className={`absolute inset-0 flex items-center justify-center text-white font-semibold transition-opacity duration-300 text-xs ${
      onlineMode === 'en_ligne' ? 'opacity-100' : 'opacity-0'
    }`}>
      En ligne
    </span>
    <span className={`absolute inset-0 flex items-center justify-center text-white font-semibold transition-opacity duration-300 text-xs ${
      onlineMode === 'hors_ligne' ? 'opacity-100' : 'opacity-0'
    }`}>
      Hors ligne
    </span>
  </button>
</div>
<div>
  <label className="text-xs font-semibold mr-2">Moteur :</label>
  <select
    value={engine}
    onChange={e => handleEngineChange(e.target.value)}
    className="border px-2 py-1"
  >
                {ENGINES
                  .filter(e =>
                    onlineMode === 'en_ligne'
                      ? ['perplexity', 'gpt'].includes(e.value)
                      : ['ollama', 'perplexica'].includes(e.value)
                  )
                  .map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold mr-2">Modèle :</label>
              <select
                value={models[engine]}
                onChange={e =>
                  setModels(prev => ({ ...prev, [engine]: e.target.value }))
                }
                className="border px-2 py-1"
              >
                {MODEL_OPTIONS[engine].map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <ThemisButton
              size="xs"
              variant="outline"
              icon={theme === 'dark' ? <FaSun /> : <FaMoon />}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? 'Clair' : 'Sombre'}
            </ThemisButton>
          </div>

          {/* Zone de question */}
<textarea
  value={question}
  onChange={e => setQuestion(e.target.value)}
  rows={3}
  className="w-full p-3 border mb-2"
  placeholder="Posez votre question à l’IA…"
/>
<div className="flex gap-2 mb-4">
  <ThemisButton
    onClick={handleAskAI}
    disabled={!question.trim()}
    variant="primary"
    icon={<FaBalanceScale />}
  >
    Poser la question
  </ThemisButton>
  <ThemisButton
    onClick={handleClear}
    variant="outline"
    icon={<FaSyncAlt />}
  >
    Effacer
  </ThemisButton>
</div>

{/* Erreur */}
{error && (
  <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500">
    <strong>Erreur :</strong> {error}
  </div>
)}

{/* Affichage chat */}
<div
  className="chat-history mb-4"
  style={{
    maxHeight: '50vh',
    overflowY: 'auto',
    background: 'rgba(30,30,30,0.95)',
    borderRadius: '8px',
    padding: '8px',
    marginBottom: '1rem'
  }}
>
  {messages.length === 0 && (
    <div className="text-gray-400 italic">
      Posez votre première question…
    </div>
  )}

  {messages.map((msg, i) => (
    <div
      key={i}
      className={msg.role === 'user' ? 'text-right' : 'text-left'}
    >
      <div
        className={
          msg.role === 'user'
            ? "inline-block bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-3 py-2 rounded-lg mb-1"
            : "inline-block bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-2 rounded-lg mb-1"
        }
        style={{ maxWidth: '70%' }}
      >
        {msg.text}
      </div>
    </div>
  ))}
</div>

{/* Optionnel bouton copier la dernière réponse IA */}
{messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
  <ThemisButton
    onClick={() => navigator.clipboard.writeText(messages[messages.length - 1].text)}
    size="sm"
    variant="outline"
    className="mb-4"
  >
    Copier la dernière réponse
  </ThemisButton>
)}





          
        </main>

        {showExtractModal && (
  <>
    {/* Overlay assombri, z-40, clique pour fermer */}
    <div
      className="fixed inset-0 bg-black bg-opacity-40 z-40"
      onClick={() => {
        setShowExtractModal(false);
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setExtractedText('');
      }}
    />
    <DraggableModal
      isOpen={showExtractModal}
      onClose={() => {
        setShowExtractModal(false);
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
        setExtractedText('');
      }}
      title="Extraire Texte"
      size={isFullscreen ? 'full' : 'lg'}
      headerControls={
        <div className="flex items-center space-x-2">
          <button onClick={() => setIsFullscreen(f => !f)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title={isFullscreen ? "Réduire" : "Agrandir"}>
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
          <button
            onClick={() => {
              setShowExtractModal(false);
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl('');
              setExtractedText('');
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Fermer"
          >
            <FaTimes />
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <input
          type="file"
          accept="image/*,application/pdf"
          ref={fileExtractInputRef}
          onChange={handleExtract}
          className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        {isExtracting && (
          <p className="text-sm text-gray-500">Extraction en cours…</p>
        )}

        {previewUrl && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4">
            <h5 className="font-bold text-gray-800 dark:text-gray-200 mb-2">
              Aperçu du document :
            </h5>
            {previewUrl.endsWith('.pdf') ? (
              <iframe
                src={previewUrl}
                title="Aperçu PDF"
                className="w-full h-80 border border-gray-300 dark:border-gray-600 rounded"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Aperçu image"
                className="max-w-full max-h-80 object-contain rounded border border-gray-300 dark:border-gray-600"
              />
            )}
          </div>
        )}

        {extractedText && (
          <div className="bg-blue-50 p-4 rounded-md max-h-64 overflow-y-auto">
            <h5 className="font-bold text-blue-800 mb-2">Texte Extrait :</h5>
            <pre className="whitespace-pre-wrap text-xs">
              {extractedText}
            </pre>
            <div className="mt-4 flex gap-2">
              <ThemisButton
                onClick={handleCopyToLibrary}
                variant="success"
                size="sm"
              >
                Copier dans la bibliothèque
              </ThemisButton>
              <ThemisButton
                onClick={() => {
                  setQuestion(extractedText);
                  setShowExtractModal(false);
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl('');
                  setExtractedText('');
                }}
                variant="primary"
                size="sm"
              >
                Injecter dans l’IA
              </ThemisButton>
              <ThemisButton
                onClick={() => {
                  setShowExtractModal(false);
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl('');
                  setExtractedText('');
                }}
                variant="outline"
                size="sm"
              >
                Annuler
              </ThemisButton>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  </>
)}

       {/* Sidebar droite (flex-col : boutons haut fixed + historique bas scrollable) */}
<aside className="w-64 bg-white/80 dark:bg-gray-800/80 p-4 border-l flex flex-col h-full min-h-screen">
  {/* Boutons config haut (flex-shrink-0, space-y-3) */}
  <div className="space-y-3 flex-shrink-0">
    {/* Bouton Actualiser Tout (en haut, toujours actif, icon sync animé) */}
    <ThemisButton
      onClick={handleRefreshAll}
      variant="outline"
      icon={<FaSync className="rotate-0 group-hover:rotate-180 transition-transform" />}
      size="sm"
      className="w-full"
    >
      Actualiser Tout
    </ThemisButton>

    {/* Toggle Bibliothèque */}
    <ThemisButton
      onClick={() => setShowLibrary(!showLibrary)}
      variant="dark"
      icon={<FaRegFolderOpen />}
      size="sm"
      className="w-full"
    >
      {showLibrary ? 'Masquer Bibliothèque' : 'Afficher Bibliothèque'}
    </ThemisButton>

    {/* Extraire Texte (icon folder open, ou change FaFileText si préfères) */}
    <ThemisButton
      onClick={() => setShowExtractModal(true)}
      variant="outline"
      icon={<FaRegFolderOpen />}
      size="sm"
      className="w-full"
    >
      Extraire Texte
    </ThemisButton>

    {/* Exporter Word (disabled si pas Q/R, icon file-word) */}
    <ThemisButton
      onClick={handleWordExport}
      variant="success"
      disabled={
  loadingExport ||
  !question.trim() ||
  messages.length === 0 ||
  messages[messages.length - 1].role !== 'assistant'
}

      icon={<FaFileWord />}
      size="sm"
      className="w-full"
    >
      Exporter Word
    </ThemisButton>

    {/* Copier Réponse (disabled si pas answer) */}
    {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
  <ThemisButton
    onClick={() => navigator.clipboard.writeText(messages[messages.length - 1].text)}
    variant="primary"
    icon={<FaCopy />}
    size="sm"
    className="w-full"
  >
    Copier
  </ThemisButton>
)}


    {/* Imprimer (disabled si pas answer) */}
    <ThemisButton
  onClick={() => setShowPrintModal(true)}
  variant="dark"
  disabled={messages.length === 0 || messages[messages.length - 1].role !== 'assistant'}
  icon={<FaPrint />}
  size="sm"
  className="w-full"
>
  Imprimer la réponse IA
</ThemisButton>


       {/* Importer Q/R */}
    <ThemisButton
      onClick={() => setShowImportModal(true)}
      variant="secondary"
      icon={<FaUpload />}
      size="sm"
      className="w-full"
    >
      Importer Q/R
    </ThemisButton>
    
    {/* Nouvelle Conversation */}
    <ThemisButton
      onClick={handleNewConversation}
      variant="outline"
      icon={<FaSync />}
      size="sm"
      className="w-full"
    >
      Nouvelle Conv
    </ThemisButton>
    
  </div>

  {/* Modal Importer Q/R */}
  {showImportModal && (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={() => setShowImportModal(false)}
      />
      <DraggableModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Importer Q/R"
        size="md"
      >
        <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium mb-1">Question :</label>
            <textarea
              value={importedQ}
              onChange={e => setImportedQ(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded"
              placeholder="Coller la question..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Réponse :</label>
            <textarea
              value={importedA}
              onChange={e => setImportedA(e.target.value)}
              rows={3}
              className="w-full p-2 border rounded"
              placeholder="Coller la réponse..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <ThemisButton
              onClick={() => setShowImportModal(false)}
              variant="outline"
            >
              Annuler
            </ThemisButton>
            <ThemisButton
              onClick={handleImportQR}
              variant="primary"
            >
              Importer
            </ThemisButton>
          </div>
        </div>
      </DraggableModal>
    </>
  )}

  {/* Historique */}
  <div className="flex-1 mt-4 overflow-hidden flex flex-col">
    <h6 className="text-xs font-semibold text-gray-600 mb-2 sticky top-0 bg-white/80 dark:bg-gray-800/80 py-1 z-10">
      Historique (5 derniers)
    </h6>
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 pr-1">
      {history.length > 0 ? (
        <div className="space-y-1">
          {history.slice(-5).reverse().map((h, i) => {
            const safeQuestion = h?.question || "";
            const questionDisplay =
              safeQuestion.length > 35
                ? `${safeQuestion.substring(0, 35)}...`
                : safeQuestion;

            let answerDisplay = "";
            if (Array.isArray(h?.messages)) {
              answerDisplay = h.messages
                .filter((m: any) => m.role === "assistant")
                .map((m: any) => m.text)
                .join(" | ")
                .substring(0, 50);
            } else if (typeof h?.answer === "string") {
              answerDisplay = h.answer.substring(0, 50);
            } else if (typeof h?.messages === "string") {
              answerDisplay = String(h.messages).substring(0, 50);
            }

            const timeDisplay = h?.timestamp
              ? new Date(h.timestamp).toLocaleString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : new Date().toLocaleString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            return (
              <div
                key={`hist-${i}-${safeQuestion.substring(0, 20)}`}
                className="p-2 bg-gray-100/50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 text-xs cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                onClick={() => {
                  if (Array.isArray(h.messages)) {
                    setMessages(h.messages);
                  } else if (typeof h.answer === "string" && h.answer.trim()) {
                    setMessages([
                      { role: "user", text: safeQuestion },
                      { role: "assistant", text: h.answer },
                    ]);
                  } else if (typeof h.messages === "string" && h.messages.trim()) {
                    setMessages([
                      { role: "user", text: safeQuestion },
                      { role: "assistant", text: h.messages },
                    ]);
                  } else {
                    setMessages([]);
                  }
                  setQuestion(safeQuestion);
                  setError("");
                }}
                title={`Q: ${safeQuestion}\nR: ${
                  Array.isArray(h?.messages)
                    ? h.messages
                        .filter((m: any) => m.role === "assistant")
                        .map((m: any) => m.text)
                        .join("\n")
                    : typeof h?.answer === "string"
                    ? h.answer
                    : h?.messages || ""
                }`}
              >
                <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  Q: {questionDisplay || "(Sans question)"}
                </div>
                <div className="text-gray-600 dark:text-gray-300 text-[10px] truncate mt-0.5">
                  R: {answerDisplay || "(Sans réponse)"}
                  {Array.isArray(h?.messages) &&
                    h.messages.filter((m: any) => m.role === "assistant").length >
                      0 && "..."}
                </div>
                <div className="text-[8px] text-gray-400 mt-1">{timeDisplay}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-xs italic">
          Aucune question posée encore...
        </div>
      )}
    </div>
  </div>
</aside>
      </div>
    </>
  );
}
