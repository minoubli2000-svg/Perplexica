export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

async function safeFetch(res) {
  let payload;
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }
  if (!res.ok || payload.error) throw new Error(payload.error || 'Erreur API');
  return payload;
}

export const api = {
  // 1. Structure de la bibliothèque
  getLibraryStructure() {
    return fetch(`${API_BASE}/api/library/structure`).then(safeFetch);
  },

  // 2. Supprimer un document
  deleteDocument({ filename, model, subdir }) {
    return fetch(`${API_BASE}/api/library/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, model, subdir }),
    }).then(safeFetch);
  },

  // 3. Renommer un document
  renameDocument({ oldName, newName, model, subdir }) {
    return fetch(`${API_BASE}/api/library/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName, model, subdir }),
    }).then(safeFetch);
  },

  // 4. Uploader un PDF
  uploadDocument(file, profile = 'general', category = 'extraction') {
    const form = new FormData();
    form.append('file', file);
    form.append('profile', profile);
    form.append('category', category);
    return fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: form,
    }).then(safeFetch);
  },

  // api.js (client React/TS pour Flask backend : library + OCR extraction JSON paginé)
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Types pour OCR (extraction JSON : pages, bbox pour layout fidèle)
export interface OCRBox {
  x: number;
  y: number;
  w: number;
  h: number;
  conf: number;  // Confiance 0-100
  text?: string;  // Optionnel pour word-level
}

export interface OCRPage {
  page: number;
  text: string;  // Lignes OCR (brut)
  full_text: string;  // Concaténée pour search/paragraphes
  bbox: OCRBox[];  // Positions pour layout PDF fidèle (multi-colonne livre)
  avg_conf: number;  // Confiance moyenne page
}

export interface OCRData {
  success: boolean;
  data: {
    pages: OCRPage[];
    total_pages: number;
    metadata: {
      lang: string;  // ex. 'fra'
      engine: string;  // 'tesseract'
      filename: string;
    };
  };
  error?: string;
}

// Safe fetch (parse JSON, check error/success)
async function safeFetch(res: Response): Promise<any> {
  let payload: any;
  try {
    payload = await res.json();
  } catch (err) {
    payload = { error: 'Réponse invalide' };
    console.error('API safeFetch: JSON parse error', err);
  }

  if (!res.ok || payload.error) {
    const msg = payload.error || `Erreur HTTP ${res.status}`;
    console.error('API error:', msg, payload);
    throw new Error(msg);
  }

  return payload;
}

