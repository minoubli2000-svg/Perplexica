'use client';

// ===== IMPORTS EXHAUSTIFS =====
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useId,
  type ChangeEvent,
  type MouseEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import {
  FaBalanceScale,
  FaTimes,
  FaMinus,
  FaWindowMaximize,
  FaCopy,
  FaMoon,
  FaSun,
  FaRegFilePdf,
  FaFileExport,
  FaPlus,
  FaRegFolderOpen,
  FaTrashAlt,
  FaWifi,
  FaBan,
  FaUpload,
  FaDownload,
  FaPlay,
  FaEdit,
  FaFolder,
  FaFileAlt,
  FaSave,
  FaPrint,
  FaHistory,
  FaSearch,
  FaFilter,
  FaSort,
  FaSyncAlt,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa';

/* Debug de montage */
if (typeof window !== 'undefined') {
  console.log('THEMIS_TSX_FINAL_ACTIVE');
  (window as any).__THEMIS_TSX__ = true;
}

// ===== TYPES EXHAUSTIFS =====
type ToastType = 'info' | 'success' | 'error' | 'warning';
type ToastMsg = { id: number; text: string; type?: ToastType };
type HistoryItem = {
  id: string;
  q: string;
  a: string;
  doc?: string;
  timestamp: number;
  model: string;
  extractedText?: string;
};
type LibFile = { name: string; path?: string; size?: number; mtime?: string };
type LibDir = { name: string; path?: string; children?: Array<LibDir | LibFile> };
type LibRoot = { directories?: LibDir[]; files?: LibFile[] } | Record<string, any>;
type BEFile = { name: string; size?: number };
type BEStruct = Record<string, Record<string, BEFile[]>>;
type Theme = 'light' | 'dark';
type OnlineStatus = boolean;

// ===== CONFIGURATION COMPLÈTE =====
const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' && (window as any).API_BASE) ||
  'http://localhost:3001';

const REQUEST_TIMEOUT_MS = 15000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];

const ENGINES = [
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'perplexica', label: 'Perplexica' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'gpt', label: 'GPT' },
];

const MODEL_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
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
  gpt: [{ value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }],
};

const ROLES = [
  { value: 'general', label: 'Général' },
  { value: 'doctorant', label: 'Doctorant' },
  { value: 'rapporteur', label: 'Rapporteur' },
];

// ===== UTILITAIRES =====
function toBackendModel(engine: string, model: string): string {
  switch (engine) {
    case 'perplexity':
      return `perplexity:${model || 'sonar'}`;
    case 'perplexica':
      return `perplexica:${model || 'default'}`;
    case 'ollama':
      return `ollama:${model || 'llama3'}`;
    case 'gpt':
      return `perplexity:${model || 'sonar'}`;
    default:
      return 'general';
  }
}

function buildUrl(path: string, params: Record<string, any> = {}) {
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) qp.set(k, String(v));
  });
  const qs = qp.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `Fichier trop volumineux (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Type de fichier non autorisé: ${file.type}`;
  }
  return null;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ===== CLIENT RÉSEAU SÉCURISÉ =====
async function withTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeout = REQUEST_TIMEOUT_MS,
) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const url =
      typeof input === 'string' && input.startsWith('/')
        ? `${API_BASE}${input}`
        : (input as string);
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await withTimeout(path, init);
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let msg = '';
    try {
      msg = contentType.includes('application/json')
        ? JSON.stringify(await res.json())
        : await res.text();
    } catch {
      msg = '';
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error('Réponse non-JSON');
    }
  }

  return (await res.json()) as T;
}

// ===== API ENDPOINTS UNIFIÉS =====
const IA = {
  ask: (payload: { prompt: string; model: string }) =>
    fetchJson<{ result: string }>('/api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
};

const Docs = {
  generate: (payload: { question: string; response: string; model: string }) =>
    fetchJson<{ success: boolean; filename: string }>('/api/documents/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  downloadUrl: (filename: string, model?: string) =>
    buildUrl('/api/documents/download', { filename, model }),
};

const Library = {
  structure: () => fetchJson<{ structure: BEStruct }>('/api/library/structure'),
  extract: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetchJson<{ text: string }>('/api/documents/extract', { method: 'POST', body: fd });
  },
  remove: (payload: { filename: string; model: string; subdir?: string | null }) =>
    fetchJson('/api/library/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  rename: (payload: { oldName: string; newName: string; model: string; subdir?: string | null }) =>
    fetchJson('/api/library/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  upload: (file: File, profile: string, category?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('profile', profile);
    fd.append('category', category || 'extraction');
    return fetchJson('/api/upload', { method: 'POST', body: fd });
  },
};

// ===== HOOKS UTILITAIRES =====
function useOnlineStatus(): OnlineStatus {
  const [online, setOnline] = useState<OnlineStatus>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

function useToasts() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const add = useCallback((text: string, type?: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const remove = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return { toasts, add, remove };
}

function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T) => {
      setValue(newValue);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, JSON.stringify(newValue));
        } catch (error) {
          console.error('Erreur localStorage:', error);
        }
      }
    },
    [key],
  );

  return [value, setStoredValue];
}

