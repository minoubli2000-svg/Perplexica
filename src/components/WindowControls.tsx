// src/components/WindowControls.tsx
'use client';

import React from 'react';
import { FaMinus, FaWindowMaximize, FaTimes } from 'react-icons/fa';

export default function WindowControls() {
  // Envoi d’événements à l’API Electron pour contrôler la fenêtre
  const send = (channel: 'minimize' | 'maximize' | 'close') => {
    window.api?.send('window-control', channel);
  };

  return (
    <div className="flex space-x-2">
      <button
        aria-label="Minimize"
        onClick={() => send('minimize')}
        className="p-1 hover:bg-gray-200 rounded"
      >
        <FaMinus />
      </button>
      <button
        aria-label="Maximize"
        onClick={() => send('maximize')}
        className="p-1 hover:bg-gray-200 rounded"
      >
        <FaWindowMaximize />
      </button>
      <button
        aria-label="Close"
        onClick={() => send('close')}
        className="p-1 hover:bg-gray-200 rounded"
      >
        <FaTimes />
      </button>
    </div>
  );
}

