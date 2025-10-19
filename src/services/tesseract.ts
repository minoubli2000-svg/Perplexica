// src/services/tesseract.ts
import Tesseract from 'tesseract.js';

export async function extractTextAndPreview(file: File): Promise<{ text: string; previewUrl: string }> {
  // Génération de l'URL de prévisualisation
  const previewUrl = URL.createObjectURL(file);

  // Extraction du texte avec Tesseract.js
  const { data } = await Tesseract.recognize(file, 'fra', {
    logger: m => console.log(m), // facultatif : logs de progression
  });

  // Nettoyage de l'URL lorsque ce n'est plus nécessaire
  // (à appeler dans la fermeture du modal)
  // URL.revokeObjectURL(previewUrl);

  return {
    text: data.text.trim(),
    previewUrl,
  };
}
