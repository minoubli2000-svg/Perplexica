// src/components/FileExtractor.jsx
import React, { useState } from 'react';

export default function FileExtractor() {
  const [text, setText] = useState('');

  const handleExtract = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);

    const res = await fetch('http://localhost:3001/api/documents/extract', {
      method: 'POST',
      body: form,
    });

    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) {
      alert(j.error || 'Erreur extraction');
      return;
    }
    setText(j.text || '');
  };

  return (
    <div>
      <input type="file" accept="application/pdf,image/*" onChange={handleExtract} />
      {text && (
        <>
          <h3>Texte extrait :</h3>
          <pre>{text}</pre>
        </>
      )}
    </div>
  );
}
