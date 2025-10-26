'use client';

import React from 'react';
import { FaMinus, FaWindowMaximize, FaTimes } from 'react-icons/fa';

export default function WindowControls() {
  // Contrôle direct via l'API Electron exposée dans preload.js
  const minimize = () => window.electronAPI?.minimizeWindow?.();
  const maximize = () => window.electronAPI?.maximizeWindow?.();
  const close = () => window.electronAPI?.closeWindow?.();

  return (
    <div className="flex space-x-2">
      <button
        aria-label="Minimize"
        onClick={minimize}
        className="p-1 hover:bg-gray-200 rounded"
      >
        <FaMinus />
      </button>
      <button
        aria-label="Maximize"
        onClick={maximize}
        className="p-1 hover:bg-gray-200 rounded"
      >
        <FaWindowMaximize />
      </button>
      <button
        aria-label="Close"
        onClick={close}
        className="p-1 hover:bg-gray-200 rounded"
      >
        <FaTimes />
      </button>
    </div>
  );
}