// API object (library + OCR)
export const api = {
  // 1. Structure bibliothèque (GET /api/library/structure)
  getLibraryStructure() {
    return fetch(`${API_BASE}/api/library/structure`).then(safeFetch);
  },

  // 2. Supprimer document (DELETE /api/library/delete)
  deleteDocument({ filename, model, subdir }: { filename: string; model: string; subdir?: string }) {
    return fetch(`${API_BASE}/api/library/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, model, subdir }),
    }).then(safeFetch);
  },

  // 3. Renommer document (POST /api/library/rename)
  renameDocument({ oldName, newName, model, subdir }: { oldName: string; newName: string; model: string; subdir?: string }) {
    return fetch(`${API_BASE}/api/library/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName, model, subdir }),
    }).then(safeFetch);
  },

  // 4. Upload document (POST /api/library/upload)
  uploadDocument(file: File, model: string, subdir?: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    if (subdir) formData.append('subdir', subdir);

    return fetch(`${API_BASE}/api/library/upload`, {
      method: 'POST',
      body: formData,
    }).then(safeFetch);
  },

  // 5. List documents (GET /api/library/list?model=...&subdir=...)
  getDocuments({ model, subdir }: { model: string; subdir?: string }) {
    const params = new URLSearchParams({ model });
    if (subdir) params.append('subdir', subdir);
    return fetch(`${API_BASE}/api/library/list?${params}`).then(safeFetch);
  },

  // 6. Extraction OCR (POST /api/documents/extract) : Upload file → JSON paginé (PDF multi-page)
  extractDocument(
    file: File,
    options: { lang?: string; model?: string; subdir?: string } = { lang: 'fra' }
  ): Promise<OCRData> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('lang', options.lang || 'fra');  // Lang pour Tesseract (français livre)
    formData.append('model', options.model || 'default');
    if (options.subdir) formData.append('subdir', options.subdir);

    return fetch(`${API_BASE}/api/documents/extract`, {
      method: 'POST',
      body: formData,
    })
    .then(safeFetch)
    .then((payload) => {
      // Parse en OCRData (fidèle : check pages/bbox, fallback texte brut)
      if (payload.data && payload.data.pages) {
        // Paginate si backend renvoie pages (PDF split pdf2image)
        const pages: OCRPage[] = payload.data.pages.map((p: any, idx: number) => ({
          page: idx + 1,
          text: p.text || p.lines?.join('\n') || '',
          full_text: p.full_text || p.text || '',
          bbox: p.bbox || p.data || [],  // OCRBox array (tesseract image_to_data)
          avg_conf: p.avg_conf || (p.bbox?.reduce((a: number, b: any) => a + b.conf, 0) / p.bbox.length) || 0,
        }));
        return {
          success: true,
          data: {
            pages,
            total_pages: payload.data.total_pages || pages.length,
            metadata: payload.data.metadata || { lang: options.lang, engine: 'tesseract' },
          },
        } as OCRData;
      } else {
        // Fallback si backend texte brut (single page)
        console.warn('API extract: Fallback single page (no paginé)');
        return {
          success: true,
          data: {
            pages: [{
              page: 1,
              text: payload.text || payload.data || '',
              full_text: payload.text || payload.data || '',
              bbox: [],
              avg_conf: 0,
            }],
            total_pages: 1,
            metadata: { lang: options.lang, engine: 'tesseract' },
          },
        } as OCRData;
      }
    })
    .catch((err) => {
      console.error('API extractDocument error:', err);
      return { success: false, error: err.message } as OCRData;
    });
  },

  // 7. Fetch extraction existante (GET /api/documents/extract/{filename}?lang=...)
  getExtractedText(filename: string, options: { lang?: string } = {}): Promise<OCRData> {
    const params = new URLSearchParams({ lang: options.lang || 'fra' });
    return fetch(`${API_BASE}/api/documents/extract/${encodeURIComponent(filename)}?${params}`)
      .then(safeFetch)
      .then((payload) => {
        // Même parse que extract (paginated JSON)
        if (payload.data && payload.data.pages) {
          const pages: OCRPage[] = payload.data.pages.map((p: any, idx: number) => ({
            page: idx + 1,
            text: p.text || '',
            full_text: p.full_text || '',
            bbox: p.bbox || [],
            avg_conf: p.avg_conf || 0,
          }));
          return {
            success: true,
            data: {
              pages,
              total_pages: payload.data.total_pages || pages.length,
              metadata: payload.data.metadata || { lang: options.lang, engine: 'tesseract' },
            },
          } as OCRData;
        } else {
          return { success: false, error: 'Pas de données paginées' } as OCRData;
        }
      });
  },

  // 8. Autres endpoints (AI, etc. – ajoute si besoin)
  // Ex. queryAI: POST /api/ai/query {prompt, model}
  queryAI(prompt: string, model: string = 'nous-hermes') {
    return fetch(`${API_BASE}/api/ai/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    }).then(safeFetch);
  },
};

// Export types pour usage (Themis.tsx, DraggableModal.tsx)
export type { OCRPage, OCRData, OCRBox };


  // 6. Générer un document via IA
  generateDocument({ question, response, model = 'general' }) {
    return fetch(`${API_BASE}/api/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, response, model }),
    }).then(safeFetch);
  },

  // 7. Télécharger un document généré
  downloadDocument(filename, model = 'general') {
    const url = `${API_BASE}/api/documents/download?filename=${encodeURIComponent(filename)}&model=${model}`;
    return fetch(url).then((res) => {
      if (!res.ok) throw new Error('Erreur téléchargement');
      return res.blob();
    });
  },

  // 8. Point IA factice
  askAI(prompt, model = 'general') {
    return fetch(`${API_BASE}/api/ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model }),
    }).then(safeFetch);
  },
};
