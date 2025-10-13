// src/components/themis/WindowControls.tsx
import React from 'react';
import { FaMinus, FaRegSquare, FaTimes } from 'react-icons/fa';

declare global {
  interface Window {
    electronAPI?: {
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
    };
  }
}

const WindowControls: React.FC = () => {
  const handleMinimize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.closeWindow();
    }
  };

  return (
    <div className="flex items-center space-x-1 select-none">
      <button
        onClick={handleMinimize}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-150 group"
        title="Réduire"
      >
        <FaMinus className="w-3 h-3 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
      </button>

      <button
        onClick={handleMaximize}
        className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-150 group"
        title="Agrandir/Restaurer"
      >
        <FaRegSquare className="w-3 h-3 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
      </button>

      <button
        onClick={handleClose}
        className="w-8 h-8 flex items-center justify-center hover:bg-red-500 rounded transition-colors duration-150 group"
        title="Fermer"
      >
        <FaTimes className="w-3 h-3 text-gray-600 dark:text-gray-400 group-hover:text-white" />
      </button>
    </div>
  );
};

export default WindowControls;
