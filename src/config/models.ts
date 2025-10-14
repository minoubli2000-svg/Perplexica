// src/config/models.ts

// Définition des profils utilisateur possibles
export const ROLES = [
  { value: 'general', label: 'General' },
  { value: 'doctorant', label: 'Doctorant' },
  { value: 'rapporteur', label: 'Rapporteur' },
];

// Options de moteurs et modèles disponibles selon le mode (online/offline)
export const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  perplexity: [
    { value: 'sonar', label: 'Sonar' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'gpt', label: 'GPT' },
  ],
  gpt: [
    { value: 'gpt4all', label: 'GPT4All' },
    { value: 'gptj', label: 'GPT-J' },
  ],
  ollama: [
    { value: 'nous-hermes', label: 'Nous Hermes' },
    { value: 'phi3', label: 'Phi-3' },
    { value: 'deepseek-llm', label: 'DeepSeek LLM' },
    { value: 'gemma', label: 'Gemma' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'llama3', label: 'Llama 3' },
    { value: 'llama2', label: 'Llama 2' },
  ],
  perplexica: [
    { value: 'plex-1', label: 'Plex-1' },
    { value: 'plex-2', label: 'Plex-2' },
  ],
};
