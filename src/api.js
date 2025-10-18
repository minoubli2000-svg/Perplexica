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

  // 5. Extraire le texte d’un document
  extractDocument(file) {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${API_BASE}/api/documents/extract`, {
      method: 'POST',
      body: form,
    }).then(safeFetch);
  },

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
