// src/api/themis.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface AskIAResponse {
  result: string;
}

export async function askIA(
  prompt: string,
  engine: string,
  model: string
): Promise<AskIAResponse> {
  const res = await fetch(`${API_BASE}/api/ia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model }),
  });
  if (!res.ok) {
    throw new Error(`Erreur IA: ${await res.text()}`);
  }
  return res.json();
}

export interface GenerateDocResponse {
  success: boolean;
  filename: string;
}

export async function generateDoc(
  question: string,
  response: string,
  model: string
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/documents/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, response, model }),
  });
  if (!res.ok) {
    throw new Error(`Erreur génération doc: ${await res.text()}`);
  }
  const data: GenerateDocResponse = await res.json();
  return data.filename;
}

export function downloadDoc(filename: string, model: string) {
  const url = new URL(`${API_BASE}/api/documents/download`);
  url.searchParams.set('filename', filename);
  url.searchParams.set('model', model);
  window.open(url.toString(), '_blank');
}

export function toBackendModel(engine: string, modelValue: string): string {
  // mappe la sélection du front aux modèles backend
  const mapping: Record<string, string[]> = {
    perplexity: ['sonar'],
    perplexica: ['sonarX'],
    ollama: ['local-1'],
    gpt: ['gpt4all'],
  };
  const list = mapping[engine] || [];
  return list.includes(modelValue) ? modelValue : list[0] || modelValue;
}
