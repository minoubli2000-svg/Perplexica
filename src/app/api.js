// src/app/api.js
const BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`);
  if (!res.ok) throw new Error('Échec getDocuments');
  return res.json();
}

export async function uploadDocument(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Échec uploadDocument');
  return res.json();
}

export async function ask({ question, documentId }) {
  const res = await fetch(`${BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, documentId }),
  });
  if (!res.ok) throw new Error('Échec ask');
  return res.json();
}

export async function getExtracted(id) {
  const res = await fetch(`${BASE}/documents/${id}/extract`);
  if (!res.ok) throw new Error('Échec getExtracted');
  return res.text();
}

export async function exportPDF({ chat, documentId }) {
  const res = await fetch(`${BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat, documentId }),
  });
  if (!res.ok) throw new Error('Échec exportPDF');
  return res.blob();
}

export async function deleteDocument(id) {
  const res = await fetch(`${BASE}/documents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Échec deleteDocument');
  return res.json();
}
