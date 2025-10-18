// src/components/LibrarySidebar.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/api';

export default function LibrarySidebar({ onStructureChange }) {
  const [structure, setStructure] = useState(null);
  const [loading, setLoading] = useState(false);

  // Charge la structure au montage du composant
  useEffect(() => {
    setLoading(true);
    api
      .getLibraryStructure()
      .then((data) => {
        const struct = data.structure || data;
        setStructure(struct);
        onStructureChange?.(struct);
      })
      .catch((err) => console.error('Erreur getLibraryStructure:', err))
      .finally(() => setLoading(false));
  }, [onStructureChange]);

  if (loading) {
    return <div>Chargement de la bibliothèque…</div>;
  }

  if (!structure) {
    return <div>Aucune donnée disponible.</div>;
  }

  return (
    <aside className="w-64 p-4 bg-gray-100 dark:bg-gray-900 overflow-auto">
      {Object.entries(structure).map(([model, categories]) => (
        <div key={model} className="mb-4">
          <h3 className="text-lg font-semibold">{model}</h3>
          {Object.entries(categories).map(([cat, files]) => (
            <div key={cat} className="ml-2 mb-2">
              <strong>{cat}</strong>
              <ul className="list-disc list-inside">
                {files.map((filename) => (
                  <li key={filename}>{filename}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}