// ===== COMPOSANTS UI =====
const Spinner = () => <div className="spinner" />;

const WindowControls = () => {
  const minimize = () => {
    try {
      (window as any)?.electronAPI?.minimizeWindow?.();
    } catch {}
  };
  const maximize = () => {
    try {
      (window as any)?.electronAPI?.maximizeWindow?.();
    } catch {}
  };
  const close = () => {
    try {
      (window as any)?.electronAPI?.closeWindow?.();
    } catch {}
  };

  if (typeof window === 'undefined') return null;

  return (
    <div className="win-controls">
      <button onClick={minimize} title="Minimiser">
        <FaMinus />
      </button>
      <button onClick={maximize} title="Maximiser">
        <FaWindowMaximize />
      </button>
      <button onClick={close} title="Fermer">
        <FaTimes />
      </button>
    </div>
  );
};

function ThemisButton({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled = false,
  loading = false,
  className = '',
}: {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`btn ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <Spinner /> : icon}
      {label}
    </button>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type?: ToastType;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`toast ${type || 'info'}`} onClick={onClose}>
      {message}
    </div>
  );
}

function Toasts({ items, onClose }: { items: ToastMsg[]; onClose: (id: number) => void }) {
  return (
    <div className="toasts">
      {items.map((t) => (
        <Toast key={t.id} message={t.text} type={t.type} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="overlay-card" role="dialog" aria-labelledby={titleId}>
        <div className="overlay-header">
          <h3 id={titleId}>{title}</h3>
          <button className="icon" onClick={onClose} title="Fermer">
            <FaTimes />
          </button>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

// ===== CONVERSION STRUCTURE BIBLIOTHÈQUE =====
function mapBackendToLibRoot(be: BEStruct): LibRoot {
  const dirs = Object.entries(be || {}).map(([profile, cats]) => ({
    name: profile.toUpperCase(),
    path: profile,
    children: Object.entries(cats || {}).map(([cat, files]) => ({
      name: cat || '(racine)',
      path: `${profile}/${cat || ''}`,
      children: (files || []).map((f) => ({
        name: f.name,
        path: `${profile}/${cat || ''}/${f.name}`,
        size: f.size,
      })),
    })),
  }));
  return { directories: dirs, files: [] };
}

// ===== COMPOSANT ARBRE =====
function TreeNode({
  node,
  depth,
  onSelect,
  selectedPath,
}: {
  node: any;
  depth: number;
  onSelect: (path: string, isFile: boolean) => void;
  selectedPath?: string;
}) {
  const isDir = Array.isArray(node?.children);
  const path = node?.path || node?.name;
  const padding = 8 + depth * 14;

  return (
    <>
      <div
        className={`tree-node ${selectedPath === path ? 'selected' : ''}`}
        style={{ paddingLeft: padding + 'px' }}
        onClick={() => onSelect(path, !isDir)}
      >
        {isDir ? <FaFolder /> : <FaFileAlt />}
        <span>{node?.name || node?.path}</span>
        {node?.size && <span className="file-size">({Math.round(node.size / 1024)}KB)</span>}
      </div>
      {isDir &&
        node.children?.map((ch: any, i: number) => (
          <TreeNode
            key={`${path || 'n'}-${i}`}
            node={ch}
            depth={depth + 1}
            onSelect={onSelect}
            selectedPath={selectedPath}
          />
        ))}
    </>
  );
}

// ===== PANNEAU BIBLIOTHÈQUE =====
function LibraryPanel({
  backendModel,
  role,
  onToast,
  onUploadExtractToPrompt,
  online,
}: {
  backendModel: string;
  role: string;
  onToast: (msg: string, type?: ToastType) => void;
  onUploadExtractToPrompt: (text: string) => void;
  online: boolean;
}) {
  const [structure, setStructure] = useState<LibRoot | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | undefined>(undefined);
  const [renameTo, setRenameTo] = useState('');
  const [subdir, setSubdir] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!online) return;
    setLoading(true);
    try {
      const j = await Library.structure();
      setStructure(mapBackendToLibRoot(j.structure));
    } catch (e: any) {
      onToast(`Structure: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast, online]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onUpload = useCallback(
    async (file?: File) => {
      if (!file || !online) return;

      const validation = validateFile(file);
      if (validation) {
        onToast(validation, 'error');
        return;
      }

      setLoading(true);
      try {
        await Library.upload(file, role, subdir);
        onToast('Upload réussi', 'success');
        await refresh();
      } catch (e: any) {
        onToast(`Upload: ${e.message}`, 'error');
      } finally {
        setLoading(false);
      }
    },
    [role, subdir, refresh, onToast, online],
  );

  const onDelete = useCallback(async () => {
    if (!selectedPath || !online) return onToast('Aucun fichier sélectionné ou hors ligne', 'info');

    setLoading(true);
    try {
      await Library.remove({
        filename: selectedPath.split('/').pop() || '',
        model: role,
        subdir: subdir || null,
      });
      onToast('Suppression réussie', 'success');
      setSelectedPath(undefined);
      await refresh();
    } catch (e: any) {
      onToast(`Suppression: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPath, role, subdir, refresh, onToast, online]);

  const onRename = useCallback(async () => {
    if (!selectedPath || !renameTo.trim() || !online) {
      return onToast('Sélectionnez un fichier, un nouveau nom et vérifiez la connexion', 'info');
    }

    setLoading(true);
    try {
      await Library.rename({
        oldName: selectedPath.split('/').pop() || '',
        newName: renameTo.trim(),
        model: role,
        subdir: subdir || null,
      });
      onToast('Renommage réussi', 'success');
      setRenameTo('');
      setSelectedPath(undefined);
      await refresh();
    } catch (e: any) {
      onToast(`Renommage: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedPath, renameTo, role, subdir, refresh, onToast, online]);

  const onExtractFromFile = useCallback(async () => {
    if (!online) return onToast('Extraction impossible hors ligne', 'error');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const validation = validateFile(file);
      if (validation) {
        onToast(validation, 'error');
        return;
      }

      setLoading(true);
      try {
        const j = await Library.extract(file);
        onUploadExtractToPrompt(j.text || '');
        onToast('Extraction réussie', 'success');
      } catch (e: any) {
        onToast(`Extraction: ${e.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  }, [onUploadExtractToPrompt, onToast, online]);

  const handleSelect = useCallback((path: string, isFile: boolean) => {
    if (isFile) {
      setSelectedPath(path);
    }
  }, []);

  function renderRoot(root: LibRoot) {
    const dirs: any[] = Array.isArray((root as any).directories) ? (root as any).directories : [];
    const files: any[] = Array.isArray((root as any).files) ? (root as any).files : [];
    const keys = Object.keys(root || {}).filter((k) => !['directories', 'files'].includes(k));

    return (
      <>
        {dirs.map((d, i) => (
          <TreeNode
            key={`dir-${i}`}
            node={d}
            depth={0}
            onSelect={handleSelect}
            selectedPath={selectedPath}
          />
        ))}
        {files.map((f, i) => (
          <TreeNode
            key={`file-${i}`}
            node={f}
            depth={0}
            onSelect={handleSelect}
            selectedPath={selectedPath}
          />
        ))}
        {keys.map((k, i) => {
          const val = (root as any)[k];
          if (!val) return null;
          if (Array.isArray(val)) {
            return (
              <div key={`arr-${k}-${i}`}>
                <div className="tree-section-title">{k}</div>
                {val.map((item: any, j: number) => (
                  <TreeNode
                    key={`arr-${k}-${i}-${j}`}
                    node={item}
                    depth={1}
                    onSelect={handleSelect}
                    selectedPath={selectedPath}
                  />
                ))}
              </div>
            );
          }
          if (typeof val === 'object') {
            return (
              <div key={`obj-${k}-${i}`}>
                <div className="tree-section-title">{k}</div>
                {renderRoot(val as any)}
              </div>
            );
          }
          return null;
        })}
      </>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h4>Bibliothèque Documentaire</h4>
        {!online && <FaBan className="offline-icon" title="Hors ligne" />}
        {loading && <Spinner />}
      </div>

      <div className="lib-actions">
        <input
          type="file"
          onChange={(e) => onUpload(e.target.files?.[0] || undefined)}
          disabled={!online || loading}
        />
        <input
          placeholder="Sous-dossier (extraction)"
          value={subdir || ''}
          onChange={(e) => setSubdir(e.target.value || undefined)}
        />
        <ThemisButton
          icon={<FaTrashAlt />}
          label="Supprimer"
          onClick={onDelete}
          variant="danger"
          disabled={!online || loading || !selectedPath}
        />
        <input
          placeholder="Nouveau nom"
          value={renameTo}
          onChange={(e) => setRenameTo(e.target.value)}
        />
        <ThemisButton
          icon={<FaEdit />}
          label="Renommer"
          onClick={onRename}
          disabled={!online || loading || !selectedPath || !renameTo.trim()}
        />
        <ThemisButton
          icon={<FaRegFilePdf />}
          label="Extraire fichier"
          onClick={onExtractFromFile}
          disabled={!online || loading}
        />
        <ThemisButton
          icon={<FaSyncAlt />}
          label="Actualiser"
          onClick={refresh}
          disabled={!online || loading}
        />
      </div>

      <div className="tree">
        {structure
          ? renderRoot(structure)
          : loading
            ? 'Chargement...'
            : online
              ? 'Aucune donnée'
              : 'Hors ligne'}
      </div>

      <div className="selection">
        <strong>Sélection:</strong> {selectedPath || '(rien)'}
      </div>
    </section>
  );
}

// ===== OVERLAY EXTRACTION =====
function ExtractionOverlay({
  text,
  onSendToIA,
  onSendToWord,
  onCancel,
}: {
  text: string;
  onSendToIA: () => void;
  onSendToWord: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        <div className="overlay-header">
          <h3>Texte extrait</h3>
          <button className="icon" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>
        <div className="overlay-body">
          <pre className="extracted-text">{text}</pre>
          <div className="row">
            <ThemisButton
              icon={<FaPlay />}
              label="Envoyer à l'IA"
              onClick={onSendToIA}
              variant="primary"
            />
            <ThemisButton
              icon={<FaFileExport />}
              label="Envoyer pour Word"
              onClick={onSendToWord}
              variant="success"
            />
            <ThemisButton icon={<FaTimes />} label="Annuler" onClick={onCancel} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== PANNEAU IA PRINCIPAL =====
function IAPanel({
  prompt,
  setPrompt,
  answer,
  onAsk,
  onExport,
  history,
  onDownload,
  onReplayHistory,
  busy,
  showExtractOverlay,
  extractText,
  onOverlaySendToIA,
  onOverlaySendToWord,
  onOverlayCancel,
  online,
}: {
  prompt: string;
  setPrompt: (v: string) => void;
  answer: string;
  onAsk: () => Promise<void>;
  onExport: () => Promise<void>;
  history: HistoryItem[];
  onDownload: (filename: string) => void;
  onReplayHistory: (item: HistoryItem) => void;
  busy: boolean;
  showExtractOverlay: boolean;
  extractText: string;
  onOverlaySendToIA: () => void;
  onOverlaySendToWord: () => void;
  onOverlayCancel: () => void;
  online: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Erreur copie:', error);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (online && !busy) {
          onAsk();
        }
      }
    },
    [onAsk, online, busy],
  );

  return (
    <section className="panel main-panel">
      <div className="panel-header">
        <h3>Interrogation IA</h3>
        {!online && <FaBan className="offline-icon" title="Hors ligne" />}
        {busy && <Spinner />}
      </div>

      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Posez votre question à l'IA... (Ctrl+Entrée pour envoyer)"
        className="area"
        disabled={busy}
      />

      <div className="row">
        <ThemisButton
          icon={<FaPlay />}
          label="Demander"
          onClick={onAsk}
          variant="primary"
          disabled={!online || busy || !prompt.trim()}
          loading={busy}
        />
        <ThemisButton
          icon={<FaFileExport />}
          label="Exporter"
          onClick={onExport}
          variant="success"
          disabled={!online || busy || !answer.trim()}
        />
        <ThemisButton
          icon={<FaCopy />}
          label="Copier prompt"
          onClick={() => copyToClipboard(prompt)}
          disabled={!prompt.trim()}
        />
      </div>

      <div className="answer-panel">
        <div className="answer-header">
          <strong>Réponse:</strong>
          {answer && (
            <ThemisButton
              icon={<FaCopy />}
              label="Copier"
              onClick={() => copyToClipboard(answer)}
              className="copy-btn"
            />
          )}
        </div>
        <pre className="answer">{answer || 'En attente de votre question...'}</pre>
      </div>

      <div className="history-panel">
        <div className="panel-header">
          <h4>Historique</h4>
          <span className="history-count">({history.length})</span>
        </div>
        <div className="history">
          {history.map((item) => (
            <div key={item.id} className="card history-item">
              <div className="history-meta">
                <span className="timestamp">{new Date(item.timestamp).toLocaleString()}</span>
                <span className="model">{item.model}</span>
              </div>
              <div className="q">
                <span className="label">Q:</span>
                <span className="content">{item.q}</span>
              </div>
              <div className="a">
                <span className="label">A:</span>
                <span className="content">{item.a.substring(0, 200)}...</span>
              </div>
              <div className="history-actions">
                <ThemisButton
                  icon={<FaPlay />}
                  label="Rejouer"
                  onClick={() => onReplayHistory(item)}
                  disabled={busy}
                />
                <ThemisButton
                  icon={<FaCopy />}
                  label="Copier Q"
                  onClick={() => copyToClipboard(item.q)}
                />
                <ThemisButton
                  icon={<FaCopy />}
                  label="Copier R"
                  onClick={() => copyToClipboard(item.a)}
                />
                {item.doc && (
                  <ThemisButton
                    icon={<FaDownload />}
                    label="Télécharger"
                    onClick={() => onDownload(item.doc!)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showExtractOverlay && (
        <ExtractionOverlay
          text={extractText}
          onSendToIA={onOverlaySendToIA}
          onSendToWord={onOverlaySendToWord}
          onCancel={onOverlayCancel}
        />
      )}
    </section>
  );
}

// ===== PANNEAU ACTIONS =====
function ActionsPanel({
  onOpenExtract,
  onOpenImport,
  onOpenExport,
  onOpenPrint,
  onClearHistory,
  online,
}: {
  onOpenExtract: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenPrint: () => void;
  onClearHistory: () => void;
  online: boolean;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Actions</h3>
        {!online && <FaBan className="offline-icon" title="Hors ligne" />}
      </div>

      <div className="col actions-grid">
        <ThemisButton
          icon={<FaRegFilePdf />}
          label="Extraire fichier"
          onClick={onOpenExtract}
          disabled={!online}
        />
        <ThemisButton icon={<FaUpload />} label="Import Q/R" onClick={onOpenImport} />
        <ThemisButton
          icon={<FaFileExport />}
          label="Exporter production"
          onClick={onOpenExport}
          variant="success"
          disabled={!online}
        />
        <ThemisButton icon={<FaPrint />} label="Imprimer" onClick={onOpenPrint} />
        <ThemisButton
          icon={<FaTrashAlt />}
          label="Vider historique"
          onClick={onClearHistory}
          variant="danger"
        />
      </div>
    </section>
  );
}

// ===== COMPOSANT PRINCIPAL =====
export default function ThemisFinal() {
  // États principaux
  const [engine, setEngine] = useState('perplexity');
  const [model, setModel] = useState('sonar');
  const [role, setRole] = useState('general');
  const [theme, setTheme] = useLocalStorage<Theme>('themis-theme', 'light');

  // États IA
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('themis-history', []);
  const [busy, setBusy] = useState(false);

  // États UI
  const [showLibrary, setShowLibrary] = useState(true);
  const [extractText, setExtractText] = useState('');
  const [showExtractOverlay, setShowExtractOverlay] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  // Hooks
  const online = useOnlineStatus();
  const { toasts, add, remove } = useToasts();
  const backendModel = useMemo(() => toBackendModel(engine, model), [engine, model]);

  // Actions IA
  const onAsk = useCallback(async () => {
    if (!online || !prompt.trim()) return;

    setBusy(true);
    try {
      const { result } = await IA.ask({ prompt, model: backendModel });
      const text = result || '';
      setAnswer(text);

      const historyItem: HistoryItem = {
        id: generateId(),
        q: prompt,
        a: text,
        timestamp: Date.now(),
        model: backendModel,
      };

      setHistory((h) => [historyItem, ...h]);
      add('Réponse IA reçue', 'success');
    } catch (e: any) {
      setAnswer(String(e));
      add(`IA: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }, [prompt, backendModel, add, online, setHistory]);

  const onExport = useCallback(async () => {
    if (!online || !answer.trim()) return;

    setBusy(true);
    try {
      const { filename } = await Docs.generate({
        question: prompt,
        response: answer,
        model: role,
      });

      const updatedHistory = history.map((item) =>
        item.q === prompt && item.a === answer && !item.doc ? { ...item, doc: filename } : item,
      );

      setHistory(updatedHistory);
      add('Document exporté', 'success');
    } catch (e: any) {
      add(`Export: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }, [prompt, answer, role, add, online, history, setHistory]);

  const onDownload = useCallback(
    (filename: string) => {
      const url = Docs.downloadUrl(filename, role);
      window.open(url, '_blank');
    },
    [role],
  );

  const onReplayHistory = useCallback((item: HistoryItem) => {
    setPrompt(item.q);
    setAnswer(item.a);
  }, []);

  // Actions extraction
  const onOpenExtract = useCallback(() => {
    if (!online) return add('Extraction impossible hors ligne', 'error');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const validation = validateFile(file);
      if (validation) {
        add(validation, 'error');
        return;
      }

      setBusy(true);
      try {
        const j = await Library.extract(file);
        setExtractText(j.text || '');
        setShowExtractOverlay(true);
        add('Extraction réussie', 'success');
      } catch (e: any) {
        add(`Extraction: ${e.message}`, 'error');
      } finally {
        setBusy(false);
      }
    };
    input.click();
  }, [add, online]);

  // Actions overlay extraction
  const onOverlaySendToIA = useCallback(() => {
    setPrompt(extractText || '');
    setShowExtractOverlay(false);
  }, [extractText]);

  const onOverlaySendToWord = useCallback(async () => {
    if (!extractText.trim() || !online) return;

    setBusy(true);
    try {
      const { filename } = await Docs.generate({
        question: '(texte extrait)',
        response: extractText,
        model: role,
      });

      const historyItem: HistoryItem = {
        id: generateId(),
        q: '(texte extrait)',
        a: '(généré)',
        doc: filename,
        timestamp: Date.now(),
        model: role,
        extractedText: extractText,
      };

      setHistory((h) => [historyItem, ...h]);
      add('Document Word généré', 'success');
      setShowExtractOverlay(false);
    } catch (e: any) {
      add(`Génération: ${e.message}`, 'error');
    } finally {
      setBusy(false);
    }
  }, [extractText, role, add, online, setHistory]);

  const onOverlayCancel = useCallback(() => {
    setShowExtractOverlay(false);
  }, []);

  // Actions modales
  const onOpenImport = useCallback(() => setShowImport(true), []);
  const onOpenExport = useCallback(() => setShowExport(true), []);
  const onOpenPrint = useCallback(() => setShowPrint(true), []);
  const onClearHistory = useCallback(() => {
    setHistory([]);
    add('Historique vidé', 'info');
  }, [setHistory, add]);

  // Fonction upload extraction vers prompt
  const onUploadExtractToPrompt = useCallback(
    (text: string) => {
      setPrompt((prevPrompt) => (prevPrompt ? `${prevPrompt}\n\n${text}` : text));
      add('Texte ajouté au prompt', 'info');
    },
    [add],
  );

  // Toggle thème
  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  }, [setTheme]);

  // Styles injectés
  useEffect(() => {
    const id = 'themis-final-styles';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      :root {
        --bg-primary: ${theme === 'dark' ? '#0f172a' : '#ffffff'};
        --bg-secondary: ${theme === 'dark' ? '#0b1220' : '#f8fafc'};
        --bg-tertiary: ${theme === 'dark' ? '#111827' : '#f1f5f9'};
        --border-color: ${theme === 'dark' ? '#1f2937' : '#e2e8f0'};
        --text-primary: ${theme === 'dark' ? '#e5e7eb' : '#1f2937'};
        --text-secondary: ${theme === 'dark' ? '#9ca3af' : '#64748b'};
        --accent-primary: #3b82f6;
        --accent-success: #16a34a;
        --accent-danger: #dc2626;
        --accent-warning: #d97706;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: var(--bg-secondary);
        color: var(--text-primary);
      }

      .shell {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: var(--bg-secondary);
      }

      .topbar, .bottombar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
      }

      .bottombar {
        border-top: 1px solid var(--border-color);
        border-bottom: none;
        margin-top: auto;
      }

      .brand {
        font-weight: 700;
        margin-right: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .controls select {
        padding: 4px 8px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-primary);
        color: var(--text-primary);
      }

      .grid {
        display: grid;
        grid-template-columns: 1.1fr 1fr 1.2fr;
        gap: 16px;
        padding: 16px;
        flex: 1;
        overflow: hidden;
      }

      .grid.hide-lib {
        grid-template-columns: 0fr 1fr 1.2fr;
      }

      .panel {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 16px;
        background: var(--bg-primary);
        min-height: 400px;
        overflow: hidden;
      }

      .main-panel {
        border: 2px solid var(--accent-primary);
      }

      .panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 8px;
      }

      .offline-icon {
        color: var(--accent-danger);
      }

      .area {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-family: inherit;
        resize: vertical;
      }

      .area:focus {
        outline: 2px solid var(--accent-primary);
        outline-offset: -2px;
      }

      .answer-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
      }

      .answer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
      }

      .copy-btn {
        padding: 4px 8px !important;
        font-size: 12px;
      }

      .answer {
        white-space: pre-wrap;
        background: var(--bg-secondary);
        padding: 12px;
        border: 1px dashed var(--border-color);
        border-radius: 8px;
        flex: 1;
        overflow: auto;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 14px;
        line-height: 1.5;
      }

      .history-panel {
        max-height: 300px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .history-count {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .history {
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        flex: 1;
      }

      .card {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px;
        background: var(--bg-secondary);
      }

      .history-item {
        position: relative;
      }

      .history-meta {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .q, .a {
        margin: 8px 0;
        display: flex;
        gap: 8px;
      }

      .label {
        font-weight: 600;
        min-width: 20px;
      }

      .content {
        flex: 1;
        word-break: break-word;
      }

      .history-actions {
        display: flex;
        gap: 4px;
        margin-top: 8px;
        flex-wrap: wrap;
      }

      .history-actions .btn {
        padding: 2px 6px;
        font-size: 11px;
      }

      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .col {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .actions-grid {
        gap: 12px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        border-radius: 8px;
        cursor: pointer;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        text-decoration: none;
      }

      .btn:hover:not(:disabled) {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn.primary {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: white;
      }

      .btn.primary:hover:not(:disabled) {
        background: #2563eb;
      }

      .btn.success {
        background: var(--accent-success);
        border-color: var(--accent-success);
        color: white;
      }

      .btn.success:hover:not(:disabled) {
        background: #15803d;
      }

      .btn.danger {
        background: var(--accent-danger);
        border-color: var(--accent-danger);
        color: white;
      }

      .btn.danger:hover:not(:disabled) {
        background: #b91c1c;
      }

      .lib-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .lib-actions input[type="file"] {
        padding: 6px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
      }

      .lib-actions input[type="text"] {
        padding: 6px 8px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        min-width: 120px;
      }

      .tree {
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 8px;
        background: var(--bg-secondary);
        flex: 1;
        overflow: auto;
      }

      .tree-node {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 6px;
        transition: background-color 0.2s ease;
      }

      .tree-node:hover {
        background: var(--bg-tertiary);
      }

      .tree-node.selected {
        background: var(--accent-primary);
        color: white;
      }

      .tree-section-title {
        font-weight: 600;
        margin: 8px 0 4px 0;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 4px;
      }

      .file-size {
        font-size: 11px;
        color: var(--text-secondary);
        margin-left: auto;
      }

      .selection {
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 14px;
        padding: 8px;
        background: var(--bg-secondary);
        border-radius: 6px;
      }

      .toasts {
        position: fixed;
        right: 16px;
        bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        max-width: 400px;
      }

      .toast {
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        background: var(--text-secondary);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideInRight 0.3s ease;
        position: relative;
      }

      .toast.success {
        background: var(--accent-success);
      }

      .toast.error {
        background: var(--accent-danger);
      }

      .toast.warning {
        background: var(--accent-warning);
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--border-color);
        border-top-color: var(--accent-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .win-controls {
        display: flex;
        gap: 4px;
        margin-left: auto;
      }

      .win-controls button {
        width: 32px;
        height: 32px;
        border: 1px solid var(--border-color);
        background: var(--bg-secondary);
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-primary);
        transition: all 0.2s ease;
      }

      .win-controls button:hover {
        background: var(--bg-tertiary);
      }

      .icon {
        border: none;
        background: transparent;
        font-size: 16px;
        cursor: pointer;
        color: var(--text-primary);
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .icon:hover {
        background: var(--bg-tertiary);
      }

      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
      }

      .overlay-card {
        width: min(900px, 90vw);
        max-height: 80vh;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      }

      .overlay-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 12px;
      }

      .overlay-body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow: auto;
      }

      .extracted-text {
        background: var(--bg-secondary);
        padding: 16px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        max-height: 400px;
        overflow: auto;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 14px;
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .busy {
        opacity: 0.7;
        pointer-events: none;
      }

      .lib-hidden {
        display: none !important;
      }

      .theme-toggle {
        background: none;
        border: none;
        color: var(--text-primary);
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .theme-toggle:hover {
        background: var(--bg-tertiary);
      }

      @media (max-width: 1200px) {
        .grid {
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr auto;
        }
        
        .grid.hide-lib {
          grid-template-columns: 1fr;
          grid-template-rows: auto 1fr auto;
        }
      }
    `;

    document.head.appendChild(style);
  }, [theme]);

  return (
    <div className={`shell ${busy ? 'busy' : ''}`}>
      <header className="topbar">
        <div className="brand">
          Themis
          {!online && <FaBan className="offline-icon" title="Mode hors ligne" />}
        </div>

        <div className="controls">
          <select value={engine} onChange={(e) => setEngine(e.target.value)}>
            {ENGINES.map((eng) => (
              <option key={eng.value} value={eng.value}>
                {eng.label}
              </option>
            ))}
          </select>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!MODEL_OPTIONS[engine]?.length}
          >
            {(MODEL_OPTIONS[engine] || []).map((mod) => (
              <option key={mod.value} value={mod.value}>
                {mod.label}
              </option>
            ))}
          </select>

          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <button className="theme-toggle" onClick={toggleTheme} title="Changer le thème">
          {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </button>

        <button
          className="btn"
          onClick={() => setShowLibrary((v) => !v)}
          title={showLibrary ? 'Masquer la bibliothèque' : 'Afficher la bibliothèque'}
        >
          {showLibrary ? <FaEyeSlash /> : <FaEye />}
        </button>

        <WindowControls />
      </header>

      <main className={`grid ${showLibrary ? '' : 'hide-lib'}`}>
        <div style={{ display: showLibrary ? 'block' : 'none' }}>
          <LibraryPanel
            backendModel={backendModel}
            role={role}
            onToast={add}
            onUploadExtractToPrompt={onUploadExtractToPrompt}
            online={online}
          />
        </div>

        <IAPanel
          prompt={prompt}
          setPrompt={setPrompt}
          answer={answer}
          onAsk={onAsk}
          onExport={onExport}
          history={history}
          onDownload={onDownload}
          onReplayHistory={onReplayHistory}
          busy={busy}
          showExtractOverlay={showExtractOverlay}
          extractText={extractText}
          onOverlaySendToIA={onOverlaySendToIA}
          onOverlaySendToWord={onOverlaySendToWord}
          onOverlayCancel={onOverlayCancel}
          online={online}
        />

        <ActionsPanel
          onOpenExtract={onOpenExtract}
          onOpenImport={onOpenImport}
          onOpenExport={onOpenExport}
          onOpenPrint={onOpenPrint}
          onClearHistory={onClearHistory}
          online={online}
        />
      </main>

      <footer className="bottombar">
        <div>API: {API_BASE}</div>
        <div>Statut: {online ? '🟢 En ligne' : '🔴 Hors ligne'}</div>
        <div>Profil: {role}</div>
        <div>Modèle: {backendModel}</div>
      </footer>

      {/* Modales */}
      {showImport && (
        <Modal title="Import Q/R" onClose={() => setShowImport(false)}>
          <p>
            Choisir un fichier JSON contenant des questions/réponses pour alimenter l'historique.
          </p>
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const content = event.target?.result as string;
                    const data = JSON.parse(content);
                    if (Array.isArray(data)) {
                      const importedHistory = data.map((item) => ({
                        ...item,
                        id: item.id || generateId(),
                        timestamp: item.timestamp || Date.now(),
                      }));
                      setHistory((prev) => [...importedHistory, ...prev]);
                      add(`${importedHistory.length} éléments importés`, 'success');
                    }
                  } catch (error) {
                    add("Erreur lors de l'import", 'error');
                  }
                };
                reader.readAsText(file);
              }
              setShowImport(false);
            }}
          />
        </Modal>
      )}

      {showExport && (
        <Modal title="Export production" onClose={() => setShowExport(false)}>
          <p>Exporter l'historique des conversations en JSON.</p>
          <div className="row">
            <ThemisButton
              icon={<FaDownload />}
              label="Exporter JSON"
              onClick={() => {
                const dataStr = JSON.stringify(history, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `themis-export-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
                setShowExport(false);
              }}
              variant="success"
            />
            <ThemisButton icon={<FaTimes />} label="Fermer" onClick={() => setShowExport(false)} />
          </div>
        </Modal>
      )}

      {showPrint && (
        <Modal title="Imprimer" onClose={() => setShowPrint(false)}>
          <p>Préparer l'impression du dernier échange ou de l'historique complet.</p>
          <div className="row">
            <ThemisButton
              icon={<FaPrint />}
              label="Imprimer historique"
              onClick={() => {
                const printContent = history
                  .map((item) => `Q: ${item.q}\nR: ${item.a}\n${'='.repeat(50)}\n`)
                  .join('\n');

                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(`
                    <html>
                      <head><title>Historique Themis</title></head>
                      <body>
                        <h1>Historique des conversations Themis</h1>
                        <pre>${printContent}</pre>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }
                setShowPrint(false);
              }}
            />
            <ThemisButton icon={<FaTimes />} label="Fermer" onClick={() => setShowPrint(false)} />
          </div>
        </Modal>
      )}

      <Toasts items={toasts} onClose={remove} />
    </div>
  );
}
